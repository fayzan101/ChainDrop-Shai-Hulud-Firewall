import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  buildJobSummaryMarkdown,
  redactForSummary,
  writeGithubJobSummary,
} from "./job-summary.mjs";

test("redactForSummary strips token-shaped substrings", () => {
  const text = redactForSummary(
    "token ghp_abcdefghijklmnopqrstuvwxyz123456 and npm_abcdefghijklmnopqrstuv",
  );
  assert.equal(text.includes("ghp_"), false);
  assert.equal(text.includes("[REDACTED]"), true);
});

test("buildJobSummaryMarkdown lists action and scripts without secrets", () => {
  const md = buildJobSummaryMarkdown({
    action: "block",
    risk_score: 88,
    config: "a",
    model_version: "triage-synth-0.1.0",
    justification: "Static suspicion with ghp_abcdefghijklmnopqrstuvwxyz123456",
    scripts: [
      {
        package_name: "@scope/evil",
        hook: "preinstall",
        action: "block",
        risk_score: 88,
      },
    ],
  });
  assert.match(md, /## SentryHulud scan/);
  assert.match(md, /`block`/);
  assert.match(md, /@scope\/evil/);
  assert.match(md, /preinstall/);
  assert.equal(md.includes("ghp_abcdefghijklmnopqrstuvwxyz123456"), false);
  assert.match(md, /\[REDACTED\]/);
});

test("writeGithubJobSummary no-ops without GITHUB_STEP_SUMMARY", () => {
  const wrote = writeGithubJobSummary(
    { action: "allow", risk_score: 0, justification: "ok" },
    { summaryPath: null },
  );
  assert.equal(wrote, false);
});

test("writeGithubJobSummary appends markdown when path is set", () => {
  const dir = mkdtempSync(join(tmpdir(), "sentryhulud-summary-"));
  const path = join(dir, "summary.md");
  const wrote = writeGithubJobSummary(
    {
      action: "quarantine",
      risk_score: 55,
      config: "b",
      justification: "Elevated risk.",
      scripts: [],
    },
    { summaryPath: path },
  );
  assert.equal(wrote, true);
  const body = readFileSync(path, "utf8");
  assert.match(body, /quarantine/);
  assert.match(body, /55/);
});
