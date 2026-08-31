# Eval (Phase 8)

Held-out-generation harness for configurations **(a)** classifier, **(b)** sandbox heuristics, **(c)** full RAG pipeline. Spec: [docs/evaluation.md](../docs/evaluation.md).

## Run

```bash
PYTHONPATH=. python -m eval.run_heldout
```

Options:

- `--config a` (repeat for `b` / `c`; default runs all)
- `--corpus-version no-chaindrop` (required for the research pin)
- `--output-dir eval/results`

## Outputs

- `eval/results/heldout-results.json` — metrics + frozen pins
- `eval/results/heldout-results.md` — report table (commit hash, thresholds, ablation)

## Guards

- Refuses `chaindrop_documents > 0` in the eval corpus pin
- ChainDrop rows appear only in `split=heldout`
- Thresholds are frozen on generation 1–3 validation **before** held-out scoring

## Tests

```bash
PYTHONPATH=. python -m pytest eval/tests -q
```

Synthetic feature rows stand in for the labeled store until `data/scripts/metadata.jsonl` is ready. Replace with the frozen paper model and real metadata without changing the harness interface.
