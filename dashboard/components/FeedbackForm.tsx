"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FeedbackForm({ verdictId }: { verdictId: string }) {
  const router = useRouter();
  const [label, setLabel] = useState("needs-more-data");
  const [analyst, setAnalyst] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/feedback/${verdictId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label,
          analyst,
          comment: comment || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : `HTTP ${response.status}`,
        );
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="feedback-form" onSubmit={onSubmit}>
      <label>
        Label
        <select value={label} onChange={(event) => setLabel(event.target.value)}>
          <option value="confirm-malicious">confirm-malicious</option>
          <option value="false-positive">false-positive</option>
          <option value="needs-more-data">needs-more-data</option>
        </select>
      </label>
      <label>
        Analyst ID
        <input
          required
          value={analyst}
          onChange={(event) => setAnalyst(event.target.value)}
          placeholder="alice"
        />
      </label>
      <label>
        Comment
        <textarea
          rows={4}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </label>
      {error ? <div className="error-box">{error}</div> : null}
      <button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save feedback"}
      </button>
    </form>
  );
}
