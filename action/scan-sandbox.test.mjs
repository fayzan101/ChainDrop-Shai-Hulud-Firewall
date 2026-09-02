import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { scanProjectSandbox } from "./scan-sandbox.mjs";

const root = join(import.meta.dirname, "..");

test("config (b) allows benign fixture without sandbox escalation", async () => {
  const outDir = mkdtempSync(join(tmpdir(), "sentryhulud-sbx-"));
  const verdict = await scanProjectSandbox({
    dir: join(root, "fixtures/benign-lockfile"),
    verdictPath: join(outDir, "benign.json"),
    sandbox: false,
  });
  assert.equal(verdict.config, "b");
  assert.equal(verdict.action, "allow");
  assert.equal(verdict.sandbox_escalated, false);
});

test("config (b) blocks synthetic suspicious via classifier escalation", async () => {
  const outDir = mkdtempSync(join(tmpdir(), "sentryhulud-sbx-"));
  const verdict = await scanProjectSandbox({
    dir: join(root, "fixtures/synthetic-suspicious"),
    verdictPath: join(outDir, "suspicious.json"),
    sandbox: false,
  });
  assert.equal(verdict.config, "b");
  assert.equal(verdict.action, "block");
  assert.equal(verdict.classifier_escalated, true);
  assert.equal(verdict.sandbox_escalated, false);
});

test("config (b) records canary hits from injected behavior log", async () => {
  const outDir = mkdtempSync(join(tmpdir(), "sentryhulud-sbx-"));
  const verdict = await scanProjectSandbox({
    dir: join(root, "fixtures/synthetic-suspicious"),
    verdictPath: join(outDir, "canary.json"),
    sandbox: false,
    behaviorLogPath: join(
      root,
      "fixtures/sandbox-canary-hit/behavior-log.example.json",
    ),
  });
  assert.equal(verdict.action, "block");
  assert.deepEqual(verdict.behavior_log.canary_hits, ["npm_token"]);
  const written = JSON.parse(readFileSync(verdict.verdict_path, "utf8"));
  assert.equal(written.config, "b");
});
