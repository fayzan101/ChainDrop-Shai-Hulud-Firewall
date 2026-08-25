/**
 * Phase 1 interceptor: capture npm lifecycle scripts from a lockfile + local
 * package.json files. Never execute those scripts and never spawn a package
 * manager install.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";

export const HOOKS = ["preinstall", "install", "postinstall"];

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
 * @param {string} command
 * @returns {string | null}
 */
export function referencedJsFile(command) {
  const m = command.match(/\bnode(?:\.exe)?\s+["']?([^\s"']+\.js)/i);
  return m ? m[1] : null;
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
  for (const hook of HOOKS) {
    const command = scripts[hook];
    if (typeof command !== "string" || command.length === 0) {
      continue;
    }
    const relJs = referencedJsFile(command);
    const filePath = relJs ? join(packageDir, relJs) : null;
    let source_path = "inline:package.json";
    let scriptBytes = command;
    if (filePath && existsSync(filePath)) {
      scriptBytes = readFileSync(filePath, "utf8");
      source_path = relative(lockDir, filePath).replaceAll("\\", "/") || relJs;
    }
    out.push({
      package_name: pkg.name || basename(packageDir),
      version: pkg.version || "0.0.0",
      hook,
      integrity: integrity || "local",
      resolved: resolved ?? null,
      script_sha256: sha256Utf8(scriptBytes),
      source_path,
      inline_command: command,
      parent_chain: parentChain || [],
    });
  }
  return out;
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
 * Extract ScriptBundle[] from a project directory. Offline: only packages that
 * already have a package.json on disk (root and unpacked node_modules).
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
    for (const [pkgPath, meta] of entries) {
      const packageDir = pkgPath === "" ? dir : join(dir, pkgPath);
      const pkgJsonPath = join(packageDir, "package.json");
      if (!existsSync(pkgJsonPath)) {
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
  } else {
    // Yarn / pnpm: root package.json only until tarball fetch (#22).
    bundles.push(
      ...bundlesFromPackageJson(rootPkg, {
        packageDir: dir,
        lockDir: dir,
        integrity: "local",
        resolved: null,
        parentChain: [],
      }),
    );
  }

  return {
    lockfile: lockPath,
    lockfile_kind: kind,
    bundles,
  };
}
