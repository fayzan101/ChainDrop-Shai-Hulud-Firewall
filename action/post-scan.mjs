/**
 * POST a local scan verdict JSON to the org-mode API (Phase 7).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { scanResultToIngestPayload } from "./scan-ingest.mjs";

/**
 * @param {object} opts
 */
export async function postScanResult(opts) {
  const apiBase = (opts.apiBase || process.env.SENTRYHULUD_API_URL || "").replace(
    /\/$/,
    "",
  );
  if (!apiBase) {
    throw new Error("SENTRYHULUD_API_URL or --api-base is required");
  }

  const token = opts.token || process.env.SENTRYHULUD_API_TOKEN || "";
  const verdictPath = resolve(opts.verdictPath || "sentryhulud-verdict.json");
  const scan = JSON.parse(readFileSync(verdictPath, "utf8"));

  const payload = scanResultToIngestPayload(scan, {
    repo: opts.repo || process.env.GITHUB_REPOSITORY || "local/fixture",
    sha: opts.sha || process.env.GITHUB_SHA || "local",
    run_id: opts.runId || process.env.GITHUB_RUN_ID || `local-${Date.now()}`,
    lockfile_digest:
      opts.lockfileDigest || scan.lockfile || `digest-${Date.now()}`,
    split: opts.split ?? null,
  });

  const response = await fetch(`${apiBase}/v1/scans`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof body.message === "string"
        ? body.message
        : JSON.stringify(body);
    throw new Error(`API ${response.status}: ${message}`);
  }
  return body;
}

function parseArgs(argv) {
  const opts = {
    verdictPath: "sentryhulud-verdict.json",
    apiBase: null,
    token: null,
    repo: null,
    sha: null,
    runId: null,
    lockfileDigest: null,
    split: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--verdict") opts.verdictPath = argv[++i];
    else if (arg === "--api-base") opts.apiBase = argv[++i];
    else if (arg === "--token") opts.token = argv[++i];
    else if (arg === "--repo") opts.repo = argv[++i];
    else if (arg === "--sha") opts.sha = argv[++i];
    else if (arg === "--run-id") opts.runId = argv[++i];
    else if (arg === "--lockfile-digest") opts.lockfileDigest = argv[++i];
    else if (arg === "--split") opts.split = argv[++i];
  }
  return opts;
}

export function run(argv, io = { stdout: process.stdout, stderr: process.stderr }) {
  const opts = parseArgs(argv);
  return postScanResult(opts)
    .then((result) => {
      io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return 0;
    })
    .catch((err) => {
      io.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
      return 1;
    });
}

const isDirect =
  process.argv[1] &&
  (process.argv[1].endsWith("post-scan.mjs") ||
    process.argv[1].endsWith("post-scan.js"));

if (isDirect) {
  run(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
