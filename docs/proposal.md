# Project proposal

**Title:** SentryHulud: A RAG-Augmented AI Firewall for Detecting Self-Propagating npm Supply-Chain Worms in CI/CD Pipelines

**Type:** Final-year research and engineering project (two semesters)

**Date:** August 2026

---

## 1. Abstract

Since September 2025, the npm ecosystem has been repeatedly compromised by a family of self-propagating supply-chain worms — Shai-Hulud, Shai-Hulud 2.0, Mini Shai-Hulud, and most recently ChainDrop — each generation reusing core propagation mechanics (credential theft via lifecycle scripts, automated republishing, GitHub dead-drop exfiltration) while mutating obfuscation and delivery details to evade the defenses built against the previous wave. The August 2026 ChainDrop campaign alone poisoned 444 packages and 2,212 versions in under four hours, and the broader Shai-Hulud lineage has affected packages with a combined multi-billion download footprint. Existing defenses — signature scanning, SLSA provenance attestation, and dependency allowlisting — have each been demonstrated to fail against new variants, including cases where maliciously modified packages carried valid provenance attestations.

This project proposes **SentryHulud**, a lifecycle-script firewall for CI/CD pipelines that combines a lightweight machine-learning triage classifier, a sandboxed behavioral analysis stage, and a Retrieval-Augmented Generation (RAG) reasoning layer built on a continuously updated corpus of published supply-chain worm intelligence. Rather than relying purely on exact-match signatures, the system reasons about whether a newly observed lifecycle script's behavior resembles previously documented worm techniques, producing an explainable risk verdict that a CI pipeline can act on automatically. The system will be evaluated using a **held-out generation** methodology: the RAG corpus and classifier will be built using data from the Shai-Hulud, Shai-Hulud 2.0, and Mini Shai-Hulud campaigns only, with the ChainDrop campaign held out entirely to simulate detection of a genuinely unseen variant.

## 2. Problem statement

Modern software supply chains depend on the implicit trust that installing a package from a public registry is safe. npm's lifecycle script mechanism (`preinstall` / `install` / `postinstall`) allows arbitrary code execution the moment a package is installed — before any application code runs, and often inside CI/CD environments that hold highly privileged credentials (cloud provider keys, GitHub tokens, deployment secrets).

Since 2025, a lineage of self-replicating worms has repeatedly exploited this mechanism at scale. Each generation has been engineered to defeat the mitigations deployed against its predecessor:

- **SLSA Build Level 3** provenance attestation, previously treated as a strong integrity guarantee, was defeated by Mini Shai-Hulud (CVE-2026-45321): poisoned packages were published through hijacked trusted-publishing workflows and therefore carried valid Sigstore attestations.
- **GitHub's publish-time malware scanning**, introduced on 28 July 2026, was seemingly bypassed within days by ChainDrop (4 August 2026).

This demonstrates a structural weakness in purely signature- or attestation-based defenses: they are inherently reactive and generalize poorly to novel variants.

There is currently no widely available, open, and explainable tool that reasons about the **semantic behavior** of a lifecycle script against the accumulated intelligence of prior campaigns, rather than checking it against a static blocklist. This project addresses that gap.

## 3. Objectives

1. Design and implement an interceptor that captures npm lifecycle scripts (`preinstall`, `install`, `postinstall`) across a project's full dependency tree **before execution**, integrated into a GitHub Actions CI workflow.
2. Build a static-feature extraction pipeline and a lightweight ML classifier to triage lifecycle scripts as benign, suspicious, or requiring deeper analysis, minimizing cost on the common (benign) case.
3. Implement a sandboxed dry-run environment that safely executes flagged scripts and records behavioral indicators (network destinations, credential-path file access, spawned processes) without exposing real credentials.
4. Build an LLM-based deobfuscation and behavior-summarization stage that converts obfuscated or minified script content into a structured, human-readable behavior description.
5. Construct a RAG knowledge base from published Shai-Hulud / ChainDrop threat intelligence (vendor IOC reports, MITRE ATT&CK mappings, deobfuscated payload **descriptions**) and implement a retrieval + verdict-reasoning pipeline that produces an explainable risk score and recommended action.
6. Implement a policy enforcement layer that allows, quarantines, or blocks a CI/CD job based on the computed verdict, with a feedback mechanism for analysts to correct verdicts and improve the system over time.
7. Evaluate the system using a held-out-generation methodology to measure its ability to generalize to a previously unseen worm variant, compared against a static-classifier-only baseline.

## 4. Scope

### 4.1 In scope

- npm ecosystem (Node.js / JavaScript lifecycle scripts) — the primary target of the Shai-Hulud lineage.
- GitHub Actions as the CI/CD integration target.
- Static feature extraction, ML triage classifier, sandboxed behavioral analysis.
- LLM-based deobfuscation / summarization and RAG-based verdict reasoning.
- Policy enforcement (allow / quarantine / block) and an analyst feedback dashboard.
- Evaluation against publicly documented Shai-Hulud, Shai-Hulud 2.0, Mini Shai-Hulud, and ChainDrop samples (held-out split as specified in [evaluation.md](evaluation.md)).

### 4.2 Out of scope (future work)

- PyPI, crates.io, and other package ecosystems — architecture is designed to be extensible but implementation targets npm only.
- Graph Neural Network-based blast-radius / propagation-risk scoring across an organization's full dependency graph.
- Reinforcement-learning-based adaptive threshold tuning for the policy engine.
- Automated takedown-request generation for discovered GitHub exfiltration dead-drop repositories.

## 5. Research question

**Does RAG-grounded reasoning over prior Shai-Hulud-lineage intelligence generalize to a genuinely unseen worm generation better than a static classifier alone?**

Operationalized as: train classifier + corpus on generations 1–3; evaluate recall, precision, F1, and false-positive rate on ChainDrop (generation 4) and on a benign npm lifecycle-script holdout, under three pipeline configurations (classifier only; classifier + sandbox; full RAG pipeline).

## 6. System sketch

The system is a nine-stage escalating pipeline. Cheap static checks run on every install; expensive sandbox and LLM stages run only on scripts the classifier refuses to call benign. Details are in [architecture.md](architecture.md) and [methodology.md](methodology.md).

| Stage | Function |
| --- | --- |
| 1. Interceptor | Captures `preinstall` / `install` / `postinstall` scripts across the dependency tree before execution. |
| 2. Static feature extractor | AST parsing, obfuscation-entropy scoring, suspicious API-call detection. |
| 3. ML triage classifier | Fast benign / suspicious / escalate decision on static features. |
| 4. Sandboxed dry-run | Isolated execution capturing network, filesystem, and process behavior. |
| 5. LLM deobfuscation | Converts obfuscated script + behavior log into a structured summary. |
| 6. RAG retrieval | Retrieves top-k similar documented cases from the threat-intel knowledge base. |
| 7. Verdict reasoner | LLM produces risk score, matched technique(s), and explanation. |
| 8. Policy engine | Enforces allow / quarantine / block based on verdict thresholds. |
| 9. Feedback loop | Analyst corrections update the classifier and the RAG corpus. |

## 7. Evaluation (summary)

Build the ML classifier and RAG corpus using only Shai-Hulud (2025), Shai-Hulud 2.0, and Mini Shai-Hulud data. Withhold all ChainDrop (August 2026) samples and documents. Evaluate detection on the withheld set. Compare:

- (a) static classifier only
- (b) classifier + sandbox, no RAG
- (c) full pipeline with RAG-grounded verdicts

Primary metrics: precision, recall, F1, false-positive rate, held-out (ChainDrop) recall, end-to-end latency, and qualitative explainability. Full protocol: [evaluation.md](evaluation.md).

## 8. Technology stack (summary)

| Layer | Technology |
| --- | --- |
| CI/CD integration | GitHub Actions (custom composite / JS action), Node.js npm wrapper |
| Static analysis | Acorn / `@babel/parser`, custom entropy and API-call features |
| ML triage | Python, scikit-learn, XGBoost / LightGBM, SHAP |
| Sandbox | Docker with seccomp / gVisor; eBPF or `strace` for capture |
| LLM | Anthropic Claude API — summarization and structured JSON verdicts |
| Embeddings | Voyage AI or open-source `bge-large` |
| Vector database | Chroma (local) or pgvector |
| RAG orchestration | LlamaIndex or LangChain |
| Backend / API | NestJS, PostgreSQL |
| Dashboard | Next.js / React |
| Monitoring | Prometheus + Grafana |

## 9. Expected outcomes

- A working CI/CD-integrated lifecycle-script firewall deployable as a GitHub Action.
- A labeled dataset of benign and malicious npm lifecycle scripts spanning multiple Shai-Hulud-lineage campaigns.
- A versioned RAG knowledge base of supply-chain worm threat intelligence.
- Empirical results on held-out-generation detection, with an ablation isolating RAG's contribution over static classification.
- An analyst-facing dashboard for verdict review and feedback.
- Final-year project report and defense documentation.

## 10. Related documents

- [Literature review](literature-review.md)
- [Software requirements](srs.md)
- [Architecture](architecture.md)
- [Methodology](methodology.md)
- [Timeline](timeline.md)
- [References](references.md)
