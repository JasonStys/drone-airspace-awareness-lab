"""Jason Stys: declared-pair assessment and observation freshness ledger. Map: docs/SOURCE_MAP.md.

No geometry calculation or new safety verdict. Missing/undeclared traffic is never
invented. Functions, parameters and local variables are indexed in the source map.
"""

from collections import Counter, defaultdict

from awareness.models import Replay


def assessment_coverage(replay: Replay, latest: dict, alerts: list) -> dict:
    """Explain every declared track/track and track/zone pair, including excluded native rows."""
    counts, timestamps = Counter(), defaultdict(set)
    for report in replay.reports:
        counts[report.track] += 1
        timestamps[report.track].add(report.observed_s)
    observations = []
    for name, report in sorted(latest.items()):
        observations.append(
            {
                "track": name,
                "observed_s": report.observed_s,
                "fresh_at_snapshot": replay.as_of_s - report.observed_s <= replay.stale_after_s,
                "fresh_through_s": report.observed_s + replay.stale_after_s,
                "reports_received": counts[name],
                "distinct_timestamps": len(timestamps[name]),
                "duplicate_reports": counts[name] - len(timestamps[name]),
                "superseded_observations": len(timestamps[name]) - 1,
            }
        )
    windows = {
        (row["kind"], row["first"], row["second"]): [row["start_s"], row["end_s"]] for row in alerts
    }
    pairs = []
    names = sorted(latest)
    for index, first in enumerate(names):
        report = latest[first]
        partners = [("traffic", name, latest[name]) for name in names[index + 1 :]]
        partners += [("zone", zone.name, zone) for zone in replay.zones]
        for kind, second, other in partners:
            reasons = []
            for name, observation in [(first, report)] + (
                [(second, other)] if kind == "traffic" else []
            ):
                if replay.as_of_s - observation.observed_s > replay.stale_after_s:
                    reasons.append(f"stale-observation:{name}")
            if report.altitude_reference == "UNKNOWN" or other.altitude_reference == "UNKNOWN":
                reasons.append("unknown-altitude-reference")
            elif report.altitude_reference != other.altitude_reference:
                reasons.append("altitude-datum-mismatch")
            active = [0.0, replay.horizon_s]
            stale_source = False
            if kind == "zone":
                active = [
                    max(0.0, other.active_from_s - replay.as_of_s),
                    min(replay.horizon_s, other.active_until_s - replay.as_of_s),
                ]
                stale_source = replay.as_of_s - other.source_updated_s > replay.zone_max_age_s
                if active[0] > active[1]:
                    active = None
                    reasons.append("inactive-zone-window")
            overlap = windows.get((kind, first, second))
            pairs.append(
                {
                    "kind": kind,
                    "first": first,
                    "second": second,
                    "status": "not-assessed"
                    if reasons
                    else ("modeled-overlap" if overlap is not None else "no-modeled-overlap"),
                    "reasons": reasons,
                    "assessment_window_s": active,
                    "overlap_window_s": overlap,
                    "stale_zone_source": stale_source,
                }
            )
    return {
        "as_of_s": replay.as_of_s,
        "observations": observations,
        "pairs": pairs,
        "status_counts": dict(sorted(Counter(pair["status"] for pair in pairs).items())),
        "notice": "Declared objects only. Freshness is evaluated at this snapshot, not continuously across the projection. No overlap or no declared pairs is not evidence of clear airspace. A stale zone source remains explicitly flagged.",
    }
