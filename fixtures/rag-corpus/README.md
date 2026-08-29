# RAG fixture corpus (Phase 6)

Synthetic threat-intelligence chunks for CI. **Not** live vendor text.

- `documents.jsonl` includes one ChainDrop row with `exclude_from_heldout_corpus: true` to test the `no-chaindrop` pin.
- Ingest with `python -m rag.ingest --documents fixtures/rag-corpus/documents.jsonl --corpus-version no-chaindrop`.
