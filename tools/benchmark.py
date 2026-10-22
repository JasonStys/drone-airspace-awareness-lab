"""Jason Stys: reproducible bounded-work native timing, not a hard-real-time claim. Lines: docs/SOURCE_MAP.md."""

import json
import platform
import statistics
import time

from awareness.engine import kernel


def main():
    """Measure 30 fresh processes at the 80-state / 3160-overlap cap, including IPC overhead."""
    samples = []
    for _ in range(30):
        start = time.perf_counter()
        assert len(kernel([[0] * 8] * 80, 120, 100, 30)) == 3160
        samples.append((time.perf_counter() - start) * 1000)
    result = {
        "platform": platform.platform(),
        "iterations": len(samples),
        "rows": 80,
        "pairs": 3160,
        "median_ms": round(statistics.median(samples), 3),
        "max_ms": round(max(samples), 3),
        "includes": "process spawn + native parse/solve + Python protocol validation",
    }
    print(json.dumps(result, indent=2))
    assert max(samples) < 3000, (
        "Must fit native timeout; this is not a flight-safety timing guarantee"
    )


if __name__ == "__main__":
    main()
