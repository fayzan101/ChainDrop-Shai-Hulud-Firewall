import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { decideFromBehaviorLog, riskFromBehaviorLog } from "./policy.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), "utf8"));
}

test("riskFromBehaviorLog elevates on canary and net", () => {
  const log = {
    behavior_log_version: "1.0.0",
    canary_hits: [{ canary_id: "npm_token", path: "/home/sandbox/.npmrc" }],
    net: [{ host: "exfil.sinkhole.test", port: 443, protocol: "tcp" }],
    files: [],
    timeout: false,
  };
  assert.equal(riskFromBehaviorLog(log, 10), 95);
});

test("decideFromBehaviorLog blocks canary theft (config b)", () => {
  const log = loadJson("fixtures/sandbox-canary-hit/behavior-log.example.json");
  const verdict = decideFromBehaviorLog(log, { classifierRisk: 20 });
  assert.equal(verdict.config, "b");
  assert.equal(verdict.action, "block");
  assert.ok(verdict.justification.includes("canary_hits"));
});

test("timeout still yields quarantine or higher", () => {
  const log = {
    behavior_log_version: "1.0.0",
    canary_hits: [],
    net: [],
    files: [{ path: "/home/sandbox/.npmrc", operation: "read" }],
    timeout: true,
  };
  const verdict = decideFromBehaviorLog(log, { classifierRisk: 0 });
  assert.ok(verdict.risk_score >= 55);
  assert.match(verdict.justification, /sandbox_timeout/);
});

test("benign empty log stays allow at low classifier risk", () => {
  const log = {
    behavior_log_version: "1.0.0",
    canary_hits: [],
    net: [],
    files: [],
    timeout: false,
  };
  const verdict = decideFromBehaviorLog(log, { classifierRisk: 5 });
  assert.equal(verdict.action, "allow");
});
