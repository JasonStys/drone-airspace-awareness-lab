"""Jason Stys: actual Rust executable, independent oracle and replay edge cases. Lines: docs/SOURCE_MAP.md."""

import math
import random
import subprocess

import pytest
from pydantic import ValidationError

from awareness.engine import BINARY, ROOT, KernelUnavailable, analyze, kernel
from awareness.models import Replay


def report(name="A", **overrides):
    """Build a transparent deterministic synthetic report in SI units."""
    return {
        "track": name,
        "observed_s": 1000,
        "east_m": 0,
        "north_m": 0,
        "altitude_m": 100,
        "ve_mps": 0,
        "vn_mps": 0,
        "vz_mps": 0,
        **overrides,
    }


def replay(reports=None, **overrides):
    """Keep fixture input dictionaries independent from production schema defaults."""
    return Replay.model_validate({"as_of_s": 1000, "reports": reports or [], **overrides})


def test_hand_computed_crossing():
    """Opposing linear motion enters radius 10 at 9 seconds and exits at 11."""
    rows = [[0, 0, 0, 0, 0, 0, 0, 0], [100, 0, 0, -10, 0, 0, 0, 0]]
    assert kernel(rows, 20, 10, 1) == [(0, 1, 9.0, 11.0)]


def test_disjoint_horizontal_vertical_windows():
    """Each dimension individually overlaps, but never simultaneously."""
    rows = [[0, 0, 0, 0, 0, 0, 0, 0], [100, 0, 200, -10, 0, -10, 0, 0]]
    assert kernel(rows, 30, 10, 10) == []


def test_independent_sample_oracle_and_invariants():
    """Compare direct Euclidean inequalities at 241 times for 200 seeded state pairs."""
    rng = random.Random(20261021)  # noqa: S311 - reproducible mathematical fixtures, not security randomness
    for _ in range(200):
        a = (
            [rng.uniform(-100, 100) for _ in range(3)]
            + [rng.uniform(-10, 10) for _ in range(3)]
            + [rng.uniform(0, 5), rng.uniform(0, 5)]
        )
        b = (
            [rng.uniform(-100, 100) for _ in range(3)]
            + [rng.uniform(-10, 10) for _ in range(3)]
            + [rng.uniform(0, 5), rng.uniform(0, 5)]
        )
        result = kernel([a, b], 60, 20, 10)
        swapped = kernel([b, a], 60, 20, 10)
        assert result == swapped
        translated = [row.copy() for row in [a, b]]
        for row in translated:
            row[0] += 1000
            row[1] -= 2000
            row[2] += 500
        moved = kernel(translated, 60, 20, 10)
        if result:
            assert moved[0][2:] == pytest.approx(result[0][2:], abs=1e-8)
            enlarged = kernel([a, b], 60, 30, 20)
            assert (
                enlarged
                and enlarged[0][2] <= result[0][2] + 1e-8
                and enlarged[0][3] >= result[0][3] - 1e-8
            )
        else:
            assert moved == []
        for step in range(241):
            t = step / 4
            p = [a[i] - b[i] + (a[i + 3] - b[i + 3]) * t for i in range(3)]
            h = math.hypot(p[0], p[1])
            z = abs(p[2])
            if abs(h - (20 + a[6] + b[6])) < 1e-7 or abs(z - (10 + a[7] + b[7])) < 1e-7:
                continue
            expected = h <= 20 + a[6] + b[6] and z <= 10 + a[7] + b[7]
            observed = bool(result and result[0][2] <= t <= result[0][3])
            assert observed == expected


@pytest.mark.parametrize(
    "rows,h,z,horizon,expected",
    [
        ([[0, 0, 0, 0, 0, 0, 0, 0], [10, 0, 0, 0, 0, 0, 0, 0]], 10, 1, 0, [(0, 1, 0, 0)]),
        ([[0, 0, 0, 0, 0, 0, 0, 0], [0, 10, 0, 1, 0, 0, 0, 0]], 10, 1, 30, [(0, 1, 0, 0)]),
        ([[0, 0, 0, 0, 0, 0, 0, 0], [11, 0, 0, 0, 0, 0, 1, 0]], 10, 1, 30, [(0, 1, 0, 30)]),
        ([[0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 11, 0, 0, 0, 0, 0]], 10, 10, 30, []),
        ([[0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 1, 0, 0]], 1, 10, 30, [(0, 1, 0, 10)]),
    ],
)
def test_analytic_boundaries(rows, h, z, horizon, expected):
    """Inclusive tangencies, zero horizon, stationary vectors and separate altitude."""
    assert kernel(rows, horizon, h, z) == expected


def test_quality_alignment_and_sorting():
    """Newest observation wins regardless of order; old/unknown are not silently dropped."""
    data = replay(
        [
            report("A", observed_s=999, ve_mps=10),
            report("A", observed_s=990),
            report("B", observed_s=980),
            report("C", altitude_reference="UNKNOWN"),
        ]
    )
    result = analyze(data)
    assert result["tracks"][0]["position"][0] == 10
    assert result["tracks"][1]["position"][0] == 0
    assert result["unassessed_tracks"] == 2
    assert result["superseded_reports"] == 1
    assert result["alerts"] == []


def test_incompatible_altitudes():
    """A plausible plot does not justify mixing AGL/MSL vertical coordinates."""
    result = analyze(replay([report(), report("B", altitude_reference="AGL")]))
    assert result["alerts"] == [] and result["incomparable_pairs"] == 1


def test_expanded_uncertainty():
    """Bound includes age plus full horizon; no false precision or probability."""
    result = analyze(replay([report(observed_s=995, horizontal_error_m=2, velocity_error_mps=1)]))
    assert result["tracks"][0]["horizontal_bound_m"] == 67


def zone(**overrides):
    """A synthetic zone independent of the example file."""
    return {
        "name": "Zone",
        "east_m": 0,
        "north_m": 0,
        "radius_m": 20,
        "floor_m": 0,
        "ceiling_m": 200,
        "active_from_s": 1020,
        "active_until_s": 1030,
        "source_updated_s": 0,
        **overrides,
    }


def test_zone_activation_and_staleness():
    """Clip geometric overlap to the active interval and retain stale-source warning."""
    result = analyze(replay([report()], zones=[zone()], zone_max_age_s=100))
    assert result["alerts"] == [
        {
            "kind": "zone",
            "first": "A",
            "second": "Zone",
            "start_s": 20,
            "end_s": 30,
            "stale_source": True,
        }
    ]
    assert result["stale_zones"] == ["Zone"]
    assert (
        analyze(replay([report()], zones=[zone(active_until_s=999, active_from_s=900)]))["alerts"]
        == []
    )


def test_zone_to_zone_is_not_traffic():
    """Do not report overlaps between static zones as moving-object traffic."""
    assert analyze(replay([], zones=[zone(), zone(name="Other")]))["alerts"] == []


def test_example_and_empty():
    """Original demo genuinely exercises native analysis; empty replay is never 'safe'."""
    result = analyze(
        Replay.model_validate_json((ROOT / "examples/training-replay.json").read_text())
    )
    assert {alert["kind"] for alert in result["alerts"]} == {"zone", "traffic"}
    assert "never a safe-to-fly" in analyze(replay())["status"]


@pytest.mark.parametrize(
    "change",
    [
        {"horizon_s": 121},
        {"horizon_s": -1},
        {"horizon_s": float("nan")},
        {"horizontal_margin_m": 0},
        {"as_of_s": "1000"},
        {"unknown": "ignored?"},
        {"reports": [report(observed_s=1001)]},
        {"reports": [report(east_m=float("inf"))]},
        {"reports": [report(), report(east_m=1)]},
        {"reports": [report(track="<script>")]},
        {"reports": [report(str(n)) for n in range(65)]},
        {"reports": [report()] * 257},
        {"zones": [zone(), zone()]},
        {"zones": [zone(floor_m=300)]},
        {"zones": [zone(active_from_s=1100, active_until_s=1000)]},
        {"zones": [zone(source_updated_s=1001)]},
        {"reports": [report(altitude_reference="ellipsoid")]},
    ],
)
def test_invalid_inputs(change):
    """Fail closed on contradictions, unsupported datums, injection labels and size abuse."""
    with pytest.raises(ValidationError):
        replay(**change)


def test_duplicate_and_freshness_boundary():
    """Exact duplicates are counted; age exactly equal to limit remains usable."""
    result = analyze(replay([report(observed_s=985)] * 2))
    assert result["superseded_reports"] == 1 and result["tracks"][0]["fresh"]


@pytest.mark.parametrize(
    "output",
    [
        "",
        "bad",
        "AWARENESS/1\n0 2 0 1",
        "AWARENESS/1\n0 1 NaN 1",
        "AWARENESS/1\n0 1 2 1",
        "AWARENESS/1\n0 1 0 1\n0 1 0 1",
        "AWARENESS/1\nmalformed",
    ],
)
def test_native_output_rejected(monkeypatch, output):
    """Protocol corruption cannot become success; actual calculations tested separately above."""
    monkeypatch.setattr(
        subprocess, "run", lambda *a, **kw: subprocess.CompletedProcess([], 0, output, "")
    )
    with pytest.raises(KernelUnavailable):
        kernel([[0] * 8, [0] * 8], 60, 100, 30)


@pytest.mark.parametrize("failure", [OSError(), subprocess.TimeoutExpired("kernel", 3)])
def test_native_unavailable(monkeypatch, failure):
    """Missing binary or timeout is explicit, with no empty-result fallback."""

    def fail(*args, **kwargs):
        """Simulate a process failure at its boundary only."""
        raise failure

    monkeypatch.setattr(subprocess, "run", fail)
    with pytest.raises(KernelUnavailable):
        kernel([], 60, 100, 30)


def test_native_rejection_and_size(monkeypatch):
    """Nonzero exit/oversized output and oversized stdin are separately covered."""
    for code, output in [(2, ""), (0, "x" * 256001)]:
        monkeypatch.setattr(
            subprocess,
            "run",
            lambda *a, code=code, output=output, **kw: subprocess.CompletedProcess(
                [], code, output, ""
            ),
        )
        with pytest.raises(KernelUnavailable):
            kernel([], 60, 100, 30)


def test_cli_oversize_and_maximum():
    """Native CLI bounds untrusted bytes and handles the full 80-row work envelope."""
    result = subprocess.run(
        [str(BINARY)], input="x" * 65537, text=True, capture_output=True, timeout=3
    )
    assert result.returncode == 2
    assert len(kernel([[0] * 8] * 80, 120, 100, 30)) == 3160
