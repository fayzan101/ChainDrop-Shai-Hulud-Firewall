# Software Requirements Specification (SRS)

**Product:** SentryHulud  
**Version:** 0.1 (documentation baseline)  
**Date:** August 2026

This SRS operationalizes the [proposal](proposal.md). Requirements are numbered for traceability into tests and the [evaluation plan](evaluation.md).

## 1. Introduction

### 1.1 Purpose

Specify what SentryHulud must do as a CI/CD lifecycle-script firewall, independent of a particular library choice (except where the proposal already froze a stack).

### 1.2 Intended audience

Project supervisors, examiners, implementers, and (later) security engineers who will deploy the GitHub Action.

### 1.3 Product overview

SentryHulud sits in front of `npm install` (and equivalents) in GitHub Actions. It extracts lifecycle scripts, classifies them, optionally detonates them in a sandbox, retrieves related threat intelligence, and returns a structured verdict that fails or warns the job.

### 1.4 Definitions

| Term | Meaning |
| --- | --- |
| Lifecycle script | npm `preinstall`, `install`, or `postinstall` entry in `package.json` |
| Escalate | Classifier decision that the sandbox (and possibly RAG) must run |
| Held-out generation | ChainDrop samples and documents excluded from training and corpus build |
| Canary secret | Fake credential planted in the sandbox to detect theft without exposing real secrets |
| Quarantine | Job does not proceed to deploy; artifacts and verdicts are retained for an analyst |

See also [threat-model.md](threat-model.md).

## 2. Overall description

### 2.1 User classes

| User | Goal |
| --- | --- |
| CI job (machine) | Get allow / warn / block within latency budget |
| Platform engineer | Install the Action, set policy thresholds, view metrics |
| Security analyst | Review quarantined scripts, correct labels, inspect explanations |
| Researcher | Reproduce the held-out experiment with a frozen corpus version |

### 2.2 Operating environment

- GitHub-hosted or self-hosted Actions runners (Linux first).
- Optional always-on NestJS API + PostgreSQL + vector store for org-wide audit.
- Sandbox host capable of Docker + gVisor (or equivalent).

### 2.3 Constraints

- Must not execute untrusted scripts on the CI runner.
- Must not send raw secrets to the LLM provider.
- Must support an **offline / local-corpus** mode for the held-out experiment (ChainDrop docs excluded).
- Dual-use: no requirement that implies generating or publishing worms.

### 2.4 Assumptions

- Projects use npm, yarn, or pnpm with a lockfile (interceptor still walks the would-be install graph).
- Network is available for registry metadata and, when enabled, LLM/embedding APIs. Air-gapped evaluation uses cached models/corpus.

## 3. Functional requirements

### 3.1 Interceptor (FR-INT)

| ID | Requirement |
| --- | --- |
| FR-INT-01 | The interceptor SHALL enumerate lifecycle scripts for every package that would be installed, including transitive dependencies, without executing those scripts. |
| FR-INT-02 | The interceptor SHALL capture script source (inline or file-backed), package name, version, resolved integrity hash, and parent chain. |
| FR-INT-03 | The interceptor SHALL run as a GitHub Action step that can replace or wrap `npm ci` / `npm install`. |
| FR-INT-04 | If interception fails closed (parse error, missing lockfile), the Action SHALL fail the job unless `fail-open` is explicitly configured (default: fail closed). |

### 3.2 Static analysis and ML triage (FR-ML)

| ID | Requirement |
| --- | --- |
| FR-ML-01 | The extractor SHALL parse JavaScript with an AST parser (Acorn or Babel) and SHALL fall back to text features if parse fails. |
| FR-ML-02 | Features SHALL include (at minimum): lifecycle hook type, entropy, identifier-length stats, counts of `child_process` / `net` / `https` / `fs` / `os.homedir` usage, reads of credential-like paths, dynamic `eval` / `Function`, and download-and-execute patterns at the AST level. |
| FR-ML-03 | The classifier SHALL output one of `{benign, suspicious, escalate}` plus a calibrated confidence. |
| FR-ML-04 | Scripts labeled `benign` with confidence ≥ τ_allow MAY skip sandbox and RAG. |
| FR-ML-05 | Model and feature-schema versions SHALL be stored with every verdict. |

### 3.3 Sandbox (FR-SBX)

| ID | Requirement |
| --- | --- |
| FR-SBX-01 | Escalated scripts SHALL execute only inside an isolated container with no host secrets, no Docker socket, and dropped capabilities. |
| FR-SBX-02 | The sandbox SHALL inject canary credentials (fake npm token, GitHub PAT, cloud keys) in conventional locations. |
| FR-SBX-03 | The sandbox SHALL record: outbound destinations (IP/DNS/SNI), filesystem paths touched, spawned processes and arguments, and whether any canary was read or exfiltrated. |
| FR-SBX-04 | Wall-clock execution SHALL be capped (default 30s); on timeout the trace is still passed to later stages. |
| FR-SBX-05 | The container SHALL be destroyed after each run. |

### 3.4 LLM, RAG, and verdict (FR-RAG)

| ID | Requirement |
| --- | --- |
| FR-RAG-01 | Before any LLM call, the system SHALL redact strings matching secret patterns and truncate oversized scripts. |
| FR-RAG-02 | The summarizer SHALL emit a structured behavior object (network, files, processes, persistence, propagation indicators) — not a free-form essay as the only output. |
| FR-RAG-03 | Retrieval SHALL return top-k chunks with `campaign`, `technique`, `date`, and `corpus_version`. The held-out experiment corpus SHALL omit ChainDrop documents. |
| FR-RAG-04 | The reasoner SHALL emit JSON conforming to the schema in [api.md](api.md): `risk_score` 0–100, `action`, `attack_techniques`, `justification`, `citations`. |
| FR-RAG-05 | If the LLM is unavailable, the system SHALL fall back to classifier + sandbox heuristics and mark `reasoner_status: degraded`. |

### 3.5 Policy and CI gate (FR-POL)

| ID | Requirement |
| --- | --- |
| FR-POL-01 | Default thresholds: `risk_score < 40` allow and log; `40–80` quarantine; `> 80` block. Thresholds SHALL be configurable. |
| FR-POL-02 | Block SHALL fail the GitHub Actions step with a non-zero exit code and print the justification. |
| FR-POL-03 | Quarantine SHALL fail deploy jobs but MAY upload verdict artifacts for analysts. |
| FR-POL-04 | Allow SHALL not execute the original lifecycle scripts unless `sentryhulud.run-scripts-after-allow` is set; default remains `--ignore-scripts` plus a documented safe-install path. |

### 3.6 Persistence, dashboard, feedback (FR-FB)

| ID | Requirement |
| --- | --- |
| FR-FB-01 | Every verdict SHALL be stored with raw features, sandbox trace id, corpus version, and prompt/response hashes (not raw secrets). |
| FR-FB-02 | Analysts SHALL be able to override the label (`benign` / `malicious` / `needs-review`) from the dashboard. |
| FR-FB-03 | Overrides SHALL be exportable for retraining and for corpus updates; they SHALL NOT silently mutate the held-out ChainDrop split. |

### 3.7 Evaluation harness (FR-EV)

| ID | Requirement |
| --- | --- |
| FR-EV-01 | The harness SHALL run configurations (a)(b)(c) defined in [evaluation.md](evaluation.md) against frozen splits. |
| FR-EV-02 | Reports SHALL include precision, recall, F1, FPR, ChainDrop recall, and latency percentiles. |

## 4. Non-functional requirements

| ID | Requirement |
| --- | --- |
| NFR-01 | **Latency:** For a typical application lockfile (< 800 packages, < 5% escalations), p95 pipeline time added SHOULD be ≤ 90s excluding cold container pull. |
| NFR-02 | **Cost:** Benign-majority installs SHOULD NOT call the LLM. |
| NFR-03 | **Availability:** Interceptor + classifier MUST work without the LLM; RAG is best-effort. |
| NFR-04 | **Explainability:** Block/quarantine reasons MUST be human-readable and cite retrieved documents or sandbox indicators. |
| NFR-05 | **Reproducibility:** Corpus and model artifacts are versioned; evaluation commands pin those versions. |
| NFR-06 | **Containment:** Sandbox escape is treated as a Sev-1 product bug (see [SECURITY.md](../SECURITY.md)). |
| NFR-07 | **Privacy:** CI logs and LLM payloads MUST NOT include live tokens. |
| NFR-08 | **Usability:** False-positive rate on the benign test set SHOULD be reported and used as a go/no-go for default thresholds (target: justify any FPR > 2% in the report). |

## 5. External interfaces

### 5.1 GitHub Actions

Inputs: policy thresholds, fail-open flag, API endpoint, corpus version pin.  
Outputs: `verdict`, `risk_score`, `action`, path to JSON artifact.  
Details: [github-action.md](github-action.md).

### 5.2 HTTP API

REST resources for verdicts, feedback, corpus health. Details: [api.md](api.md).

### 5.3 LLM and embedding providers

Claude for summarization and verdicts; Voyage or `bge-large` for embeddings. All calls go through a redaction proxy.

### 5.4 npm registry

Read-only metadata and tarball download for analysis. Writes to the public registry are forbidden in all environments.

## 6. Traceability (objectives → requirements)

| Objective (proposal §3) | Primary requirements |
| --- | --- |
| 1 Interceptor in GHA | FR-INT-* |
| 2 Static features + ML | FR-ML-* |
| 3 Sandbox | FR-SBX-* |
| 4 LLM deobfuscation | FR-RAG-01, FR-RAG-02 |
| 5 RAG KB + reasoner | FR-RAG-03, FR-RAG-04 |
| 6 Policy + feedback | FR-POL-*, FR-FB-* |
| 7 Held-out evaluation | FR-EV-*, NFR-05 |
