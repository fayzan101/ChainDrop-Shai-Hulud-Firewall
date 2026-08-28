/**
 * Phase 5 heuristic policy on BehaviorLog — evaluation configuration (b).
 */

import { decideAction } from "../action/policy.mjs";

/**
 * Map sandbox indicators plus optional classifier score to 0–100 risk.
 * @param {object} log BehaviorLog
 * @param {number} classifierRisk
 * @returns {number}
 */
export function riskFromBehaviorLog(log, classifierRisk = 0) {
  let score = Number(classifierRisk) || 0;
  const canaryHits = log?.canary_hits?.length ?? 0;
  const netEvents = log?.net?.length ?? 0;
  const fileReads = (log?.files ?? []).filter((f) => f.operation === "read").length;

  if (canaryHits > 0) {
    score = Math.max(score, 95);
  }
  if (netEvents > 0) {
    score = Math.max(score, 75);
  }
  if (fileReads > 2 && score < 50) {
    score = Math.max(score, 45);
  }
  if (log?.timeout) {
    score = Math.max(score, 55);
  }
  return Math.min(100, Math.round(score));
}

/**
 * @param {object} log BehaviorLog
 * @param {{ classifierRisk?: number, thresholds?: { quarantine: number, block: number } }} opts
 */
export function decideFromBehaviorLog(log, opts = {}) {
  const thresholds = {
    quarantine: Number(opts.thresholds?.quarantine ?? 40),
    block: Number(opts.thresholds?.block ?? 80),
  };
  const classifierRisk = Number(opts.classifierRisk ?? 0);
  const risk_score = riskFromBehaviorLog(log, classifierRisk);
  const action = decideAction(risk_score, thresholds);

  const reasons = [];
  if ((log?.canary_hits?.length ?? 0) > 0) {
    reasons.push(
      `canary_hits=${log.canary_hits.map((h) => h.canary_id).join(",")}`,
    );
  }
  if ((log?.net?.length ?? 0) > 0) {
    reasons.push(`net_attempts=${log.net.length}`);
  }
  if (log?.timeout) {
    reasons.push("sandbox_timeout");
  }
  if (classifierRisk > 0) {
    reasons.push(`classifier_risk=${classifierRisk}`);
  }

  return {
    config: "b",
    pipeline: "classifier+sandbox",
    risk_score,
    action,
    behavior_log_version: log?.behavior_log_version ?? "1.0.0",
    timeout: Boolean(log?.timeout),
    canary_hits: log?.canary_hits ?? [],
    justification:
      reasons.length > 0
        ? `Sandbox indicators: ${reasons.join("; ")} → risk_score=${risk_score}.`
        : `No sandbox tripwires; risk_score=${risk_score}.`,
  };
}
