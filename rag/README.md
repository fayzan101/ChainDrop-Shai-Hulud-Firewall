# RAG (Phase 6)

Corpus ingest, `no-chaindrop` filtering, and top-k retrieval for config **(c)**.

## Commands

```bash
python -m rag.health --documents fixtures/rag-corpus/documents.jsonl --corpus-version no-chaindrop
python -m rag.ingest --documents fixtures/rag-corpus/documents.jsonl --corpus-version no-chaindrop --out data/corpus/index.json
```

## Layout

| Module | Role |
| --- | --- |
| `redact.py` | Strip tokens/secrets before embeddings or LLM calls |
| `corpus.py` | Load JSONL, filter ChainDrop for eval pin |
| `retrieve.py` | Keyword retrieval (fixture / offline) |
| `ingest.py` | Build pinned index JSON |
| `health.py` | `chaindrop_documents` health check |

Evaluation pin `no-chaindrop` must keep `chaindrop_documents === 0`.
