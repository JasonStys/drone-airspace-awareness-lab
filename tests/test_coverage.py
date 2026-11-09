"""Jason Stys: hand-accounted declared coverage and exact freshness/window boundaries. Map: docs/SOURCE_MAP.md."""

from awareness.engine import analyze
from awareness.models import Replay


def observation(name="A", **changes):
    """Fictional stationary objects with transparent SI values, not live traffic."""
    return (
        dict(
            track=name,
            observed_s=1000,
            east_m=0,
            north_m=0,
            altitude_m=100,
            ve_mps=0,
            vn_mps=0,
            vz_mps=0,
            altitude_reference="MSL",
        )
        | changes
    )


def zone(name="Z", **changes):
    """Synthetic active cylinder enclosing the stationary observations."""
    return (
        dict(
            name=name,
            east_m=0,
            north_m=0,
            radius_m=10,
            floor_m=90,
            ceiling_m=110,
            altitude_reference="MSL",
            active_from_s=1000,
            active_until_s=1060,
            source_updated_s=1000,
        )
        | changes
    )


def test_declared_pairs_explain_stale_unknown_datums_windows_duplicates_and_exact_boundaries():
    """Expect 6 track pairs + 12 track-zone pairs, including rows absent from native geometry."""
    first = observation(observed_s=985)
    replay = Replay.model_validate(
        {
            "as_of_s": 1000,
            "zone_max_age_s": 999,
            "reports": [
                first,
                observation(observed_s=980),
                first,
                observation("B", observed_s=984.999),
                observation("C", altitude_reference="UNKNOWN"),
                observation("D", altitude_reference="AGL"),
            ],
            "zones": [
                zone(source_updated_s=0),
                zone("Inactive", active_from_s=1100, active_until_s=1200),
                zone("Boundary", altitude_reference="AGL", active_from_s=1060, active_until_s=1070),
            ],
        }
    )
    result = analyze(replay)
    ledger = result["assessment_coverage"]
    assert len(ledger["pairs"]) == 18
    observations = {row["track"]: row for row in ledger["observations"]}
    assert observations["A"] == {
        "track": "A",
        "observed_s": 985,
        "fresh_at_snapshot": True,
        "fresh_through_s": 1000,
        "reports_received": 3,
        "distinct_timestamps": 2,
        "duplicate_reports": 1,
        "superseded_observations": 1,
    }
    assert not observations["B"]["fresh_at_snapshot"]
    pairs = {(row["kind"], row["first"], row["second"]): row for row in ledger["pairs"]}
    assert pairs["traffic", "A", "B"]["reasons"] == ["stale-observation:B"]
    assert pairs["traffic", "A", "C"]["reasons"] == ["unknown-altitude-reference"]
    assert pairs["traffic", "A", "D"]["reasons"] == ["altitude-datum-mismatch"]
    assert pairs["zone", "A", "Inactive"]["assessment_window_s"] is None
    assert pairs["zone", "A", "Inactive"]["reasons"] == ["inactive-zone-window"]
    assert pairs["zone", "A", "Z"]["stale_zone_source"]
    assert pairs["zone", "A", "Z"]["overlap_window_s"] == [0, 60]
    assert pairs["zone", "D", "Boundary"]["overlap_window_s"] == [60, 60]
    assert ledger["status_counts"] == {"modeled-overlap": 2, "not-assessed": 16}
    assert result["unassessed_tracks"] == 2
    assert result["superseded_reports"] == 2  # original aggregate retained unchanged


def test_empty_and_nonoverlap_are_never_clear_airspace_and_names_have_typed_identity():
    """A zone and track may share a display name; kind remains part of their identity."""
    empty = analyze(Replay.model_validate({"as_of_s": 1000, "reports": []}))["assessment_coverage"]
    assert empty["pairs"] == empty["observations"] == []
    assert empty["status_counts"] == {}
    replay = Replay.model_validate(
        {
            "as_of_s": 1000,
            "horizon_s": 0,
            "reports": [observation(), observation("Far", east_m=10000)],
            "zones": [zone("A")],
        }
    )
    ledger = analyze(replay)["assessment_coverage"]
    assert len(ledger["pairs"]) == 3
    assert ledger["pairs"][0]["status"] == "no-modeled-overlap"
    assert ledger["pairs"][1]["kind"] == "zone"
    assert ledger["pairs"][1]["overlap_window_s"] == [0, 0]


def test_maximum_declared_pairs_are_bounded_and_excluded_unknown_tracks_remain_visible():
    """Independent combinatorial count: choose(64,2) + 64*16, never zone-zone pairs."""
    replay = Replay.model_validate(
        {
            "as_of_s": 1000,
            "reports": [observation(f"Track{i}", altitude_reference="UNKNOWN") for i in range(64)],
            "zones": [zone(f"Zone{i}") for i in range(16)],
        }
    )
    ledger = analyze(replay)["assessment_coverage"]
    assert len(ledger["pairs"]) == 3040
    assert ledger["status_counts"] == {"not-assessed": 3040}
