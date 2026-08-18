# Ethics and responsible research

SentryHulud studies real malware in order to **block it in CI**. That is dual-use work. This document is the project's ethical constraint set.

## 1. Purpose limitation

Allowed:

- Detecting, explaining, and blocking npm lifecycle worms in pipelines the operator owns.
- Measuring generalization on **already public** campaigns.

Not allowed:

- Building, improving, or publishing self-propagating worms.
- Providing reproduction steps, exploit PoCs, or unpublished payloads.
- Harvesting credentials, even "to see if the worm still works," on any real account.
- Scanning or taking down third-party GitHub repositories (out of scope in the proposal).
- Testing against the public npm registry (no canary publishes).

## 2. Data

- Prefer vendor-published IOCs and hashes.
- Do not scrape private victim repositories or dead-drop contents beyond quotes already in public reports.
- Do not store live secrets. If a sample contains a token, drop it and record only the hash.
- Respect copyright of vendor blogs: RAG ingest from URL at build time; do not republish full articles in this repo.

## 3. Sandbox safety

- Isolated host or VM, not a personal daily driver.
- No real `NPM_TOKEN`, `GITHUB_TOKEN`, cloud keys, or OIDC federation.
- Canary credentials only, unique per run.
- No production network egress.
- Documented destroy-after-run.
- Destructive wiper behavior (publicly reported in 2.0 / Mini) is why the sandbox home directory must be disposable.

## 4. LLM use

- Redact secrets before API calls.
- Prompts ask for **technique-level** summaries, not decompiled ready-to-run malware.
- Do not train open models on raw second-stage worms and then publish those weights if that would redistribute the payload.

## 5. Human subjects

No user studies involving deception. Explainability ratings use analysts who know they are scoring system output. No personal data from CI customers in the FYP dataset.

## 6. Disclosure

If implementation work discovers a **new** vulnerability in npm, GitHub Actions, or a specific package (not already public):

1. Do not put PoC code in this repo.
2. Report privately to the vendor / GitHub / npm following their policy.
3. Discuss only after a fix or an agreed disclosure date.

## 7. Examiner / operator notice

Running the evaluation harness with a reconstructed malicious store is optional for grading the **methodology**. The default CI of this repo should use synthetic fixtures, not live worms.
