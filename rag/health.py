"""Corpus health endpoint (CLI equivalent of GET /v1/corpus/health)."""

from __future__ import annotations

import argparse
import json

from rag.corpus import corpus_health, load_documents


def main() -> None:
    parser = argparse.ArgumentParser(description="Report corpus health for a version pin")
    parser.add_argument("--documents", required=True)
    parser.add_argument("--corpus-version", default="no-chaindrop")
    args = parser.parse_args()

    docs = load_documents(args.documents)
    print(json.dumps(corpus_health(docs, args.corpus_version)))


if __name__ == "__main__":
    main()
