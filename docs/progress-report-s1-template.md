# Semester 1 progress report (template)

**Project:** SentryHulud  
**Period:** Weeks 1–16, Semester 1  
**Author:**  
**Date:**

## 1. Summary

Two paragraphs: what was promised vs what was delivered. Demo one-liner.

## 2. Progress against the plan

| Weeks | Planned | Status | Evidence |
| --- | --- | --- | --- |
| 1–3 | Literature and scope |  | |
| 4–6 | Dataset |  | row counts, split check |
| 7–9 | Interceptor + features |  | |
| 10–12 | Classifier |  | val F1 / FPR (gen 1–3 only) |
| 13–15 | Sandbox |  | |
| 16 | Demo |  | |

## 3. Research hygiene

- [ ] ChainDrop samples are labeled `heldout` and were **not** used for training or threshold tuning
- [ ] No live secrets in the repo
- [ ] Sandbox never ran on a daily-driver OS

## 4. Risks and changes

| Risk | Mitigation taken | Remaining |
| --- | --- | --- |
| | | |

## 5. Semester 2 plan

Point at [timeline.md](timeline.md). Note any stack substitutions (ADRs).

## 6. Appendix

Screenshots of the interceptor demo; confusion matrix on **validation** (not ChainDrop).
