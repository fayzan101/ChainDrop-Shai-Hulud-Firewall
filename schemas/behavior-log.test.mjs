import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), "utf8"));
}

function assertBehaviorLog(log, label) {
  const required = [
    "behavior_log_version",
    "script_id",
    "started_at",
    "ended_at",
    "duration_ms",
    "timeout",
    "processes",
    "files",
    "net",
    "canary_hits",
  ];
  for (const key of required) {
    assert.ok(key in log, `${label} missing ${key}`);
  }
  assert.equal(log.behavior_log_version, "1.0.0");
}

test("BehaviorLog schema lists required fields", () => {
  const schema = loadJson("schemas/behavior-log.schema.json");
  assert.deepEqual(schema.required, [
    "behavior_log_version",
    "script_id",
    "started_at",
    "ended_at",
    "duration_ms",
    "timeout",
    "processes",
    "files",
    "net",
    "canary_hits",
  ]);
  assert.equal(schema.properties.behavior_log_version.const, "1.0.0");
});

test("fixture BehaviorLog example validates shape", () => {
  const example = loadJson(
    "fixtures/sandbox-canary-hit/behavior-log.example.json",
  );
  assertBehaviorLog(example, "sandbox-canary-hit");
  assert.equal(example.canary_hits[0].canary_id, "npm_token");
});
