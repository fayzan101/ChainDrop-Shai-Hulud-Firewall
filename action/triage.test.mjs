import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { extractFeatures } from "../classifier/features.mjs";
import {
  defaultArtifactPath,
  inferLabelFromSuspicion,
  riskFromTriage,
  triageFeaturesBatch,
  HEURISTIC_MODEL_VERSION,
} from "./triage.mjs";
import { sourceForBundle } from "./scan.mjs";
import { extractFromProject } from "../interceptor/extract.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("riskFromTriage mirrors eval policy bands", () => {
  assert.ok(riskFromTriage(0.1, "benign") < 40);
  assert.ok(riskFromTriage(0.5, "suspicious") >= 40);
  assert.ok(riskFromTriage(0.9, "escalate") > 80);
});

test("heuristic fallback when artifact is missing", () => {
  const batch = triageFeaturesBatch(
    [{ suspicion_score: 0.1, feature_schema_version: "1.0.0" }],
    { repoRoot: root, artifactPath: join(root, "classifier/artifacts/missing.joblib") },
  );
  assert.equal(batch.backend, "heuristic");
  assert.equal(batch.model_version, HEURISTIC_MODEL_VERSION);
  assert.equal(batch.decisions[0].label, "benign");
});

test("ML triage uses trained artifact when present", () => {
  const artifactPath = defaultArtifactPath(root);
  if (!existsSync(artifactPath)) {
    const train = spawnSync("python", ["-m", "classifier.train"], {
      cwd: root,
      env: { ...process.env, PYTHONPATH: root },
      encoding: "utf8",
    });
    assert.equal(train.status, 0, train.stderr || train.stdout);
  }

  const benignDir = join(root, "fixtures/benign-lockfile");
  const suspiciousDir = join(root, "fixtures/synthetic-suspicious");
  const benignFeatures = extractFromProject(benignDir).bundles.map((bundle) =>
    extractFeatures({
      hook: bundle.hook,
      source: sourceForBundle(benignDir, bundle),
    }),
  );
  const suspiciousFeatures = extractFromProject(suspiciousDir).bundles.map(
    (bundle) =>
      extractFeatures({
        hook: bundle.hook,
        source: sourceForBundle(suspiciousDir, bundle),
      }),
  );

  const benign = triageFeaturesBatch(benignFeatures, { repoRoot: root, artifactPath });
  const suspicious = triageFeaturesBatch(suspiciousFeatures, {
    repoRoot: root,
    artifactPath,
  });

  assert.equal(benign.backend, "ml");
  assert.ok(benign.model_version.startsWith("triage-"));
  assert.equal(inferLabelFromSuspicion({ suspicion_score: 0.9 }), "escalate");
  const suspiciousMax = Math.max(
    ...suspicious.decisions.map((decision) => decision.risk_score),
  );
  const benignMax = Math.max(...benign.decisions.map((decision) => decision.risk_score));
  assert.ok(suspiciousMax > benignMax);
});
