import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { extractFromProject } from "../interceptor/extract.mjs";
import {
  FEATURE_SCHEMA_VERSION,
  extractFeatures,
  shannonEntropy,
} from "./features.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function sourceForBundle(dir, bundle) {
  if (bundle.source_path === "inline:package.json") {
    return bundle.inline_command || "";
  }
  return readFileSync(join(dir, bundle.source_path), "utf8");
}

test("same script bytes produce the same feature vector", () => {
  const src = 'eval("x"); require("child_process");';
  const a = extractFeatures({ hook: "preinstall", source: src });
  const b = extractFeatures({ hook: "preinstall", source: src });
  assert.deepEqual(a, b);
  assert.equal(a.feature_schema_version, FEATURE_SCHEMA_VERSION);
  assert.equal(shannonEntropy(src), a.entropy);
});

test("synthetic suspicious scores higher than benign node-gyp install", () => {
  const benignDir = join(root, "fixtures/benign-lockfile");
  const susDir = join(root, "fixtures/synthetic-suspicious");
  const benign = extractFromProject(benignDir).bundles.find((x) => x.hook === "install");
  const sus = extractFromProject(susDir).bundles.find((x) => x.hook === "preinstall");
  const benignFeat = extractFeatures({
    hook: benign.hook,
    source: sourceForBundle(benignDir, benign),
  });
  const susFeat = extractFeatures({
    hook: sus.hook,
    source: sourceForBundle(susDir, sus),
  });
  assert.ok(benignFeat.unparseable, "shell install command is not JavaScript");
  assert.equal(susFeat.unparseable, false);
  assert.ok(
    susFeat.suspicion_score > benignFeat.suspicion_score,
    `expected suspicious ${susFeat.suspicion_score} > benign ${benignFeat.suspicion_score}`,
  );
  assert.ok(susFeat.api_text_hits >= 1);
  assert.ok(susFeat.credential_hits >= 1);
});

test("parse-failure path sets unparseable", () => {
  const f = extractFeatures({ hook: "postinstall", source: "function (" });
  assert.equal(f.unparseable, true);
  assert.equal(f.feature_schema_version, FEATURE_SCHEMA_VERSION);
});
