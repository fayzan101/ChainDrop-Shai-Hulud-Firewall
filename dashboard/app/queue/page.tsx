import Link from "next/link";
import { listVerdicts, type VerdictRecord } from "@/lib/api";
import { actionClass, formatTimestamp, shortSha } from "@/lib/format";

export default async function QueuePage() {
  let verdicts: VerdictRecord[] = [];
  let error: string | null = null;

  try {
    verdicts = await listVerdicts();
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Could not load verdicts from the API.";
  }

  const queue = verdicts.filter((item) => item.action !== "allow");

  return (
    <section>
      <h1>Analyst queue</h1>
      <p className="muted">
        Quarantine and block verdicts from CI scans. Scripts cannot be executed
        from this console.
      </p>

      {error ? <div className="error-box">{error}</div> : null}

      <table>
        <thead>
          <tr>
            <th>Action</th>
            <th>Risk</th>
            <th>Package</th>
            <th>Hook</th>
            <th>Repo</th>
            <th>Run</th>
            <th>Created</th>
            <th>Feedback</th>
          </tr>
        </thead>
        <tbody>
          {queue.length === 0 ? (
            <tr>
              <td colSpan={8} className="muted">
                No quarantine or block verdicts in the queue.
              </td>
            </tr>
          ) : (
            queue.map((verdict) => (
              <tr key={verdict.verdict_id}>
                <td className={actionClass(verdict.action)}>{verdict.action}</td>
                <td>{verdict.risk_score}</td>
                <td>
                  <Link href={`/verdicts/${verdict.verdict_id}`}>
                    {verdict.package}@{verdict.version}
                  </Link>
                </td>
                <td className="mono">{verdict.hook}</td>
                <td className="mono">{verdict.repo}</td>
                <td className="mono">{shortSha(verdict.run_id)}</td>
                <td className="mono">{formatTimestamp(verdict.created_at)}</td>
                <td>{verdict.feedback?.label ?? "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
