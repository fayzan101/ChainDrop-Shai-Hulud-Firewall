import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { decideAction, riskFromFeatures } from "./policy.mjs";
import { run, scanProject } from "./scan.mjs";
import { HEURISTIC_MODEL_VERSION } from "./triage.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("policy thresholds match SRS bands", () => {
  assert.equal(decideAction(39, { quarantine: 40, block: 80 }), "allow");
  assert.equal(decideAction(40, { quarantine: 40, block: 80 }), "quarantine");
  assert.equal(decideAction(80, { quarantine: 40, block: 80 }), "quarantine");
  assert.equal(decideAction(81, { quarantine: 40, block: 80 }), "block");
});

test("benign fixture allows; synthetic suspicious blocks", () => {
  const outDir = mkdtempSync(join(tmpdir(), "sentryhulud-verdict-"));
  const benign = scanProject({
    dir: join(root, "fixtures/benign-lockfile"),
    verdictPath: join(outDir, "benign.json"),
  });
  const suspicious = scanProject({
    dir: join(root, "fixtures/synthetic-suspicious"),
    verdictPath: join(outDir, "suspicious.json"),
  });
  assert.equal(benign.action, "allow");
  assert.ok(benign.risk_score < 40);
  assert.equal(suspicious.action, "block");
  assert.ok(suspicious.risk_score > 80);
  const written = JSON.parse(readFileSync(suspicious.verdict_path, "utf8"));
  assert.equal(written.pipeline, "classifier-only");
  assert.equal(written.config, "a");
  assert.ok(
    written.triage_backend === "ml" ||
      written.model_version === HEURISTIC_MODEL_VERSION,
  );
});

test("CLI exits 0 on allow and 1 on block", () => {
  const outDir = mkdtempSync(join(tmpdir(), "sentryhulud-cli-"));
  const allowCode = run(
    [
      "--dir",
      join(root, "fixtures/benign-lockfile"),
      "--out",
      join(outDir, "a.json"),
    ],
    { stdout: { write() {} }, stderr: { write() {} } },
  );
  const blockCode = run(
    [
      "--dir",
      join(root, "fixtures/synthetic-suspicious"),
      "--out",
      join(outDir, "b.json"),
    ],
    { stdout: { write() {} }, stderr: { write() {} } },
  );
  assert.equal(allowCode, 0);
  assert.equal(blockCode, 1);
});

test("low suspicion unparseable scripts stay under quarantine", () => {
  const score = riskFromFeatures({
    suspicion_score: 1,
    unparseable: true,
  });
  assert.ok(score < 40);
});
