/**
 * Config (c): intercept → features → RAG reasoner → policy.
 * Never executes lifecycle scripts on the host.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractFeatures } from "../classifier/features.mjs";
import {
  extractFromProject,
  InterceptorError,
} from "../interceptor/extract.mjs";
import { decideAction, riskFromFeatures } from "./policy.mjs";
import { sourceForBundle } from "./scan.mjs";

const ACTION_ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(ACTION_ROOT, "..");
const DEFAULT_CORPUS = join(REPO_ROOT, "fixtures/rag-corpus/documents.jsonl");

/**
 * @param {object} payload
 * @param {object} opts
 */
export function runReasonerPipeline(payload, opts = {}) {
  const documents = resolve(opts.documents || DEFAULT_CORPUS);
  const corpusVersion = opts.corpusVersion || "no-chaindrop";
  const python = opts.pythonBin || "python";
  const result = spawnSync(
    python,
    [
      "-m",
      "reasoner.cli",
      "--documents",
      documents,
      "--corpus-version",
      corpusVersion,
    ],
    {
      input: JSON.stringify(payload),
      encoding: "utf8",
      env: { ...process.env, PYTHONPATH: REPO_ROOT },
    },
  );
  if (result.status !== 0) {
    throw new InterceptorError(
      result.stderr || "reasoner.cli failed",
      "REASONER_ERROR",
    );
  }
  return JSON.parse(result.stdout.trim());
}

/**
 * @param {object} opts
 */
export function scanProjectRag(opts) {
  const dir = resolve(opts.dir || ".");
  const failOpen = Boolean(opts.failOpen);
  const thresholds = {
    quarantine: Number(opts.thresholdQuarantine ?? 40),
    block: Number(opts.thresholdBlock ?? 80),
  };
  const verdictPath = resolve(opts.verdictPath || "sentryhulud-verdict.json");
  const behaviorLogPath = opts.behaviorLogPath
    ? resolve(opts.behaviorLogPath)
    : null;

  /** @type {object} */
  let behaviorLog = null;
  if (behaviorLogPath) {
    behaviorLog = JSON.parse(readFileSync(behaviorLogPath, "utf8"));
  }

  /** @type {object} */
  let result;
  try {
    const extracted = extractFromProject(dir, {
      lockfile: opts.lockfile ? resolve(opts.lockfile) : undefined,
    });

    const scriptVerdicts = extracted.bundles.map((bundle) => {
      const source = sourceForBundle(dir, bundle);
      const features = extractFeatures({ hook: bundle.hook, source });
      const classifierRisk = riskFromFeatures(features);
      return {
        bundle,
        source,
        features,
        classifierRisk,
      };
    });

    const escalated = scriptVerdicts.sort(
      (a, b) => b.classifierRisk - a.classifierRisk,
    );
    const primary = escalated[0];

    let reasoner = null;
    if (primary) {
      reasoner = runReasonerPipeline(
        {
          script_source: primary.source,
          features: primary.features,
          behavior_log: behaviorLog,
          classifier_risk: primary.classifierRisk,
        },
        {
          documents: opts.corpusDocuments,
          corpusVersion: opts.corpusVersion,
          pythonBin: opts.pythonBin,
        },
      );
    }

    const classifierMax =
      scriptVerdicts.length === 0
        ? 0
        : Math.max(...scriptVerdicts.map((s) => s.classifierRisk));
    const risk_score = Math.max(classifierMax, reasoner?.risk_score ?? 0);
    const reasonerAction = reasoner?.action ?? "allow";
    const classifierAction = decideAction(classifierMax, thresholds);
    const action = [classifierAction, reasonerAction].includes("block")
      ? "block"
      : [classifierAction, reasonerAction].includes("quarantine")
        ? "quarantine"
        : decideAction(risk_score, thresholds);

    const scripts = scriptVerdicts.map((entry) => ({
      package_name: entry.bundle.package_name,
      version: entry.bundle.version,
      hook: entry.bundle.hook,
      script_sha256: entry.bundle.script_sha256,
      risk_score: entry.classifierRisk,
      action: decideAction(entry.classifierRisk, thresholds),
      features: {
        feature_schema_version: entry.features.feature_schema_version,
        suspicion_score: entry.features.suspicion_score,
        unparseable: entry.features.unparseable,
        credential_hits: entry.features.credential_hits,
        api_text_hits: entry.features.api_text_hits,
      },
    }));

    result = {
      config: "c",
      pipeline: "classifier+sandbox+rag",
      model_version: "features-heuristic-0.1.0",
      feature_schema_version: "1.0.0",
      corpus_version: opts.corpusVersion || "no-chaindrop",
      prompt_version: reasoner?.prompt_version ?? "verdict-fixture-0.1.0",
      dir,
      lockfile: extracted.lockfile,
      lockfile_kind: extracted.lockfile_kind,
      risk_score,
      action,
      degraded: Boolean(reasoner?.degraded),
      reasoner_status: reasoner?.reasoner_status ?? "skipped",
      thresholds,
      behavior_summary: reasoner?.behavior_summary ?? null,
      attack_techniques: reasoner?.attack_techniques ?? [],
      matched_campaigns: reasoner?.matched_campaigns ?? [],
      citations: reasoner?.citations ?? [],
      uncertainty: reasoner?.uncertainty ?? "low",
      retrieved_chunks: reasoner?.retrieved_chunks ?? 0,
      scripts,
      justification:
        reasoner?.justification ??
        (scriptVerdicts.length === 0
          ? "No lifecycle scripts found."
          : `Graph max classifier risk=${classifierMax}; policy action=${action}.`),
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
      config: "c",
      pipeline: "classifier+sandbox+rag",
      model_version: "features-heuristic-0.1.0",
      feature_schema_version: "1.0.0",
      corpus_version: opts.corpusVersion || "no-chaindrop",
      dir,
      risk_score: 0,
      action: "allow",
      degraded: true,
      reasoner_status: "degraded",
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
    corpusVersion: "no-chaindrop",
    corpusDocuments: DEFAULT_CORPUS,
    behaviorLog: null,
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
    else if (a === "--corpus-version") opts.corpusVersion = argv[++i];
    else if (a === "--corpus-documents") opts.corpusDocuments = argv[++i];
    else if (a === "--behavior-log") opts.behaviorLog = argv[++i];
    else if (a === "--github-output") opts.githubOutput = true;
  }
  return opts;
}

export function run(argv, io = { stdout: process.stdout, stderr: process.stderr }) {
  const opts = parseArgs(argv);
  try {
    const verdict = scanProjectRag({
      dir: opts.dir,
      verdictPath: opts.out,
      failOpen: opts.failOpen,
      thresholdQuarantine: opts.thresholdQuarantine,
      thresholdBlock: opts.thresholdBlock,
      lockfile: opts.lockfile,
      corpusVersion: opts.corpusVersion,
      corpusDocuments: opts.corpusDocuments,
      behaviorLogPath: opts.behaviorLog,
    });
    io.stdout.write(
      `${JSON.stringify({ action: verdict.action, risk_score: verdict.risk_score, verdict_path: verdict.verdict_path, reasoner_status: verdict.reasoner_status }, null, 2)}\n`,
    );
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
  (process.argv[1].endsWith("scan-rag.mjs") ||
    process.argv[1].endsWith("scan-rag.js"));

if (isDirect) {
  process.exitCode = run(process.argv.slice(2));
}

export { REPO_ROOT, DEFAULT_CORPUS };
