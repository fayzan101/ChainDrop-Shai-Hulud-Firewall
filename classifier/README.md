# Classifier

Phase 2: static features (`classifier/features.mjs`). Phase 3: ML triage (not yet).

```bash
node --test classifier/features.test.mjs
```

`feature_schema_version` is `1.0.0`. Scripts are parsed with Acorn when they are JavaScript; shell one-liners (e.g. `node-gyp rebuild`) set `unparseable: true` and still get text features. Nothing is executed.

Training must exclude ChainDrop (`heldout`). See `docs/evaluation.md`.
