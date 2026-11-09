"""Jason Stys: report alignment, native protocol and explainable advisories.

Functions/variables: docs/SOURCE_MAP.md. Never generates maneuvers, authorizations or risk probabilities.
"""

import math
import subprocess
import sys
from pathlib import Path

from awareness.coverage import assessment_coverage
from awareness.models import Replay

ROOT = Path(__file__).resolve().parents[1]
BINARY = (
    ROOT
    / "target/release"
    / ("airspace-kernel.exe" if sys.platform == "win32" else "airspace-kernel")
)


class KernelUnavailable(RuntimeError):
    """Native calculation failed: callers must not replace it with a reassuring empty result."""


def kernel(rows, horizon, horizontal, vertical):
    """Execute only the fixed local Rust binary; bound input, runtime and validate output protocol."""
    payload = f"{len(rows)} {horizon} {horizontal} {vertical}\n"
    payload += "\n".join(" ".join(map(str, row)) for row in rows)
    try:
        result = subprocess.run(  # noqa: S603 - fixed local binary, data only via stdin; no shell
            [str(BINARY)], input=payload, text=True, capture_output=True, timeout=3, check=False
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise KernelUnavailable(
            "Native kernel unavailable; build with cargo build --release"
        ) from error
    if result.returncode or len(result.stdout) > 256_000:
        raise KernelUnavailable("Native kernel rejected analysis")
    lines = result.stdout.splitlines()
    if not lines or lines[0] != "AWARENESS/1":
        raise KernelUnavailable("Invalid native protocol")
    pairs = []
    seen = set()
    try:
        for line in lines[1:]:
            a, b, start, end = line.split()
            i, j, lo, hi = int(a), int(b), float(start), float(end)
            if not (
                0 <= i < j < len(rows)
                and math.isfinite(lo)
                and math.isfinite(hi)
                and 0 <= lo <= hi <= horizon + 1e-9
                and (i, j) not in seen
            ):
                raise ValueError("Invalid overlap")
            seen.add((i, j))
            pairs.append((i, j, lo, hi))
    except ValueError as error:
        raise KernelUnavailable("Malformed native result") from error
    return pairs


def analyze(replay: Replay):
    """Select newest reports, align fresh tracks, expand bounds and intersect zone-active windows."""
    latest = {}
    for report in replay.reports:
        if report.track not in latest or report.observed_s > latest[report.track].observed_s:
            latest[report.track] = report
    tracks, rows, references, labels = [], [], [], []
    for name, report in sorted(latest.items()):
        age = replay.as_of_s - report.observed_s
        fresh = age <= replay.stale_after_s
        # Position error is expanded for the entire horizon, not presented as a probability.
        error = report.velocity_error_mps * (age + replay.horizon_s)
        position = [report.east_m, report.north_m, report.altitude_m]
        velocity = [report.ve_mps, report.vn_mps, report.vz_mps]
        if fresh:
            position = [p + v * age for p, v in zip(position, velocity, strict=True)]
        tracks.append(
            {
                "name": name,
                "age_s": age,
                "fresh": fresh,
                "reference": report.altitude_reference,
                "position": position,
                "velocity": velocity,
                "horizontal_bound_m": report.horizontal_error_m + error,
            }
        )
        if fresh and report.altitude_reference != "UNKNOWN":
            rows.append(
                [
                    *position,
                    *velocity,
                    report.horizontal_error_m + error,
                    report.vertical_error_m + error,
                ]
            )
            references.append(report.altitude_reference)
            labels.append(name)
    count = len(rows)
    for zone in replay.zones:
        rows.append(
            [
                zone.east_m,
                zone.north_m,
                (zone.floor_m + zone.ceiling_m) / 2,
                0,
                0,
                0,
                zone.radius_m,
                (zone.ceiling_m - zone.floor_m) / 2,
            ]
        )
        references.append(zone.altitude_reference)
        labels.append(zone.name)
    overlaps = kernel(rows, replay.horizon_s, replay.horizontal_margin_m, replay.vertical_margin_m)
    alerts = []
    for i, j, start, end in overlaps:
        if i >= count or references[i] != references[j] or references[j] == "UNKNOWN":
            continue
        kind = "traffic"
        stale_source = False
        if j >= count:
            kind = "zone"
            zone = replay.zones[j - count]
            start = max(start, zone.active_from_s - replay.as_of_s)
            end = min(end, zone.active_until_s - replay.as_of_s)
            if start > end:
                continue
            stale_source = replay.as_of_s - zone.source_updated_s > replay.zone_max_age_s
        alerts.append(
            {
                "kind": kind,
                "first": labels[i],
                "second": labels[j],
                "start_s": start,
                "end_s": end,
                "stale_source": stale_source,
            }
        )
    alerts.sort(key=lambda alert: (alert["start_s"], alert["first"], alert["second"]))
    unassessed = sum(not t["fresh"] or t["reference"] == "UNKNOWN" for t in tracks)
    incompatible = sum(
        references[i] != references[j] or references[j] == "UNKNOWN"
        for i in range(count)
        for j in range(i + 1, len(rows))
    )
    return {
        "title": replay.title,
        "tracks": tracks,
        "alerts": alerts,
        "assessment_coverage": assessment_coverage(replay, latest, alerts),
        "unassessed_tracks": unassessed,
        "incomparable_pairs": incompatible,
        "superseded_reports": len(replay.reports) - len(latest),
        "stale_zones": [
            z.name
            for z in replay.zones
            if replay.as_of_s - z.source_updated_s > replay.zone_max_age_s
        ],
        "status": "ADVISORY ONLY — coverage is incomplete, never a safe-to-fly verdict",
        "model": "Constant velocity; fixed worst-horizon error bounds; synthetic ENU; no maneuver prediction",
    }
