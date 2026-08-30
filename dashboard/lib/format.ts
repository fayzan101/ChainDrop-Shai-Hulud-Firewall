import type { VerdictAction } from "@/lib/api";

export function actionClass(action: VerdictAction): string {
  if (action === "block") {
    return "action-block";
  }
  if (action === "quarantine") {
    return "action-quarantine";
  }
  return "action-allow";
}

export function formatTimestamp(value: string): string {
  return new Date(value).toISOString().replace("T", " ").replace(".000Z", " UTC");
}

export function shortSha(value: string): string {
  return value.length > 12 ? `${value.slice(0, 12)}…` : value;
}
