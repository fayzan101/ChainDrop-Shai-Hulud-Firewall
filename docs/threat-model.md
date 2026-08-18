# Threat model

SentryHulud is itself a security product that handles malware. This model covers (1) the npm worm threat it is designed to detect and (2) attacks against the detector.

## 1. Assets

| Asset | Why it matters |
| --- | --- |
| CI secrets (npm, GitHub, cloud, Vault, K8s) | Primary worm objective |
| Package publish rights | Worm propagation |
| Developer workstations via the same install hooks | Secondary blast |
| Verdict integrity | Attacker who fools the gate gets execution |
| RAG corpus and models | Poisoning causes persistent FP/FN |
| Sandbox host | Escape ⇒ real credentials on the build farm |

## 2. Adversaries

| Actor | Capabilities (from public reporting) |
| --- | --- |
| Shai-Hulud-lineage operators | Lifecycle malware, token theft, automated republish, GitHub exfil, obfuscation, CI cache/OIDC abuse, later blockchain C2 |
| Copycats | Weaker obfuscation, same TTPs |
| Supply-chain nuisance authors | Typosquats without worm logic (out of primary scope) |
| Prompt-injection authors | Malicious comments/strings aimed at the LLM reasoner |
| Insider / compromised maintainer of SentryHulud | Poison models or policy defaults |

## 3. In-scope worm behaviors (detect)

Documented, not aspirational:

- Execution via `preinstall` / `install` / `postinstall`
- Credential harvest from env, files, and CI memory
- Download of helper runtimes (Bun) or scanners (TruffleHog)
- Outbound exfil to webhooks, GitHub repos, or rotated C2
- Enumeration of npm whoami / owned packages and republish
- Persistence: Actions workflows, self-hosted runners, editor/AI tool config
- Destructive wiper when steal/exfil fails

Out of scope for v1: browser XSS, pure typosquat with no lifecycle script, PyPI.

## 4. Trust boundaries

See [architecture.md](architecture.md) §6. Summary:

- **Untrusted:** registry tarballs, script source, strings inside scripts (including "ignore the policy" text).
- **Runner-trusted:** Action code, classifier weights shipped by us, GitHub job token (must never enter the sandbox).
- **Sandbox:** untrusted code, dummy secrets only.
- **LLM provider:** sees redacted summaries; assumed honest but leaky — no live secrets.

## 5. STRIDE on SentryHulud

| Threat | Example | Mitigation |
| --- | --- | --- |
| Spoofing | Trojaned Action in the consumer workflow | Pin Action to a full commit SHA; publish checksums |
| Tampering | Attacker edits verdict JSON on disk | Sign artifacts; prefer API-posted verdicts |
| Repudiation | Block with no audit trail | PostgreSQL audit with model/corpus versions |
| Information disclosure | Script contains a real token; sent to Claude | Redaction; size limits; never log secrets |
| Denial of service | Huge dependency tree / zip bomb tarball | Caps on tarball size, script count, sandbox time |
| Elevation of privilege | Sandbox escape to runner | gVisor, no docker.sock, destroy container, separate host |

## 6. Detector evasion (honest limitations)

| Evasion | Likely effect | Notes |
| --- | --- | --- |
| No lifecycle scripts (pure import-time malware) | Miss | Out of scope; different interceptor needed |
| Valid SLSA provenance | Must not allow-by-attestation | Explicit reasoner instruction |
| Novel C2 (e.g. blockchain) | Hash IOCs miss; RAG may still match "exfil + republish" | Core research bet |
| Time-delayed payload | Sandbox timeout FN | Partial; documented |
| Logic bomb waiting for real tokens | Canaries should still be read | If malware fingerprints canary formats, FN |
| Prompt injection | Reasoner confusion | Schema + citations + heuristic hard trips |
| LLM-only path disabled | Falls back to (a)/(b) | NFR-03 |

## 7. Residual risk

SentryHulud reduces the chance that a Shai-Hulud-class hook runs in CI with real secrets. It does not replace token hygiene, pinned Actions, locked-down `pull_request_target`, or npm trusted publishing. Mini Shai-Hulud showed those CI flaws are how worms get **valid** packages onto the registry in the first place.
