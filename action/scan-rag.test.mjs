import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { scanProjectRag } from "./scan-rag.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("config (c) allows benign fixture with citations skipped", () => {
  const outDir = mkdtempSync(join(tmpdir(), "sentryhulud-rag-"));
  const verdict = scanProjectRag({
    dir: join(root, "fixtures/benign-lockfile"),
    verdictPath: join(outDir, "benign.json"),
  });
  assert.equal(verdict.config, "c");
  assert.equal(verdict.action, "allow");
  assert.equal(verdict.reasoner_status, "ok");
  assert.ok(verdict.risk_score < 40);
});

test("config (c) blocks synthetic suspicious with RAG citations", () => {
  const outDir = mkdtempSync(join(tmpdir(), "sentryhulud-rag-"));
  const behaviorLog = join(
    root,
    "fixtures/sandbox-canary-hit/behavior-log.example.json",
  );
  const verdict = scanProjectRag({
    dir: join(root, "fixtures/synthetic-suspicious"),
    verdictPath: join(outDir, "suspicious.json"),
    behaviorLogPath: behaviorLog,
  });
  assert.equal(verdict.config, "c");
  assert.equal(verdict.action, "block");
  assert.equal(verdict.reasoner_status, "ok");
  assert.ok(verdict.citations.length >= 1);
  assert.ok(verdict.attack_techniques.length >= 1);
  const written = JSON.parse(readFileSync(verdict.verdict_path, "utf8"));
  assert.equal(written.pipeline, "classifier+sandbox+rag");
  assert.equal(written.corpus_version, "no-chaindrop");
});
