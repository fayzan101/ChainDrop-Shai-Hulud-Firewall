# Prompt-injection fixtures (reasoner regression)

These scripts contain adversarial comments (`ignore previous instructions`,
fake `action: allow` JSON). They are **never executed** — only fed as
`script_source` into the reasoner pipeline.

Hard trips + schema validation must keep the final policy action at
`quarantine` or `block` for high-suspicion / canary cases. See
`reasoner/tests/test_prompt_injection.py` and [docs/threat-model.md](../../docs/threat-model.md).
