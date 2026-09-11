"""Tests for eval.assert_heldout_metadata."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from eval.assert_heldout_metadata import (
    HeldOutMetadataLeakError,
    assert_metadata_no_chaindrop_train_val,
    main,
)


def _write_jsonl(path: Path, rows: list[dict]) -> None:
    path.write_text(
        "".join(json.dumps(row) + "\n" for row in rows),
        encoding="utf-8",
    )


def test_missing_metadata_skips(tmp_path: Path) -> None:
    missing = tmp_path / "missing.jsonl"
    message = assert_metadata_no_chaindrop_train_val(missing)
    assert message.startswith("skip:")
    assert main(["--metadata", str(missing)]) == 0


def test_good_rows_pass(tmp_path: Path) -> None:
    path = tmp_path / "metadata.jsonl"
    _write_jsonl(
        path,
        [
            {"script_id": "a", "campaign": "shai-hulud", "split": "train"},
            {"script_id": "b", "campaign": "chaindrop", "split": "heldout"},
            {"script_id": "c", "campaign": "benign", "split": "val"},
        ],
    )
    message = assert_metadata_no_chaindrop_train_val(path)
    assert message.startswith("ok:")
    assert main(["--metadata", str(path)]) == 0


def test_chaindrop_train_leak_fails(tmp_path: Path) -> None:
    path = tmp_path / "metadata.jsonl"
    _write_jsonl(
        path,
        [
            {"script_id": "leak", "campaign": "chaindrop", "split": "train"},
            {"script_id": "ok", "campaign": "shai-hulud", "split": "val"},
        ],
    )
    with pytest.raises(HeldOutMetadataLeakError, match="ChainDrop leak"):
        assert_metadata_no_chaindrop_train_val(path)
    assert main(["--metadata", str(path)]) == 1


def test_chaindrop_val_leak_fails(tmp_path: Path) -> None:
    path = tmp_path / "metadata.jsonl"
    _write_jsonl(
        path,
        [{"script_id": "leak", "campaign": "ChainDrop", "split": "val"}],
    )
    assert main(["--metadata", str(path)]) == 1
