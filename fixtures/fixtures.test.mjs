import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const BENIGN_INSTALL = "node-gyp rebuild";
const BENIGN_INSTALL_SHA256 = createHash("sha256")
  .update(BENIGN_INSTALL, "utf8")
  .digest("hex");

/**
 * README safety copy must include the adjacent words "do not".
 * Do not write "Do **not**": markdown emphasis sits between the words, so
 * `/do not/i` fails (see CI on the pnpm fixture PR).
 */
function assertPlainDoNot(text, label) {
  assert.match(
    text,
    /do not/i,
    `${label} must contain plain "do not" (no markdown between the words)`,
  );
}

function assertBenignBundleExample(relDir, parentName) {
  const example = JSON.parse(
    readFileSync(join(root, relDir, "script-bundle.example.json"), "utf8"),
  );
  assert.equal(example.hook, "install");
  assert.equal(example.inline_command, BENIGN_INSTALL);
  assert.equal(example.script_sha256, BENIGN_INSTALL_SHA256);
  assert.equal(example.parent_chain[0], parentName);
}

test("Phase 0 fixture lockfiles exist and are not executed here", () => {
  const benignLock = join(root, "fixtures/benign-lockfile/package-lock.json");
  const suspiciousLock = join(
    root,
    "fixtures/synthetic-suspicious/package-lock.json",
  );
  assert.ok(existsSync(benignLock));
  assert.ok(existsSync(suspiciousLock));
  const setupPath = join(root, "fixtures/synthetic-suspicious/setup.js");
  const suspiciousSrc = readFileSync(setupPath, "utf8");
  assert.match(suspiciousSrc, /do not execute/i);
  assert.match(suspiciousSrc, /throw new Error/);
  const example = JSON.parse(
    readFileSync(
      join(root, "fixtures/synthetic-suspicious/script-bundle.example.json"),
      "utf8",
    ),
  );
  const digest = createHash("sha256").update(suspiciousSrc, "utf8").digest("hex");
  assert.equal(example.script_sha256, digest);
});

test("Phase 1 benign pnpm lockfile fixture exists", () => {
  const pnpmDir = "fixtures/benign-pnpm";
  const pnpmLock = join(root, pnpmDir, "pnpm-lock.yaml");
  const pnpmPkg = join(root, pnpmDir, "package.json");
  const pnpmReadme = join(root, pnpmDir, "README.md");
  assert.ok(existsSync(pnpmLock));
  assert.ok(existsSync(pnpmPkg));
  assert.ok(existsSync(pnpmReadme));
  assertPlainDoNot(readFileSync(pnpmReadme, "utf8"), "benign-pnpm README");
  const pkg = JSON.parse(readFileSync(pnpmPkg, "utf8"));
  assert.equal(pkg.scripts.install, BENIGN_INSTALL);
  const lock = readFileSync(pnpmLock, "utf8");
  assert.match(lock, /lockfileVersion/);
  assert.match(lock, /node-gyp/);
  assertBenignBundleExample(pnpmDir, "sentryhulud-fixture-benign-pnpm");
});

test("Phase 1 benign yarn lockfile fixture exists", () => {
  const yarnDir = "fixtures/benign-yarn";
  const yarnLock = join(root, yarnDir, "yarn.lock");
  const yarnPkg = join(root, yarnDir, "package.json");
  const yarnReadme = join(root, yarnDir, "README.md");
  assert.ok(existsSync(yarnLock));
  assert.ok(existsSync(yarnPkg));
  assert.ok(existsSync(yarnReadme));
  assertPlainDoNot(readFileSync(yarnReadme, "utf8"), "benign-yarn README");
  const pkg = JSON.parse(readFileSync(yarnPkg, "utf8"));
  assert.equal(pkg.scripts.install, BENIGN_INSTALL);
  const lock = readFileSync(yarnLock, "utf8");
  assert.match(lock, /yarn lockfile v1/);
  assert.match(lock, /node-gyp/);
  assertPlainDoNot(lock, "benign-yarn yarn.lock header");
  assertBenignBundleExample(yarnDir, "sentryhulud-fixture-benign-yarn");
});
