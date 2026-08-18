# ADR 0002: Held-out-generation evaluation

**Status:** Accepted  
**Date:** 2026-08-18

## Context

The research claim is generalization to an **unseen worm family member**, not in-sample accuracy on known hashes. Random train/test splits would leak near-duplicate droppers from the same campaign.

## Decision

Treat campaigns as generations. Train and build RAG on Shai-Hulud, Shai-Hulud 2.0, and Mini Shai-Hulud only. Seal ChainDrop samples **and** ChainDrop-tagged documents as `heldout`. Compare three ablations (classifier; classifier+sandbox; full RAG). Freeze thresholds on generation 1–3 validation before scoring ChainDrop.

## Consequences

- Production corpus can later include ChainDrop; the **paper result** cannot without a new freeze and a different held-out (none remaining).
- Shared IOCs that appeared in older reports may still help detect ChainDrop; that is acceptable and must be disclosed.
- LLM parametric knowledge of August 2026 events is a validity threat; discuss in the report.
