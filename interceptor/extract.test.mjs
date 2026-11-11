import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  extractFromProject,
  InterceptorError,
  referencedJsFile,
  sha256Utf8,
} from "./extract.mjs";
import { run } from "./cli.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("benign npm lockfile lists install hook and parent package", () => {
  const { bundles, lockfile_kind } = extractFromProject(
    join(root, "fixtures/benign-lockfile"),
  );
  assert.equal(lockfile_kind, "npm");
  const install = bundles.find((b) => b.hook === "install");
  assert.ok(install);
  assert.equal(install.package_name, "sentryhulud-fixture-benign");
  assert.equal(install.inline_command, "node-gyp rebuild");
  assert.equal(install.script_sha256, sha256Utf8("node-gyp rebuild"));
  assert.deepEqual(install.parent_chain, []);
});

test("synthetic suspicious lists preinstall and hashes setup.js without running it", () => {
  const { bundles } = extractFromProject(
    join(root, "fixtures/synthetic-suspicious"),
  );
  const pre = bundles.find((b) => b.hook === "preinstall");
  assert.ok(pre);
  assert.equal(pre.package_name, "sentryhulud-fixture-suspicious");
  assert.equal(pre.inline_command, "node setup.js");
  assert.match(pre.source_path, /setup\.js$/);
  assert.notEqual(pre.script_sha256, sha256Utf8("node setup.js"));
});

test("yarn and pnpm lockfiles fail closed until dependency coverage exists", () => {
  assert.throws(
    () => extractFromProject(join(root, "fixtures/benign-yarn")),
    (err) => err instanceof InterceptorError && err.code === "INCOMPLETE_COVERAGE",
  );
  assert.throws(
    () => extractFromProject(join(root, "fixtures/benign-pnpm")),
    (err) => err instanceof InterceptorError && err.code === "INCOMPLETE_COVERAGE",
  );
});

test("missing hasInstallScript package.json fails closed", () => {
  const dir = mkdtempSync(join(tmpdir(), "sentryhulud-missing-install-"));
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "root", version: "1.0.0" }),
  );
  writeFileSync(
    join(dir, "package-lock.json"),
    JSON.stringify({
      name: "root",
      lockfileVersion: 3,
      packages: {
        "": { name: "root", version: "1.0.0" },
        "node_modules/evil": {
          version: "1.0.0",
          hasInstallScript: true,
          resolved: "https://registry.npmjs.org/evil/-/evil-1.0.0.tgz",
          integrity: "sha512-fixture",
        },
      },
    }),
  );
  assert.throws(
    () => extractFromProject(dir),
    (err) =>
      err instanceof InterceptorError &&
      err.code === "MISSING_INSTALL_SCRIPT_PACKAGES",
  );
});

test("referencedJsFile accepts .mjs/.cjs and rejects parent escapes", () => {
  assert.equal(referencedJsFile("node setup.mjs"), "setup.mjs");
  assert.equal(referencedJsFile("node ./lib/install.cjs"), "./lib/install.cjs");
  assert.equal(referencedJsFile("node ../escape.js"), null);
  assert.equal(referencedJsFile("node -e \"console.log(1)\""), null);
  assert.equal(referencedJsFile("sh install.sh"), null);
});

test("prepare hook and binding.gyp implicit install are captured", () => {
  const dir = mkdtempSync(join(tmpdir(), "sentryhulud-prepare-"));
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({
      name: "native-pkg",
      version: "1.0.0",
      scripts: { prepare: "node prepare.mjs" },
    }),
  );
  writeFileSync(join(dir, "prepare.mjs"), "export const x = 1;\n");
  writeFileSync(join(dir, "binding.gyp"), "{}\n");
  writeFileSync(
    join(dir, "package-lock.json"),
    JSON.stringify({
      name: "native-pkg",
      lockfileVersion: 3,
      packages: {
        "": { name: "native-pkg", version: "1.0.0", hasInstallScript: true },
      },
    }),
  );
  const { bundles } = extractFromProject(dir);
  assert.ok(bundles.some((b) => b.hook === "prepare"));
  assert.ok(
    bundles.some(
      (b) => b.hook === "install" && b.inline_command === "node-gyp rebuild",
    ),
  );
});

test("missing lockfile fails closed", () => {
  const dir = mkdtempSync(join(tmpdir(), "sentryhulud-nolock-"));
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "empty", version: "1.0.0" }),
  );
  assert.throws(
    () => extractFromProject(dir),
    (err) => err instanceof InterceptorError && err.code === "NO_LOCKFILE",
  );
  const stderr = { chunks: [] };
  const code = run(["--dir", dir], {
    stdout: { write() {} },
    stderr: {
      write(s) {
        stderr.chunks.push(s);
      },
    },
  });
  assert.equal(code, 1);
  assert.match(stderr.chunks.join(""), /fail closed/i);
});
