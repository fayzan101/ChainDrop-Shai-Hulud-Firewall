# Classifier

Phase 2: static features (`features.mjs`, schema `1.0.0`).
Phase 3: ML triage (`train.py` / `triage.py`).

```bash
# Node feature tests
node --test classifier/features.test.mjs

# Train synthetic triage model (generations 1–3 + benign only)
python -m classifier.train

# Python tests
python -m pytest classifier/tests -q
```

`model_version` is `triage-synth-0.1.0` until a frozen paper model replaces the synthetic trainer.

**Held-out rule:** training refuses `campaign=chaindrop` and `split=heldout`. See `docs/evaluation.md`.

Artifacts land in `classifier/artifacts/` (gitignored). Offline explanations use tree feature importances via `explain.py` (SHAP optional later).
