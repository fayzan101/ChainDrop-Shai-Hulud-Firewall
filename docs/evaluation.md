# Evaluation plan

## 1. Central question

Does RAG-grounded reasoning generalize to a genuinely unseen worm variant better than a static classifier alone?

This is tested with a **held-out-generation** design on the Shai-Hulud lineage.

## 2. Protocol

1. Build the ML classifier and RAG corpus using **only** Shai-Hulud (September 2025), Shai-Hulud 2.0 (November 2025), and Mini Shai-Hulud (April–May 2026) data.
2. Withhold **all** ChainDrop (August 2026) samples **and** ChainDrop-tagged documents from training, validation, hyperparameter search, and corpus construction.
3. Evaluate detection on the withheld ChainDrop samples (malicious class) plus a held-out benign lifecycle-script set that is also unseen at training time.
4. Repeat for three pipeline configurations to isolate RAG's contribution.

No peeking: threshold selection is frozen on generation 1–3 validation **before** ChainDrop scores are computed.

## 3. Configurations (ablation)

| ID | Name | Stages used | Purpose |
| --- | --- | --- | --- |
| (a) | Static classifier only | 1–3 → policy on classifier score | Baseline; what a hash/feature model can do alone |
| (b) | Classifier + sandbox | 1–4 → heuristic policy on `BehaviorLog` (no LLM, no RAG) | Measures value of dynamic indicators |
| (c) | Full pipeline | 1–8 with `corpus_version = no-chaindrop` | Tests RAG-grounded verdicts |

Configuration (b) uses a documented heuristic (e.g. canary read + unexpected egress + credential-path open ⇒ block; else score from classifier). It must not embed ChainDrop-specific IOCs (Ethereum contract addresses, `Math_Symbol.js` names, "Here We Go Again" strings) that were unpublished during generations 1–3.

## 4. Datasets

| Split | Malicious | Benign |
| --- | --- | --- |
| Train | Generations 1–3 (80% of packages) | Sampled popular npm lifecycle scripts |
| Validation | Generations 1–3 (20% of packages) | Separate benign sample |
| Held-out test | **ChainDrop only** | Held-out benign (no overlap with train/val packages) |

Package-level splits avoid near-duplicate scripts from the same blast inflating scores. Labeling rules: [dataset.md](dataset.md).

## 5. Metrics

| Metric | Definition / purpose |
| --- | --- |
| Precision | TP / (TP + FP) on the test mixture |
| Recall | TP / (TP + FN) overall |
| F1 | Harmonic mean of precision and recall |
| False positive rate | FP / (FP + TN) on benign test — **usability** |
| Held-out (ChainDrop) recall | TP_chaindrop / N_chaindrop — **core research claim** |
| Latency | p50 / p95 wall time per lockfile and per escalated script |
| Escalation rate | Fraction of scripts that reach sandbox / LLM (cost) |
| Explainability | Human rating 1–5 on justification accuracy and actionability (qualitative; n ≥ 30 verdicts, two raters) |

Primary success criterion for the research claim: configuration (c) **ChainDrop recall** exceeds (a) by a margin that is reported with a confidence interval (bootstrap over packages). If (c) does not beat (a), that negative result is still a valid FYP outcome and must be discussed.

Secondary: FPR(c) should not explode relative to (a). If RAG buys recall only by blocking everything, the system fails NFR-08.

## 6. Statistical procedure

- Unit of analysis: **package version** (or unique script hash if a version has multiple hooks; report both).
- Bootstrap 95% CIs (10,000 resamples) for recall and FPR.
- McNemar's test on paired (a) vs (c) errors on the same ChainDrop set.
- Pre-register this plan in the repo before looking at ChainDrop scores (commit hash recorded in the final report).

## 7. Latency / cost study

Run the Action against three fixture lockfiles: small (~50 pkgs), medium (~300), large (~800). Report:

- Time in stages 1–3 vs 4 vs 5–7
- LLM token counts
- Escalation rate on benign fixtures (should be low)

## 8. Explainability protocol

Sample 15 ChainDrop TP, 10 FP, 5 FN from (c). Two annotators (can include the author + supervisor or a peer) rate:

- Factual consistency with the script/trace (yes/no)
- Usefulness for a CI engineer (1–5)
- Presence of hallucinated ATT&CK IDs (yes/no)

Report Cohen's κ on the yes/no items.

## 9. What this evaluation does not claim

- Production detection of future unpublished worms.
- That Claude has no parametric knowledge of ChainDrop (limitation; discussed in [methodology.md](methodology.md) §6).
- Transfer to PyPI or other ecosystems.

## 10. Reproduction checklist

- [ ] `corpus_version` pin checked (`no-chaindrop`)
- [ ] Classifier `model_version` trained only on gen 1–3
- [ ] ChainDrop documents absent from vector store (`scripts/assert_no_chaindrop_corpus.py` — to be implemented)
- [ ] Thresholds frozen from val
- [ ] Random seeds recorded
- [ ] Hardware and Docker image digest recorded
