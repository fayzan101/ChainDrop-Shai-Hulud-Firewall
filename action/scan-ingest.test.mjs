import assert from "node:assert/strict";
import test from "node:test";
import { scanResultToIngestPayload } from "./scan-ingest.mjs";

test("scanResultToIngestPayload maps per-script verdicts", () => {
  const payload = scanResultToIngestPayload(
    {
      config: "a",
      risk_score: 82,
      action: "block",
      justification: "Graph max risk_score=82; policy action=block.",
      scripts: [
        {
          package_name: "@scope/evil",
          version: "1.0.0",
          hook: "preinstall",
          script_sha256: "e".repeat(64),
          risk_score: 82,
          action: "block",
          features: { suspicion_score: 0.9 },
        },
      ],
    },
    {
      repo: "acme/app",
      sha: "abc",
      run_id: "1",
      lockfile_digest: "digest",
    },
  );

  assert.equal(payload.verdicts.length, 1);
  assert.equal(payload.verdicts[0].package, "@scope/evil");
  assert.equal(payload.verdicts[0].classifier_label, "escalate");
});
