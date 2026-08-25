import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { extractFromProject, InterceptorError, sha256Utf8 } from "./extract.mjs";
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

test("benign yarn and pnpm lockfiles list the install hook", () => {
  const yarn = extractFromProject(join(root, "fixtures/benign-yarn"));
  const pnpm = extractFromProject(join(root, "fixtures/benign-pnpm"));
  assert.equal(yarn.lockfile_kind, "yarn");
  assert.equal(pnpm.lockfile_kind, "pnpm");
  assert.equal(yarn.bundles[0].hook, "install");
  assert.equal(pnpm.bundles[0].hook, "install");
  assert.equal(yarn.bundles[0].package_name, "sentryhulud-fixture-benign-yarn");
  assert.equal(pnpm.bundles[0].package_name, "sentryhulud-fixture-benign-pnpm");
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
    stderr: { write(s) { stderr.chunks.push(s); } },
  });
  assert.equal(code, 1);
  assert.match(stderr.chunks.join(""), /fail closed/i);
});
