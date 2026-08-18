# ADR 0001: Escalating nine-stage pipeline

**Status:** Accepted  
**Date:** 2026-08-18

## Context

Every npm install can pull hundreds of packages. Detonating every lifecycle script in gVisor and calling an LLM would blow CI latency and API cost. Hash-only scanning is cheap but failed against new Shai-Hulud generations.

## Decision

Use a nine-stage **escalate-on-uncertainty** pipeline: intercept → static features → ML triage → (optional) sandbox → (optional) LLM summary → RAG → verdict → policy → feedback. Benign, high-confidence scripts skip stages 4–7.

## Consequences

- NFR-01/NFR-02 are achievable if the classifier's escalation rate on benign graphs stays low.
- Implementation is more moving parts than a single YARA-like scanner; needs versioning of model, corpus, and prompts.
- Failures in later stages must degrade to earlier stages, never to "execute the script."
