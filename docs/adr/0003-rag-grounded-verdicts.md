# ADR 0003: RAG-grounded verdicts instead of signatures or fine-tuning

**Status:** Accepted  
**Date:** 2026-08-18

## Context

Signatures do not survive obfuscation and C2 mutation. Fine-tuning a detector LLM on malware is expensive, dual-use sensitive, and still stale when the next generation ships. Provenance attestations were bypassed when CI itself was hijacked.

## Decision

Ground verdicts in **retrieved** vendor intelligence and ATT&CK text. The LLM may summarize behavior and map it to techniques; it may not be the first control (classifier + sandbox hard trips remain). Citations are mandatory for block/quarantine justifications.

## Consequences

- Corpus versioning becomes part of the product.
- Prompt injection and hallucination are in the threat model; schema validation and closed ATT&CK lists mitigate.
- Explainability is a first-class metric, not a nice-to-have, because CI false positives need a human-readable reason.
