# Final report and defense outline

Use this as the skeleton of the dissertation / FYP report. Chapter lengths are indicative (total ~12–20k words unless the department specifies otherwise).

## Front matter

- Title page: *SentryHulud: A RAG-Augmented AI Firewall for Detecting Self-Propagating npm Supply-Chain Worms in CI/CD Pipelines*
- Abstract (copy from [proposal.md](proposal.md), updated with **results**)
- Acknowledgements
- Table of contents, list of figures/tables
- Glossary (interceptor, canary, held-out generation, SLSA, RAG, lifecycle script)

## Chapter 1 — Introduction

- npm install as a privileged execution point in CI
- Shai-Hulud lineage in four generations (cite [literature-review.md](literature-review.md))
- Failure of signatures, SLSA, and publish-time scanning
- Research question and contributions list
- Thesis structure

## Chapter 2 — Background and related work

Expand [literature-review.md](literature-review.md). Include ATT&CK table. End with the gap statement.

## Chapter 3 — Requirements and threat model

Summarize [srs.md](srs.md) and [threat-model.md](threat-model.md). Trace objectives → FR IDs.

## Chapter 4 — Design

Nine-stage pipeline from [architecture.md](architecture.md). ADRs. Why escalate rather than sandbox everything. Why RAG rather than fine-tuning.

## Chapter 5 — Implementation

- Interceptor and GitHub Action
- Features + classifier
- Sandbox
- RAG ingest and reasoner
- Policy + dashboard
- Screenshots and schema excerpts (not malware dumps)

## Chapter 6 — Experimental setup

Copy the frozen protocol from [evaluation.md](evaluation.md). State corpus version, model version, hardware.

## Chapter 7 — Results

- Table: precision, recall, F1, FPR, ChainDrop recall, latency for (a)(b)(c)
- McNemar / CIs
- Qualitative explainability
- Failure cases (FNs that look like "new C2", FPs that look like `node-gyp`)

## Chapter 8 — Discussion

- Did RAG help? Cost of FPR?
- LLM pretraining contamination caveat
- Ethics ([ethics.md](ethics.md))
- Limitations and future work (PyPI, GNN, RL thresholds, takedown automation — still out of scope)

## Chapter 9 — Conclusion

Restate question, answer, artifact delivered.

## Appendices

- A: Verdict JSON schema
- B: Action inputs
- C: Prompt templates (redacted)
- D: Full bibliography ([references.md](references.md) in department style)
- E: Dataset card summary
- F: Ethics / sandbox checklist

## Defense slides (suggested 12)

1. Title and one-sentence claim  
2. Worm family timeline  
3. Why SLSA and registry scanning failed  
4. Research question  
5. Architecture (one diagram)  
6. Held-out method  
7. Results table  
8. Example explainable verdict (synthetic)  
9. Limitations  
10. Demo screenshot  
11. Contributions  
12. Q&A  

## Progress report (Semester 1)

Short document (5–8 pages): completed weeks 1–15, demo evidence, updated risks from [timeline.md](timeline.md), plan for Semester 2. Do not include ChainDrop test scores if the corpus is not yet frozen.
