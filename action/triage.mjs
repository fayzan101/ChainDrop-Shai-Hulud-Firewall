/**
 * ML triage bridge: call classifier/triage_batch.py when an artifact exists,
 * otherwise fall back to Phase-2 heuristic scoring.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { riskFromFeatures } from "./policy.mjs";

export const HEURISTIC_MODEL_VERSION = "features-heuristic-0.1.0";
export const DEFAULT_FEATURE_SCHEMA_VERSION = "1.0.0";

/**
 * Map triage probability + label to 0–100 risk (mirrors eval/policy.py).
 * @param {number} maliciousProbability
 * @param {string} label
 * @returns {number}
 */
export function riskFromTriage(maliciousProbability, label) {
  if (label === "benign") {
    return Math.min(35, Math.floor(maliciousProbability * 30));
  }
  if (label === "suspicious") {
    return Math.floor(40 + maliciousProbability * 40);
  }
  return Math.floor(70 + maliciousProbability * 30);
}

/**
 * @param {object} features
 * @returns {string | null}
 */
export function inferLabelFromSuspicion(features) {
  const score = features.suspicion_score;
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

/**
 * @param {string} repoRoot
 * @returns {string}
 */
export function defaultArtifactPath(repoRoot) {
  return join(repoRoot, "classifier/artifacts/triage.joblib");
}

/**
 * @param {object} features
 * @returns {object}
 */
function heuristicDecision(features) {
  const label = inferLabelFromSuspicion(features);
  return {
    label,
    confidence: null,
    malicious_probability: null,
    model_version: HEURISTIC_MODEL_VERSION,
    feature_schema_version:
      features.feature_schema_version || DEFAULT_FEATURE_SCHEMA_VERSION,
    escalate_recommended: label === "suspicious" || label === "escalate",
    risk_score: riskFromFeatures(features),
  };
}

/**
 * @param {object[]} featuresList
 * @param {object} [opts]
 * @param {string} [opts.repoRoot]
 * @param {string} [opts.artifactPath]
 * @param {string} [opts.pythonBin]
 * @returns {{ backend: string, model_version: string, feature_schema_version: string, decisions: object[] }}
 */
export function triageFeaturesBatch(featuresList, opts = {}) {
  const repoRoot = opts.repoRoot || ".";
  const artifactPath = opts.artifactPath || defaultArtifactPath(repoRoot);

  if (!existsSync(artifactPath)) {
    return {
      backend: "heuristic",
      model_version: HEURISTIC_MODEL_VERSION,
      feature_schema_version:
        featuresList[0]?.feature_schema_version ||
        DEFAULT_FEATURE_SCHEMA_VERSION,
      decisions: featuresList.map((features) => heuristicDecision(features)),
    };
  }

  const python = opts.pythonBin || "python";
  const proc = spawnSync(
    python,
    ["-m", "classifier.triage_batch", "--artifact", artifactPath],
    {
      input: JSON.stringify({ features: featuresList }),
      encoding: "utf8",
      env: { ...process.env, PYTHONPATH: repoRoot },
      cwd: repoRoot,
    },
  );

  if (proc.status !== 0) {
    return {
      backend: "heuristic",
      model_version: HEURISTIC_MODEL_VERSION,
      feature_schema_version:
        featuresList[0]?.feature_schema_version ||
        DEFAULT_FEATURE_SCHEMA_VERSION,
      decisions: featuresList.map((features) => heuristicDecision(features)),
    };
  }

  return JSON.parse(proc.stdout.trim());
}
