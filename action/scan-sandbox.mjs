/**
 * Config (b): intercept → features → sandbox dry-run → heuristic policy.
 * Never executes lifecycle scripts on the host.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractFeatures } from "../classifier/features.mjs";
import {
  extractFromProject,
  InterceptorError,
} from "../interceptor/extract.mjs";
import { decideFromBehaviorLog } from "../sandbox/policy.mjs";
import {
  buildSandboxImage,
  dockerAvailable,
  runInSandbox,
} from "../sandbox/run.mjs";
import { writeGithubOutput } from "./github-output.mjs";
import { decideAction, riskFromFeatures } from "./policy.mjs";
import { sourceForBundle } from "./scan.mjs";

const ACTION_ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(ACTION_ROOT, "..");

const EMPTY_BEHAVIOR_LOG = {
  behavior_log_version: "1.0.0",
  timeout: false,
  processes: [],
  files: [],
  net: [],
  canary_hits: [],
};

/**
 * @param {string} dir
 * @param {object} bundle
 */
function scriptPathForBundle(dir, bundle) {
  if (bundle.source_path === "inline:package.json") {
    return null;
  }
  const path = join(dir, bundle.source_path);
  return existsSync(path) ? path : null;
}

/**
 * @param {object} opts
 */
export async function scanProjectSandbox(opts) {
  const dir = resolve(opts.dir || ".");
  const failOpen = Boolean(opts.failOpen);
  const sandboxEnabled = opts.sandbox !== false;
  const thresholds = {
    quarantine: Number(opts.thresholdQuarantine ?? 40),
    block: Number(opts.thresholdBlock ?? 80),
  };
  const verdictPath = resolve(opts.verdictPath || "sentryhulud-verdict.json");
  const behaviorLogPath = opts.behaviorLogPath
    ? resolve(opts.behaviorLogPath)
    : null;

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
      return { bundle, source, features, classifierRisk };
    });

    const classifierMax =
      scriptVerdicts.length === 0
        ? 0
        : Math.max(...scriptVerdicts.map((s) => s.classifierRisk));

    let behaviorLog = behaviorLogPath
      ? JSON.parse(readFileSync(behaviorLogPath, "utf8"))
      : { ...EMPTY_BEHAVIOR_LOG };

    const primary = [...scriptVerdicts].sort(
      (a, b) => b.classifierRisk - a.classifierRisk,
    )[0];
    const shouldEscalate =
      primary && primary.classifierRisk >= thresholds.quarantine;

    if (
      shouldEscalate &&
      sandboxEnabled &&
      !behaviorLogPath &&
      (await dockerAvailable())
    ) {
      const scriptPath = scriptPathForBundle(dir, primary.bundle);
      if (scriptPath) {
        if (opts.buildSandboxImage) {
          await buildSandboxImage({ image: opts.sandboxImage });
        }
        behaviorLog = await runInSandbox({
          scriptPath,
          scriptId: primary.bundle.script_sha256,
          image: opts.sandboxImage,
          timeoutMs: opts.sandboxTimeoutMs,
        });
      }
    }

    const policy = decideFromBehaviorLog(behaviorLog, {
      classifierRisk: classifierMax,
      thresholds,
    });

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
      config: "b",
      pipeline: "classifier+sandbox",
      model_version: "features-heuristic-0.1.0",
      feature_schema_version: "1.0.0",
      dir,
      lockfile: extracted.lockfile,
      lockfile_kind: extracted.lockfile_kind,
      risk_score: policy.risk_score,
      action: policy.action,
      degraded: false,
      reasoner_status: "skipped",
      thresholds,
      sandbox_escalated:
        shouldEscalate && sandboxEnabled && !behaviorLogPath,
      classifier_escalated: shouldEscalate,
      behavior_log: {
        timeout: Boolean(behaviorLog.timeout),
        canary_hits: (behaviorLog.canary_hits || []).map((hit) => hit.canary_id),
        net_count: behaviorLog.net?.length ?? 0,
        file_read_count: (behaviorLog.files || []).filter(
          (f) => f.operation === "read",
        ).length,
      },
      scripts,
      justification: policy.justification,
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
      config: "b",
      pipeline: "classifier+sandbox",
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
    behaviorLog: null,
    sandbox: true,
    buildSandboxImage: false,
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
    else if (a === "--behavior-log") opts.behaviorLog = argv[++i];
    else if (a === "--no-sandbox") opts.sandbox = false;
    else if (a === "--build-sandbox-image") opts.buildSandboxImage = true;
    else if (a === "--github-output") opts.githubOutput = true;
  }
  return opts;
}

export async function run(
  argv,
  io = { stdout: process.stdout, stderr: process.stderr },
) {
  const opts = parseArgs(argv);
  try {
    const verdict = await scanProjectSandbox({
      dir: opts.dir,
      verdictPath: opts.out,
      failOpen: opts.failOpen,
      thresholdQuarantine: opts.thresholdQuarantine,
      thresholdBlock: opts.thresholdBlock,
      lockfile: opts.lockfile,
      behaviorLogPath: opts.behaviorLog,
      sandbox: opts.sandbox,
      buildSandboxImage: opts.buildSandboxImage,
    });
    if (opts.githubOutput) {
      writeGithubOutput(verdict);
    }
    io.stdout.write(
      `${JSON.stringify({ action: verdict.action, risk_score: verdict.risk_score, verdict_path: verdict.verdict_path, config: verdict.config }, null, 2)}\n`,
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
  (process.argv[1].endsWith("scan-sandbox.mjs") ||
    process.argv[1].endsWith("scan-sandbox.js"));

if (isDirect) {
  run(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}

export { REPO_ROOT };
