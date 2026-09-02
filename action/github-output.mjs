import { writeFileSync } from "node:fs";

/**
 * @param {object} verdict
 */
export function writeGithubOutput(verdict) {
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
  if (verdict.config) {
    lines.push(`config=${verdict.config}`);
  }
  if (verdict.reasoner_status) {
    lines.push(`reasoner_status=${verdict.reasoner_status}`);
  }
  writeFileSync(outFile, `${lines.join("\n")}\n`, { flag: "a" });
}
