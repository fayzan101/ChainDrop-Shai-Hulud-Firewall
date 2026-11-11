/**
 * Phase 1 interceptor: capture npm lifecycle scripts from a lockfile + local
 * package.json files. Never execute those scripts and never spawn a package
 * manager install.
 *
 * Fail-closed rules:
 * - npm: packages with hasInstallScript must have package.json on disk
 * - yarn/pnpm: dependency graph not yet extracted — refuse (INCOMPLETE_COVERAGE)
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, isAbsolute, join, normalize, relative, sep } from "node:path";

/** Lifecycle hooks we capture. `prepare` runs for git deps on install. */
export const HOOKS = ["preinstall", "install", "postinstall", "prepare"];

/** Prefer npm, then pnpm, then Yarn when several lockfiles exist. */
export const LOCKFILE_CANDIDATES = [
  "package-lock.json",
  "npm-shrinkwrap.json",
  "pnpm-lock.yaml",
  "yarn.lock",
];

export class InterceptorError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   */
  constructor(message, code) {
    super(message);
    this.name = "InterceptorError";
    this.code = code;
  }
}

/**
 * @param {string} dir
 * @param {string} [explicit]
 * @returns {string}
 */
export function resolveLockfile(dir, explicit) {
  if (explicit) {
    const p = explicit;
    if (!existsSync(p)) {
      throw new InterceptorError(
        `lockfile not found: ${p}`,
        "NO_LOCKFILE",
      );
    }
    return p;
  }
  for (const name of LOCKFILE_CANDIDATES) {
    const p = join(dir, name);
    if (existsSync(p)) {
      return p;
    }
  }
  throw new InterceptorError(
    "no lockfile (package-lock.json, npm-shrinkwrap.json, pnpm-lock.yaml, or yarn.lock): fail closed",
    "NO_LOCKFILE",
  );
}

/**
 * @param {string} bytes
 * @returns {string}
 */
export function sha256Utf8(bytes) {
  return createHash("sha256").update(bytes, "utf8").digest("hex");
}

/**
 * Resolve a JS/CJS/MJS file referenced by a lifecycle command.
 * Rejects absolute paths and any `..` escape outside the package directory.
 *
 * @param {string} command
 * @returns {string | null}
 */
export function referencedJsFile(command) {
  const m = command.match(
    /\bnode(?:\.exe)?\s+(?:--\S+\s+)*["']?([^\s"']+\.(?:js|cjs|mjs))["']?/i,
  );
  if (!m) {
    return null;
  }
  const rel = m[1];
  if (isAbsolute(rel) || rel.split(/[/\\]/).includes("..")) {
    return null;
  }
  return rel;
}

/**
 * Ensure a resolved script path stays inside packageDir.
 * @param {string} packageDir
 * @param {string} relPath
 * @returns {string | null}
 */
export function safeScriptPath(packageDir, relPath) {
  const resolved = normalize(join(packageDir, relPath));
  const root = normalize(packageDir + sep);
  if (resolved !== normalize(packageDir) && !resolved.startsWith(root)) {
    return null;
  }
  if (!existsSync(resolved)) {
    return null;
  }
  return resolved;
}

/**
 * @param {object} pkg
 * @param {object} opts
 * @returns {object[]}
 */
export function bundlesFromPackageJson(pkg, opts) {
  const {
    packageDir,
    lockDir,
    integrity,
    resolved,
    parentChain,
  } = opts;
  const scripts = pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
  /** @type {object[]} */
  const out = [];

  // Implicit node-gyp rebuild when binding.gyp exists and no install script.
  const bindingPath = join(packageDir, "binding.gyp");
  const hasBinding = existsSync(bindingPath);
  const hasInstall = typeof scripts.install === "string" && scripts.install.length > 0;

  for (const hook of HOOKS) {
    const command = scripts[hook];
    if (typeof command !== "string" || command.length === 0) {
      continue;
    }
    out.push(
      bundleForCommand(pkg, {
        packageDir,
        lockDir,
        integrity,
        resolved,
        parentChain,
        hook,
        command,
      }),
    );
  }

  if (hasBinding && !hasInstall) {
    out.push(
      bundleForCommand(pkg, {
        packageDir,
        lockDir,
        integrity,
        resolved,
        parentChain,
        hook: "install",
        command: "node-gyp rebuild",
      }),
    );
  }

  return out;
}

/**
 * @param {object} pkg
 * @param {object} opts
 */
function bundleForCommand(pkg, opts) {
  const {
    packageDir,
    lockDir,
    integrity,
    resolved,
    parentChain,
    hook,
    command,
  } = opts;
  const relJs = referencedJsFile(command);
  const filePath = relJs ? safeScriptPath(packageDir, relJs) : null;
  let source_path = "inline:package.json";
  let scriptBytes = command;
  if (filePath) {
    scriptBytes = readFileSync(filePath, "utf8");
    source_path = relative(lockDir, filePath).replaceAll("\\", "/") || relJs;
  }
  return {
    package_name: pkg.name || basename(packageDir),
    version: pkg.version || "0.0.0",
    hook,
    integrity: integrity || "local",
    resolved: resolved ?? null,
    script_sha256: sha256Utf8(scriptBytes),
    source_path,
    inline_command: command,
    parent_chain: parentChain || [],
  };
}

/**
 * @param {string} lockPath
 * @returns {"npm" | "pnpm" | "yarn"}
 */
export function lockfileKind(lockPath) {
  const name = basename(lockPath);
  if (name === "pnpm-lock.yaml") {
    return "pnpm";
  }
  if (name === "yarn.lock") {
    return "yarn";
  }
  return "npm";
}

/**
 * Extract ScriptBundle[] from a project directory.
 *
 * @param {string} dir
 * @param {{ lockfile?: string }} [options]
 */
export function extractFromProject(dir, options = {}) {
  const lockPath = resolveLockfile(dir, options.lockfile);
  const kind = lockfileKind(lockPath);
  const rootPkgPath = join(dir, "package.json");
  if (!existsSync(rootPkgPath)) {
    throw new InterceptorError(
      "package.json missing next to lockfile: fail closed",
      "NO_PACKAGE_JSON",
    );
  }
  const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf8"));
  /** @type {object[]} */
  const bundles = [];

  if (kind === "npm") {
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    const packages = lock.packages && typeof lock.packages === "object" ? lock.packages : {};
    const entries = Object.keys(packages).length
      ? Object.entries(packages)
      : [["", {}]];

    /** @type {string[]} */
    const missingInstallScripts = [];

    for (const [pkgPath, meta] of entries) {
      const packageDir = pkgPath === "" ? dir : join(dir, pkgPath);
      const pkgJsonPath = join(packageDir, "package.json");
      const onDisk = existsSync(pkgJsonPath);

      if (meta && meta.hasInstallScript && !onDisk) {
        missingInstallScripts.push(pkgPath || "(root)");
        continue;
      }
      if (!onDisk) {
        continue;
      }

      const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
      const parentChain =
        pkgPath === ""
          ? []
          : [rootPkg.name || basename(dir)];
      bundles.push(
        ...bundlesFromPackageJson(pkg, {
          packageDir,
          lockDir: dir,
          integrity: meta.integrity || (pkgPath === "" ? "local" : "unknown"),
          resolved: meta.resolved ?? null,
          parentChain,
        }),
      );
    }

    if (missingInstallScripts.length > 0) {
      throw new InterceptorError(
        `npm lockfile marks hasInstallScript but package.json is not on disk for: ${missingInstallScripts.join(", ")}. ` +
          "Run `npm ci --ignore-scripts`, then this Action, then `npm rebuild` if policy allows. " +
          "Fail closed — refusing empty/partial scan.",
        "MISSING_INSTALL_SCRIPT_PACKAGES",
      );
    }
  } else {
    // Yarn / pnpm dependency graph not yet extracted (issue #22 / #33).
    throw new InterceptorError(
      `${kind} lockfile detected but dependency lifecycle scripts are not yet enumerated ` +
        "(root-only would silently allow). Fail closed until tarball/workspace support lands. " +
        "Use an npm package-lock.json for the CI gate, or set fail-open (not recommended).",
      "INCOMPLETE_COVERAGE",
    );
  }

  return {
    lockfile: lockPath,
    lockfile_kind: kind,
    bundles,
    coverage: "npm-on-disk",
  };
}
