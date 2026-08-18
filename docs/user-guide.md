# User guide

For platform engineers who install the Action and analysts who review verdicts. Not a malware analysis playbook.

## 1. What you will see in CI

A SentryHulud step runs **before** dependency scripts execute. Outcomes:

| Action | Job | What you should do |
| --- | --- | --- |
| allow | Continues | Optional: glance at the log on high-value repos |
| quarantine | Fails deploy / fails the step per policy | Analyst reviews the artifact; merge is blocked until cleared |
| block | Fails immediately | Treat as a potential worm; rotate nothing blindly if a wiper token-message is involved — follow your IR plan and vendor advisories |

The log contains package name, hook, `risk_score`, ATT&CK IDs, and a short justification with citations. Full JSON is uploaded as an Actions artifact and/or sent to the API.

## 2. Installing in a workflow

See [github-action.md](github-action.md). Pin the Action to a commit SHA. Keep `--ignore-scripts` semantics until an **allow** verdict exists for the graph (the Action owns this; do not run a second unwrapped `npm ci` first).

## 3. Policy knobs you may change

- `threshold-block` (default 80)
- `threshold-quarantine` (default 40)
- `fail-open` (default `false`) — only for a documented break-glass
- `corpus-version` — use `no-chaindrop` only for the research experiment; production should use the latest production corpus after freeze

Do not disable the sandbox to "speed up CI" on repositories that install untrusted open-source packages.

## 4. Analyst dashboard

After org-mode is deployed:

1. Open the verdict queue (quarantine first, then blocks).
2. Read justification + citations + sandbox indicators (canary hit, processes, destinations).
3. Set feedback: `confirm-malicious`, `false-positive`, `needs-more-data`.
4. If false-positive, document the legitimate behavior (e.g. `esbuild` download) so the next training set can include it.

You cannot execute the script from the dashboard.

## 5. Interpreting scores

- **0–39:** Cheap path; mostly static features. Still logged.
- **40–80:** Uncertain; human should look if the package is new or the justification is weak (`uncertainty: high`).
- **81–100:** Strong match to documented worm techniques or a hard-trip (canary exfil).

Valid SLSA / provenance badges on the npm page **do not** mean allow. Mini Shai-Hulud and ChainDrop published attested malware.

## 6. Incident response (consumer)

If a **block** fires on a package version:

1. Do not re-run the job with `fail-open` to "just ship."
2. Pin dependencies to a last-known-good lockfile from before the suspect publish.
3. Follow CISA / vendor rotation guidance if the package **already installed** on a machine with real secrets (out of this tool's automation).
4. Preserve the SentryHulud artifact for your IR team.

SentryHulud does not rotate your tokens and does not wipe attacker GitHub repos.

## 7. Limitations (tell your developers)

- No lifecycle script ⇒ no detection.
- Time-delayed malware may outwait the sandbox.
- LLM outage ⇒ degraded mode (classifier + sandbox heuristics).
- False positives on exotic but legitimate installers will happen; that is what quarantine and feedback are for.
