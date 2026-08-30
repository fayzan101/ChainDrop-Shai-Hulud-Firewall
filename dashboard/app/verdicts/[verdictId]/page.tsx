import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackForm } from "@/components/FeedbackForm";
import { getVerdict } from "@/lib/api";
import { actionClass, formatTimestamp } from "@/lib/format";

export default async function VerdictPage({
  params,
}: {
  params: { verdictId: string };
}) {
  let verdict;
  try {
    verdict = await getVerdict(params.verdictId);
  } catch {
    notFound();
  }

  return (
    <section>
      <p>
        <Link href="/queue">← Queue</Link>
      </p>
      <h1>
        {verdict.package}@{verdict.version}
      </h1>
      <p className={actionClass(verdict.action)}>
        {verdict.action} · risk {verdict.risk_score}
      </p>

      <dl className="detail-grid">
        <dt>Verdict ID</dt>
        <dd className="mono">{verdict.verdict_id}</dd>
        <dt>Hook</dt>
        <dd className="mono">{verdict.hook}</dd>
        <dt>Script SHA-256</dt>
        <dd className="mono">{verdict.script_sha256}</dd>
        <dt>Repository</dt>
        <dd className="mono">{verdict.repo}</dd>
        <dt>Commit</dt>
        <dd className="mono">{verdict.sha}</dd>
        <dt>Run ID</dt>
        <dd className="mono">{verdict.run_id}</dd>
        <dt>Created</dt>
        <dd className="mono">{formatTimestamp(verdict.created_at)}</dd>
        <dt>Reasoner</dt>
        <dd>
          {verdict.reasoner_status}
          {verdict.degraded ? " (degraded)" : ""}
        </dd>
        <dt>Uncertainty</dt>
        <dd>{verdict.uncertainty}</dd>
        <dt>Split</dt>
        <dd>{verdict.split ?? "—"}</dd>
        <dt>Campaigns</dt>
        <dd>{verdict.matched_campaigns.join(", ") || "—"}</dd>
        <dt>Techniques</dt>
        <dd>{verdict.attack_techniques.join(", ") || "—"}</dd>
      </dl>

      <div className="section">
        <h2>Justification</h2>
        <p>{verdict.justification}</p>
      </div>

      <div className="section">
        <h2>Citations</h2>
        {verdict.citations.length === 0 ? (
          <p className="muted">No citations recorded.</p>
        ) : (
          <ul className="citation-list">
            {verdict.citations.map((citation) => (
              <li key={citation.doc_id}>
                <strong>{citation.title}</strong>
                {citation.url ? (
                  <>
                    {" "}
                    —{" "}
                    <a href={citation.url} rel="noreferrer">
                      {citation.url}
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {verdict.sandbox ? (
        <div className="section">
          <h2>Sandbox</h2>
          <pre className="mono">{JSON.stringify(verdict.sandbox, null, 2)}</pre>
        </div>
      ) : null}

      <div className="section">
        <h2>Analyst feedback</h2>
        {verdict.feedback ? (
          <dl className="detail-grid">
            <dt>Label</dt>
            <dd>{verdict.feedback.label}</dd>
            <dt>Analyst</dt>
            <dd>{verdict.feedback.analyst}</dd>
            <dt>Recorded</dt>
            <dd className="mono">
              {formatTimestamp(verdict.feedback.created_at)}
            </dd>
            <dt>Comment</dt>
            <dd>{verdict.feedback.comment ?? "—"}</dd>
          </dl>
        ) : (
          <p className="muted">No feedback recorded.</p>
        )}
        <FeedbackForm verdictId={verdict.verdict_id} />
      </div>
    </section>
  );
}
