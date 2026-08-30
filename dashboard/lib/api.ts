export type VerdictAction = "allow" | "quarantine" | "block";

export type VerdictRecord = {
  verdict_id: string;
  created_at: string;
  repo: string;
  sha: string;
  run_id: string;
  package: string;
  version: string;
  hook: string;
  script_sha256: string;
  risk_score: number;
  action: VerdictAction;
  attack_techniques: string[];
  matched_campaigns: string[];
  justification: string;
  citations: Array<{
    doc_id: string;
    title: string;
    url?: string | null;
    date?: string | null;
  }>;
  uncertainty: string;
  reasoner_status: string;
  model_version: string | null;
  feature_schema_version: string | null;
  corpus_version: string | null;
  prompt_version: string | null;
  classifier_label: string | null;
  sandbox: Record<string, unknown> | null;
  degraded: boolean;
  split: string | null;
  feedback: {
    label: string;
    comment: string | null;
    analyst: string;
    created_at: string;
  } | null;
};

function apiBase() {
  return (
    process.env.SENTRYHULUD_API_URL ||
    process.env.NEXT_PUBLIC_SENTRYHULUD_API_URL ||
    "http://127.0.0.1:3001"
  ).replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const token =
    process.env.SENTRYHULUD_API_TOKEN ||
    process.env.NEXT_PUBLIC_SENTRYHULUD_API_TOKEN;
  return token ? { authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...authHeaders(),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API ${response.status} for ${path}`);
  }
  return response.json() as Promise<T>;
}

export async function listVerdicts(params?: {
  action?: string;
}): Promise<VerdictRecord[]> {
  const query = params?.action ? `?action=${encodeURIComponent(params.action)}` : "";
  const data = await apiFetch<{ items: VerdictRecord[] }>(`/v1/verdicts${query}`);
  return data.items;
}

export async function getVerdict(verdictId: string): Promise<VerdictRecord> {
  return apiFetch<VerdictRecord>(`/v1/verdicts/${verdictId}`);
}

export async function submitFeedback(
  verdictId: string,
  input: { label: string; analyst: string; comment?: string },
) {
  return apiFetch(`/v1/verdicts/${verdictId}/feedback`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
