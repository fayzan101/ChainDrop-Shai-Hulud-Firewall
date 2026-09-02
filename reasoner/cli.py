"""CLI entrypoint for config (c) reasoner (stdin JSON → stdout JSON)."""

from __future__ import annotations

import argparse
import json
import sys

from reasoner.pipeline import run_reasoner_pipeline


def main() -> None:
    parser = argparse.ArgumentParser(description="Run RAG reasoner pipeline")
    parser.add_argument("--documents", required=True)
    parser.add_argument("--corpus-version", default="no-chaindrop")
    parser.add_argument(
        "--provider",
        default=None,
        help="fixture|claude (default: REASONER_PROVIDER env or fixture)",
    )
    args = parser.parse_args()

    payload = json.load(sys.stdin)
    result = run_reasoner_pipeline(
        script_source=str(payload.get("script_source") or ""),
        features=payload.get("features") or {},
        behavior_log=payload.get("behavior_log"),
        classifier_risk=int(payload.get("classifier_risk") or 0),
        documents_path=args.documents,
        corpus_version=args.corpus_version,
        provider_name=args.provider,
    )
    sys.stdout.write(f"{json.dumps(result)}\n")


if __name__ == "__main__":
    main()
