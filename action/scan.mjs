/**
 * Classifier-only scan (evaluation config a).
 * Intercept → static features → policy. Never executes lifecycle scripts.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractFeatures } from "../classifier/features.mjs";
import {
  extractFromProject,
  InterceptorError,
} from "../interceptor/extract.mjs";
import { decideAction, riskFromFeatures } from "./policy.mjs";

const ACTION_ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(ACTION_ROOT, "..");

/**
 * @param {string} dir
 * @param {object} bundle
 */
export function sourceForBundle(dir, bundle) {
  if (bundle.source_path === "inline:package.json") {
    return bundle.inline_command || "";
  }
  return readFileSync(join(dir, bundle.source_path), "utf8");
}

/**
 * @param {object} opts
 */
export function scanProject(opts) {
  const dir = resolve(opts.dir || ".");
  const failOpen = Boolean(opts.failOpen);
  const thresholds = {
    quarantine: Number(opts.thresholdQuarantine ?? 40),
    block: Number(opts.thresholdBlock ?? 80),
  };
  const verdictPath = resolve(opts.verdictPath || "sentryhulud-verdict.json");

  /** @type {object} */
  let result;
  try {
    const extracted = extractFromProject(dir, {
      lockfile: opts.lockfile ? resolve(opts.lockfile) : undefined,
    });
    const scriptVerdicts = extracted.bundles.map((bundle) => {
      const source = sourceForBundle(dir, bundle);
      const features = extractFeatures({ hook: bundle.hook, source });
      const risk_score = riskFromFeatures(features);
      const action = decideAction(risk_score, thresholds);
      return {
        package_name: bundle.package_name,
        version: bundle.version,
        hook: bundle.hook,
        script_sha256: bundle.script_sha256,
        risk_score,
        action,
        features: {
          feature_schema_version: features.feature_schema_version,
          suspicion_score: features.suspicion_score,
          unparseable: features.unparseable,
          credential_hits: features.credential_hits,
          api_text_hits: features.api_text_hits,
        },
        justification:
          action === "allow"
            ? "Static features below quarantine threshold."
            : `Static suspicion_score=${features.suspicion_score} → risk_score=${risk_score}.`,
      };
    });

    const risk_score =
      scriptVerdicts.length === 0
        ? 0
        : Math.max(...scriptVerdicts.map((s) => s.risk_score));
    const action = decideAction(risk_score, thresholds);

    result = {
      config: "a",
      pipeline: "classifier-only",
      model_version: "features-heuristic-0.1.0",
      feature_schema_version: "1.0.0",
      dir,
      lockfile: extracted.lockfile,
      lockfile_kind: extracted.lockfile_kind,
      risk_score,
      action,
      degraded: false,
      reasoner_status: "skipped",
      thresholds,
      scripts: scriptVerdicts,
      justification:
        scriptVerdicts.length === 0
          ? "No lifecycle scripts found."
          : `Graph max risk_score=${risk_score}; policy action=${action}.`,
    };
  } catch (err) {
    const message =
      err instanceof InterceptorError ? err.message : String(err);
    if (!failOpen) {
      throw err instanceof InterceptorError
        ? err
        : new InterceptorError(message, "SCAN_ERROR");
    }
    result = {
      config: "a",
      pipeline: "classifier-only",
      model_version: "features-heuristic-0.1.0",
      feature_schema_version: "1.0.0",
      dir,
      risk_score: 0,
      action: "allow",
      degraded: true,
      reasoner_status: "skipped",
      thresholds,
      scripts: [],
      justification: `fail-open: ${message}`,
    };
  }

  mkdirSync(dirname(verdictPath), { recursive: true });
  writeFileSync(verdictPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  result.verdict_path = verdictPath;
  return result;
}

function parseArgs(argv) {
  const opts = {
    dir: ".",
    out: "sentryhulud-verdict.json",
    failOpen: false,
    thresholdQuarantine: 40,
    thresholdBlock: 80,
    lockfile: null,
    githubOutput: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--dir") opts.dir = argv[++i];
    else if (a === "--out") opts.out = argv[++i];
    else if (a === "--lockfile") opts.lockfile = argv[++i];
    else if (a === "--fail-open") opts.failOpen = argv[++i] === "true";
    else if (a === "--threshold-quarantine")
      opts.thresholdQuarantine = Number(argv[++i]);
    else if (a === "--threshold-block") opts.thresholdBlock = Number(argv[++i]);
    else if (a === "--github-output") opts.githubOutput = true;
  }
  return opts;
}

function writeGithubOutput(verdict) {
  const outFile = process.env.GITHUB_OUTPUT;
  if (!outFile) {
    return;
  }
  const lines = [
    `action=${verdict.action}`,
    `risk_score=${verdict.risk_score}`,
    `verdict_path=${verdict.verdict_path}`,
    `degraded=${verdict.degraded ? "true" : "false"}`,
  ];
  writeFileSync(outFile, `${lines.join("\n")}\n`, { flag: "a" });
}

export function run(argv, io = { stdout: process.stdout, stderr: process.stderr }) {
  const opts = parseArgs(argv);
  try {
    const verdict = scanProject({
      dir: opts.dir,
      verdictPath: opts.out,
      failOpen: opts.failOpen,
      thresholdQuarantine: opts.thresholdQuarantine,
      thresholdBlock: opts.thresholdBlock,
      lockfile: opts.lockfile,
    });
    if (opts.githubOutput) {
      writeGithubOutput(verdict);
    }
    io.stdout.write(`${JSON.stringify({ action: verdict.action, risk_score: verdict.risk_score, verdict_path: verdict.verdict_path }, null, 2)}\n`);
    if (verdict.action === "allow") {
      return 0;
    }
    io.stderr.write(
      `SentryHulud ${verdict.action}: risk_score=${verdict.risk_score}. ${verdict.justification}\n`,
    );
    return 1;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    io.stderr.write(`${message}\n`);
    return 1;
  }
}

const isDirect =
  process.argv[1] &&
  (process.argv[1].endsWith("scan.mjs") || process.argv[1].endsWith("scan.js"));

if (isDirect) {
  process.exitCode = run(process.argv.slice(2));
}

export { REPO_ROOT };
