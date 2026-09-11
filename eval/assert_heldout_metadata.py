"""Fail CI if ChainDrop rows appear in train/val metadata."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from classifier.schema import HELD_OUT_CAMPAIGN

DEFAULT_METADATA = Path("data/scripts/metadata.jsonl")
TRAINABLE_SPLITS = frozenset({"train", "val"})


class HeldOutMetadataLeakError(ValueError):
    """Raised when ChainDrop appears in train/val metadata."""


def load_metadata_rows(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, start=1):
            text = line.strip()
            if not text:
                continue
            try:
                row = json.loads(text)
            except json.JSONDecodeError as err:
                raise ValueError(f"{path}:{line_no}: invalid JSON: {err}") from err
            if not isinstance(row, dict):
                raise ValueError(f"{path}:{line_no}: expected object")
            rows.append(row)
    return rows


def find_chaindrop_trainable_leaks(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    leaks: list[dict[str, Any]] = []
    for row in rows:
        campaign = (row.get("campaign") or "").lower()
        split = (row.get("split") or "").lower()
        if campaign == HELD_OUT_CAMPAIGN and split in TRAINABLE_SPLITS:
            leaks.append(row)
    return leaks


def assert_metadata_no_chaindrop_train_val(path: Path) -> str:
    """
    Return a human message. Raises HeldOutMetadataLeakError on leak.
    Missing file is a soft skip (dataset may not exist yet).
    """
    if not path.exists():
        return f"skip: metadata file not found ({path})"
    rows = load_metadata_rows(path)
    leaks = find_chaindrop_trainable_leaks(rows)
    if leaks:
        sample = leaks[0]
        raise HeldOutMetadataLeakError(
            f"ChainDrop leak in train/val: script_id={sample.get('script_id')!r} "
            f"split={sample.get('split')!r} ({len(leaks)} row(s) in {path})"
        )
    return f"ok: {len(rows)} row(s) checked; no ChainDrop in train/val ({path})"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Fail if ChainDrop rows appear in train/val metadata"
    )
    parser.add_argument(
        "--metadata",
        type=Path,
        default=DEFAULT_METADATA,
        help="Path to metadata.jsonl (default: data/scripts/metadata.jsonl)",
    )
    args = parser.parse_args(argv)
    try:
        message = assert_metadata_no_chaindrop_train_val(args.metadata)
    except HeldOutMetadataLeakError as err:
        print(str(err), file=sys.stderr)
        return 1
    except ValueError as err:
        print(str(err), file=sys.stderr)
        return 1
    print(message)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
