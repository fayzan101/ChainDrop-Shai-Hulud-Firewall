"""Build a pinned corpus index (fixture / offline)."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from rag.corpus import corpus_health, filter_for_corpus_version, load_documents


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest RAG corpus for a version pin")
    parser.add_argument("--documents", required=True)
    parser.add_argument("--corpus-version", default="no-chaindrop")
    parser.add_argument("--out", default="data/corpus/index.json")
    args = parser.parse_args()

    docs = load_documents(args.documents)
    active = filter_for_corpus_version(docs, args.corpus_version)
    health = corpus_health(docs, args.corpus_version)
    if args.corpus_version == "no-chaindrop" and health["chaindrop_documents"] != 0:
        raise SystemExit("refusing ingest: chaindrop documents present in no-chaindrop pin")

    payload = {
        "corpus_version": args.corpus_version,
        "health": health,
        "documents": [
            {
                "doc_id": d.doc_id,
                "title": d.title,
                "text": d.text,
                "url": d.url,
                "published_at": d.published_at,
                "campaign_tags": d.campaign_tags,
            }
            for d in active
        ],
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(f"{json.dumps(payload, indent=2)}\n", encoding="utf-8")
    print(json.dumps(health))


if __name__ == "__main__":
    main()
