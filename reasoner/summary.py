"""Build BehaviorSummary from static features and optional BehaviorLog."""

from __future__ import annotations

from typing import Any

SUMMARY_VERSION = "1.0.0"


def build_behavior_summary(
    features: dict[str, Any],
    behavior_log: dict[str, Any] | None = None,
) -> dict[str, Any]:
    capabilities: list[str] = []
    observables: dict[str, list[str]] = {
        "domains": [],
        "credential_paths": [],
        "spawned_commands": [],
        "repo_description_patterns": [],
    }

    cred_hits = int(features.get("credential_hits") or 0)
    api_hits = int(features.get("api_text_hits") or 0)
    suspicion = float(features.get("suspicion_score") or 0)

    if cred_hits > 0 or api_hits >= 2:
        capabilities.append("credential_harvest")
    if api_hits >= 1 and suspicion >= 3:
        capabilities.append("exfil")
    if behavior_log and behavior_log.get("canary_hits"):
        capabilities.append("credential_harvest")
    if behavior_log and behavior_log.get("net"):
        capabilities.append("exfil")
        for event in behavior_log["net"]:
            host = str(event.get("host") or "")
            if host and host not in observables["domains"]:
                observables["domains"].append(host)

    if not capabilities:
        capabilities.append("unknown")

    if cred_hits > 0:
        observables["credential_paths"].append(".npmrc")

    uncertainty = "low"
    if features.get("unparseable"):
        uncertainty = "high"
    elif suspicion >= 4:
        uncertainty = "medium"
    if behavior_log and behavior_log.get("timeout"):
        uncertainty = "high"

    return {
        "behavior_summary_version": SUMMARY_VERSION,
        "capabilities": capabilities,
        "observables": observables,
        "uncertainty": uncertainty,
        "notes": None,
    }
