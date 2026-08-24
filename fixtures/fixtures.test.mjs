import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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
  const pnpmLock = join(root, "fixtures/benign-pnpm/pnpm-lock.yaml");
  const pnpmPkg = join(root, "fixtures/benign-pnpm/package.json");
  const pnpmReadme = join(root, "fixtures/benign-pnpm/README.md");
  assert.ok(existsSync(pnpmLock));
  assert.ok(existsSync(pnpmPkg));
  assert.ok(existsSync(pnpmReadme));
  const readme = readFileSync(pnpmReadme, "utf8");
  assert.match(readme, /do not/i);
  const pkg = JSON.parse(readFileSync(pnpmPkg, "utf8"));
  assert.equal(pkg.scripts.install, "node-gyp rebuild");
  const lock = readFileSync(pnpmLock, "utf8");
  assert.match(lock, /lockfileVersion/);
  assert.match(lock, /node-gyp/);
  const example = JSON.parse(
    readFileSync(join(root, "fixtures/benign-pnpm/script-bundle.example.json"), "utf8"),
  );
  assert.equal(example.hook, "install");
  assert.equal(example.inline_command, "node-gyp rebuild");
});

