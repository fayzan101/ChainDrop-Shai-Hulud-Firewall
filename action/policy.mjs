/**
 * Phase 4 policy engine: map risk_score to allow / quarantine / block.
 * Bounds match docs/github-action.md and SRS FR-POL-01.
 */

/**
 * @param {number} riskScore 0–100
 * @param {{ quarantine: number, block: number }} thresholds
 * @returns {"allow" | "quarantine" | "block"}
 */
export function decideAction(riskScore, thresholds) {
  const q = thresholds.quarantine;
  const b = thresholds.block;
  if (riskScore > b) {
    return "block";
  }
  if (riskScore >= q) {
    return "quarantine";
  }
  return "allow";
}

/**
 * Map Phase-2 suspicion features onto a 0–100 risk score for config (a).
 * @param {object} features
 * @returns {number}
 */
export function riskFromFeatures(features) {
  const raw = Number(features.suspicion_score) || 0;
  let score = Math.min(100, Math.round(raw * 10));
  // Unparseable shell installers with no threat needles stay low.
  if (features.unparseable && raw < 3) {
    score = Math.min(score, 25);
  }
  return score;
}
