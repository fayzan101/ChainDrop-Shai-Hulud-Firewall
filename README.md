# SentryHulud

[![CI](https://github.com/fayzan101/ChainDrop-Shai-Hulud-Firewall/actions/workflows/ci.yml/badge.svg)](https://github.com/fayzan101/ChainDrop-Shai-Hulud-Firewall/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Issues](https://img.shields.io/github/issues/fayzan101/ChainDrop-Shai-Hulud-Firewall)](https://github.com/fayzan101/ChainDrop-Shai-Hulud-Firewall/issues)

A RAG-augmented AI firewall for detecting self-propagating npm supply-chain worms in CI/CD pipelines.

SentryHulud intercepts `preinstall`, `install`, and `postinstall` scripts across a project's dependency tree **before they run**, triages them with a lightweight classifier, detonates suspicious scripts in a credential-free sandbox, and asks a retrieval-grounded language model whether the observed behavior resembles documented Shai-Hulud-lineage techniques. The CI job is then allowed, quarantined, or blocked with an explainable verdict.

```
npm install
    │
    ▼
Interceptor  →  Static features  →  ML triage
                                      │
                         benign ──────┤ allow + log
                         escalate ────┤
                                      ▼
                         Sandbox dry-run  →  LLM summary
                                      │
                                      ▼
                         RAG retrieval  →  Verdict reasoner
                                      │
                                      ▼
                         Policy engine  →  allow / quarantine / block
```

## Why this exists

Since September 2025 the npm ecosystem has been hit by successive self-replicating worms — Shai-Hulud, Shai-Hulud 2.0, Mini Shai-Hulud, and ChainDrop. Each generation reused credential theft, automated republishing, and GitHub dead-drop exfiltration while changing enough of the delivery and obfuscation to slip past the last wave of signatures, attestations, and registry scanners.

ChainDrop (4 August 2026) poisoned **444 packages and 2,212 versions in under four hours**, days after GitHub turned on publish-time malware scanning. Mini Shai-Hulud published packages that still carried valid SLSA Build Level 3 provenance. Signature lists and attestations are necessary; they are not sufficient.

SentryHulud's research claim is that a pipeline which **reasons about behavior against prior campaign intelligence** generalizes to a held-out worm generation better than a static classifier alone.

## Status

**Phase 6 RAG reasoner** (`rag/`, `reasoner/`, `action/scan-rag.mjs`) produces explainable config **(c)** verdicts with `no-chaindrop` corpus pin. **Next:** [Phase 7 API + dashboard](https://github.com/fayzan101/ChainDrop-Shai-Hulud-Firewall/issues/10). Tracker: [epic #15](https://github.com/fayzan101/ChainDrop-Shai-Hulud-Firewall/issues/15).

## Documentation

| Document | Purpose |
| --- | --- |
| [Documentation index](docs/README.md) | Map of every project document |
| [Project proposal](docs/proposal.md) | Formal FYP proposal (abstract through deliverables) |
| [Architecture](docs/architecture.md) | Nine-stage pipeline and component design |
| [Evaluation plan](docs/evaluation.md) | Held-out ChainDrop experiment and metrics |
| [Implementation phases](docs/implementation-phases.md) | What to code next (Phases 0–8) |
| [Community](docs/community.md) | Discoverability without star-farming |
| [Installation](docs/installation.md) | Local and CI setup (when code lands) |
| [Security policy](SECURITY.md) | Vulnerability reporting and sandbox rules |

## Design constraints

- **npm / Node.js only.** Other ecosystems are future work.
- **GitHub Actions** is the first CI integration.
- **Escalate cost only when needed.** Most scripts should die at the cheap static/ML stages.
- **No real secrets in the sandbox.** Canary credentials only.
- **Held-out evaluation.** Classifier and RAG corpus are built without ChainDrop; ChainDrop is the unseen-variant test.

## Repository layout

```
action/          GitHub Action (policy gate, Phase 4)
interceptor/     Lifecycle-script capture (Phase 1; never executes scripts)
classifier/      Feature extraction and ML triage
sandbox/         Isolated dry-run and behavior capture
rag/             Corpus ingestion, embeddings, retrieval
reasoner/        Deobfuscation + verdict JSON
api/             NestJS backend, PostgreSQL, audit log
dashboard/       Next.js analyst console
data/            Labeled scripts and versioned RAG corpus (no raw malware in git)
eval/            Held-out experiment harness
fixtures/        Benign lockfile + synthetic suspicious scripts (never execute)
schemas/         ScriptBundle JSON schema
docs/            This documentation set
```

Local checks: `npm test` and `python -m pytest classifier/tests eval/tests -q`.

```bash
node interceptor/cli.mjs --dir fixtures/benign-lockfile
```

## Responsible use

This is a detector. Do not run captured scripts on a host, do not publish test packages to the public registry, and do not commit live payloads. See [SECURITY.md](SECURITY.md) and [docs/ethics.md](docs/ethics.md).

## License

[MIT](LICENSE)
