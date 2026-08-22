import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), "utf8"));
}

function assertScriptBundle(bundle, label) {
  const required = [
    "package_name",
    "version",
    "hook",
    "integrity",
    "script_sha256",
    "source_path",
  ];
  for (const key of required) {
    assert.ok(bundle[key], `${label} missing ${key}`);
  }
  assert.match(bundle.hook, /^(preinstall|install|postinstall)$/);
  assert.match(bundle.script_sha256, /^[a-f0-9]{64}$/);
}

test("ScriptBundle schema lists required fields", () => {
  const schema = loadJson("schemas/script-bundle.schema.json");
  assert.deepEqual(schema.required, [
    "package_name",
    "version",
    "hook",
    "integrity",
    "script_sha256",
    "source_path",
  ]);
  assert.deepEqual(schema.properties.hook.enum, [
    "preinstall",
    "install",
    "postinstall",
  ]);
});

test("fixture ScriptBundle examples validate", () => {
  const benign = loadJson("fixtures/benign-lockfile/script-bundle.example.json");
  const suspicious = loadJson(
    "fixtures/synthetic-suspicious/script-bundle.example.json",
  );
  assertScriptBundle(benign, "benign");
  assertScriptBundle(suspicious, "suspicious");
  assert.equal(benign.hook, "install");
  assert.equal(suspicious.hook, "preinstall");
});
