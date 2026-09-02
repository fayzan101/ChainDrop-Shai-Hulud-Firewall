/**
 * Map local scan output (config a/c) to API ingest payloads.
 */

/**
 * @param {object} scan
 * @param {object} meta
 * @param {string} meta.repo
 * @param {string} meta.sha
 * @param {string} meta.run_id
 * @param {string} meta.lockfile_digest
 * @param {string | null | undefined} [meta.split]
 */
export function scanResultToIngestPayload(scan, meta) {
  const scripts = Array.isArray(scan.scripts) ? scan.scripts : [];
  const verdicts =
    scripts.length > 0
      ? scripts.map((script) => mapScriptVerdict(scan, script, meta))
      : [mapGraphVerdict(scan, meta)];

  return {
    repo: meta.repo,
    sha: meta.sha,
    run_id: meta.run_id,
    lockfile_digest: meta.lockfile_digest,
    split: meta.split ?? null,
    scan_payload: scan,
    verdicts,
  };
}

/**
 * @param {object} scan
 * @param {object} script
 * @param {object} meta
 */
function mapScriptVerdict(scan, script, meta) {
  const classifierLabel =
    script.classifier_label ?? inferClassifierLabel(script);
  return {
    repo: meta.repo,
    sha: meta.sha,
    run_id: meta.run_id,
    package: script.package_name,
    version: script.version,
    hook: script.hook,
    script_sha256: script.script_sha256,
    risk_score: Number(script.risk_score ?? scan.risk_score ?? 0),
    action: script.action ?? scan.action ?? "allow",
    attack_techniques: scan.attack_techniques ?? [],
    matched_campaigns: scan.matched_campaigns ?? [],
    justification:
      script.justification ??
      scan.justification ??
      "No justification recorded.",
    citations: scan.citations ?? [],
    uncertainty: scan.uncertainty ?? "medium",
    reasoner_status: scan.reasoner_status ?? "skipped",
    model_version: scan.model_version ?? null,
    feature_schema_version: scan.feature_schema_version ?? null,
    corpus_version: scan.corpus_version ?? "no-chaindrop",
    prompt_version: scan.prompt_version ?? null,
    classifier_label: classifierLabel,
    sandbox: scan.behavior_summary
      ? {
          timeout: Boolean(scan.behavior_summary.timeout),
          canary_hits: scan.behavior_summary.canary_hits ?? [],
          egress_count: scan.behavior_summary.egress_count ?? 0,
        }
      : null,
    degraded: Boolean(scan.degraded),
    split: meta.split ?? null,
  };
}

/**
 * @param {object} scan
 * @param {object} meta
 */
function mapGraphVerdict(scan, meta) {
  return {
    repo: meta.repo,
    sha: meta.sha,
    run_id: meta.run_id,
    package: scan.lockfile ?? "graph",
    version: scan.lockfile_kind ?? "unknown",
    hook: "install",
    script_sha256: "0".repeat(64),
    risk_score: Number(scan.risk_score ?? 0),
    action: scan.action ?? "allow",
    attack_techniques: scan.attack_techniques ?? [],
    matched_campaigns: scan.matched_campaigns ?? [],
    justification: scan.justification ?? "No lifecycle scripts found.",
    citations: scan.citations ?? [],
    uncertainty: scan.uncertainty ?? "medium",
    reasoner_status: scan.reasoner_status ?? "skipped",
    model_version: scan.model_version ?? null,
    feature_schema_version: scan.feature_schema_version ?? null,
    corpus_version: scan.corpus_version ?? "no-chaindrop",
    prompt_version: scan.prompt_version ?? null,
    classifier_label: null,
    sandbox: null,
    degraded: Boolean(scan.degraded),
    split: meta.split ?? null,
  };
}

/**
 * @param {object} script
 */
function inferClassifierLabel(script) {
  const score = script.features?.suspicion_score;
  if (typeof score !== "number") {
    return null;
  }
  if (score >= 0.7) {
    return "escalate";
  }
  if (score >= 0.35) {
    return "suspicious";
  }
  return "benign";
}
