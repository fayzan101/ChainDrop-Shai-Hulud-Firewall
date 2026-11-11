/**
 * Phase 5 sandbox orchestrator. Runs scripts inside Docker only — never on the host.
 */

import { spawn } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SANDBOX_ROOT = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_IMAGE = "sentryhulud-sandbox:dev";

/** Docker flags that must never include the host socket. */
export const FORBIDDEN_DOCKER_MOUNTS = [
  "/var/run/docker.sock",
  "docker.sock",
];

/**
 * @param {string[]} args docker CLI argv tail
 */
export function assertSafeDockerArgs(args) {
  const joined = args.join(" ");
  for (const forbidden of FORBIDDEN_DOCKER_MOUNTS) {
    if (joined.includes(forbidden)) {
      throw new Error(`refusing docker invocation that mounts ${forbidden}`);
    }
  }
}

/**
 * Copy packageDir contents (non-recursive siblings + package.json) into dest.
 * Limits blast radius: max 40 files, skip node_modules and huge blobs.
 *
 * @param {string} packageDir
 * @param {string} destDir
 * @param {string} scriptPath
 * @returns {string} relative script path inside destDir
 */
export function stagePackageContext(packageDir, destDir, scriptPath) {
  mkdirSync(destDir, { recursive: true });
  const pkgJson = join(packageDir, "package.json");
  if (existsSync(pkgJson)) {
    copyFileSync(pkgJson, join(destDir, "package.json"));
  }

  let copied = 0;
  const entries = readdirSync(packageDir);
  for (const name of entries) {
    if (copied >= 40) {
      break;
    }
    if (name === "node_modules" || name === ".git") {
      continue;
    }
    const src = join(packageDir, name);
    const st = statSync(src);
    if (!st.isFile() || st.size > 512 * 1024) {
      continue;
    }
    copyFileSync(src, join(destDir, name));
    copied += 1;
  }

  // Ensure the primary script is present even if above filters skipped it.
  const rel = relative(packageDir, scriptPath).replaceAll("\\", "/") || basename(scriptPath);
  const destScript = join(destDir, rel);
  if (!existsSync(destScript)) {
    mkdirSync(dirname(destScript), { recursive: true });
    copyFileSync(scriptPath, destScript);
  }
  return rel;
}

/**
 * @param {object} opts
 * @returns {Promise<object>} BehaviorLog
 */
export async function runInSandbox(opts) {
  const scriptPath = resolve(opts.scriptPath);
  const packageDir = resolve(opts.packageDir || dirname(scriptPath));
  const scriptId = opts.scriptId || scriptPath;
  const image = opts.image || DEFAULT_IMAGE;
  const timeoutMs = Number(opts.timeoutMs ?? 5000);
  const dockerBin = opts.dockerBin || "docker";

  const workDir = mkdtempSync(join(tmpdir(), "sentryhulud-sbx-"));
  const stagedDir = join(workDir, "pkg");
  const relScript = stagePackageContext(packageDir, stagedDir, scriptPath);

  const dockerArgs = [
    "run",
    "--rm",
    "--init",
    "--read-only",
    "--tmpfs",
    "/tmp:exec",
    "--network",
    "none",
    "--user",
    "sandbox",
    "--security-opt",
    "no-new-privileges",
    "--cap-drop",
    "ALL",
    "-e",
    `SENTRYHULUD_SCRIPT_ID=${scriptId}`,
    "-e",
    `SENTRYHULUD_TIMEOUT_MS=${timeoutMs}`,
    "-e",
    "npm_config_ignore_scripts=true",
    "-v",
    `${stagedDir}:/work/pkg:ro`,
    image,
    `/work/pkg/${relScript}`,
  ];

  assertSafeDockerArgs(dockerArgs);

  try {
    const { stdout, stderr, code } = await execCapture(dockerBin, dockerArgs, {
      timeoutMs: Math.max(timeoutMs * 2 + 20000, 45000),
    });
    const line = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .at(-1);
    if (!line) {
      throw new SandboxRunError(
        `sandbox produced no BehaviorLog (exit=${code}): ${stderr || "empty"}`,
        "NO_LOG",
      );
    }
    return JSON.parse(line);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ timeoutMs?: number }} options
 */
function execCapture(cmd, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGKILL");
    }, options.timeoutMs ?? 60000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (killed) {
        reject(new SandboxRunError("docker run timed out", "DOCKER_TIMEOUT"));
        return;
      }
      resolvePromise({ stdout, stderr, code: code ?? 1 });
    });
  });
}

export class SandboxRunError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   */
  constructor(message, code) {
    super(message);
    this.name = "SandboxRunError";
    this.code = code;
  }
}

/**
 * Build the sandbox image (dev helper).
 * @param {{ image?: string, dockerBin?: string }} opts
 */
export async function buildSandboxImage(opts = {}) {
  const image = opts.image || DEFAULT_IMAGE;
  const dockerBin = opts.dockerBin || "docker";
  const args = [
    "build",
    "-t",
    image,
    SANDBOX_ROOT,
  ];
  assertSafeDockerArgs(args);
  const { stderr, code } = await execCapture(dockerBin, args, {
    timeoutMs: 300000,
  });
  if (code !== 0) {
    throw new SandboxRunError(`docker build failed: ${stderr}`, "BUILD_FAILED");
  }
  return image;
}

/**
 * @param {{ dockerBin?: string }} opts
 */
export async function dockerAvailable(opts = {}) {
  try {
    const { code } = await execCapture(opts.dockerBin || "docker", ["version"], {
      timeoutMs: 10000,
    });
    return code === 0;
  } catch {
    return false;
  }
}

/**
 * Write BehaviorLog to disk.
 * @param {object} log
 * @param {string} outPath
 */
export function writeBehaviorLog(log, outPath) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(log, null, 2)}\n`, "utf8");
}

/**
 * @param {string} relFromRepo
 */
export function resolveRepoPath(relFromRepo) {
  return join(SANDBOX_ROOT, "..", relFromRepo);
}

export { SANDBOX_ROOT };
