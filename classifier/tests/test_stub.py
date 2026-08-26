"""Compatibility stub; real coverage is in test_triage.py."""


def test_classifier_package_imports() -> None:
    from classifier.schema import FEATURE_SCHEMA_VERSION, MODEL_VERSION

    assert FEATURE_SCHEMA_VERSION == "1.0.0"
    assert MODEL_VERSION.startswith("triage-")
