"""Refuse to treat ChainDrop as training data (harness lands in Phase 8)."""

HELD_OUT_CAMPAIGN = "chaindrop"


def test_heldout_campaign_name_is_chaindrop() -> None:
    assert HELD_OUT_CAMPAIGN == "chaindrop"
