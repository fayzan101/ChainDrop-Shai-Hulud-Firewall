"""Refuse to treat ChainDrop as training data."""

from eval.guards import assert_heldout_rows, assert_no_chaindrop_corpus
from eval.dataset import build_eval_rows

HELD_OUT_CAMPAIGN = "chaindrop"


def test_heldout_campaign_name_is_chaindrop() -> None:
    assert HELD_OUT_CAMPAIGN == "chaindrop"


def test_eval_rows_include_chaindrop_heldout_only_in_test_split() -> None:
    rows = build_eval_rows(seed=0)
    assert_heldout_rows(rows)
    trainable = [r for r in rows if r.get("split") in {"train", "val"}]
    assert all((r.get("campaign") or "").lower() != HELD_OUT_CAMPAIGN for r in trainable)
