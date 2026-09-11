/**
 * GitHub Actions Job Summary for scan verdicts.
 * Writes only when GITHUB_STEP_SUMMARY is set. Never logs secret values.
 */

import { appendFileSync } from "node:fs";

const SECRETISH =
  /\b(ghp_[A-Za-z0-9]{20,}|npm_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|Bearer\s+[A-Za-z0-9._\-]{8,})\b/g;

/**
 * @param {string} text
 * @returns {string}
 */
export function redactForSummary(text) {
  return String(text ?? "").replace(SECRETISH, "[REDACTED]");
}

/**
 * @param {object} verdict
 * @returns {string}
 */
export function buildJobSummaryMarkdown(verdict) {
  const action = redactForSummary(verdict.action ?? "unknown");
  const risk = Number(verdict.risk_score ?? 0);
  const config = redactForSummary(verdict.config ?? "a");
  const model = redactForSummary(verdict.model_version ?? "n/a");
  const justification = redactForSummary(
    verdict.justification ?? "No justification recorded.",
  );

  const lines = [
    "## SentryHulud scan",
    "",
    `| Field | Value |`,
    `| --- | --- |`,
    `| Action | \`${action}\` |`,
    `| Risk score | ${risk} |`,
    `| Config | \`${config}\` |`,
    `| Model | \`${model}\` |`,
    "",
    `**Justification:** ${justification}`,
    "",
  ];

  const scripts = Array.isArray(verdict.scripts) ? verdict.scripts : [];
  if (scripts.length > 0) {
    lines.push("### Lifecycle scripts", "");
    lines.push("| Package | Hook | Action | Risk |");
    lines.push("| --- | --- | --- | ---: |");
    for (const script of scripts) {
      const pkg = redactForSummary(script.package_name ?? "unknown");
      const hook = redactForSummary(script.hook ?? "");
      const scriptAction = redactForSummary(script.action ?? "");
      const scriptRisk = Number(script.risk_score ?? 0);
      lines.push(
        `| \`${pkg}\` | \`${hook}\` | \`${scriptAction}\` | ${scriptRisk} |`,
      );
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

/**
 * @param {object} verdict
 * @param {{ summaryPath?: string | null }} [opts]
 */
export function writeGithubJobSummary(verdict, opts = {}) {
  const summaryPath =
    opts.summaryPath !== undefined
      ? opts.summaryPath
      : process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return false;
  }
  appendFileSync(summaryPath, buildJobSummaryMarkdown(verdict), "utf8");
  return true;
}
