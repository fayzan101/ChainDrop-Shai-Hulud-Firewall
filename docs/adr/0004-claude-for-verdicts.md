# ADR 0004: Claude API for summarization and structured verdicts

**Status:** Accepted (revisitable)  
**Date:** 2026-08-18

## Context

The proposal specifies Anthropic Claude for deobfuscation/summarization and JSON verdicts. Local open models would ease air-gap evaluation but may miss instruction-following quality for schema-constrained output.

## Decision

Use Claude for stages 5 and 7 in the full pipeline. Keep prompts and schemas provider-agnostic. Evaluation must still run configuration (a) and (b) **without** Claude so the project is not entirely vendor-locked. Air-gapped demos use (a)/(b) or a local model behind the same JSON schema if time allows.

## Consequences

- API cost and data-handling (redaction) are mandatory.
- Substitution with another model is an implementation detail if the schema and citation rules hold; record a follow-on ADR if Claude is dropped.
