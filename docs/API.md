# API and native protocol

Jason Stys: closed local replay contract, explicit failure semantics and data-field units.

Only `http://127.0.0.1:8871` (or the selected local port) is supported. No authentication is offered because this is not a remote/multi-user service. Do not reverse-proxy or tunnel it onto a network.

| Route | Contract |
| --- | --- |
| `GET /` | Built static browser UI, 503 if missing. |
| `GET /api/health` | `{ready, mode}`; 503 if native release binary is absent. File presence is readiness, not a numerical self-test. |
| `GET /api/examples` | Fixed original synthetic training replay. No caller-selected paths. |
| `POST /api/analyze` | `application/json` Replay; 200 with explanatory JSON, 422 schema/JSON errors, 429 analysis capacity, 503 unavailable/rejected native worker. |

Middleware additionally returns 400 for invalid Host, 403 for cross-origin writes, 405 for unsupported methods, 413 over 256 KiB, 415 wrong media type and 408 body timeout. Validation errors expose field paths/types, not original values or private paths. Bodies are read with a five-second deadline and incremental size cap. Access logging is disabled by the supported launcher.

## Replay fields

See the exact closed schemas in `awareness/models.py` and original JSON in `examples/`. Unknown keys and nonfinite values are rejected. Numbers are not coerced from strings or booleans. No executable expressions, paths or URLs are accepted.

- `as_of_s`, report `observed_s`, zone activation and source-update values: seconds in the same synthetic clock, range 0–4e9. They are not automatically current wall-clock time.
- `horizon_s` 0–120 (default60), `stale_after_s`1–120(default15), `zone_max_age_s`1–86400(default3600).
- Horizontal margin1–2000m(default100), vertical margin1–1000m(default30); **not regulatory minima**.
- Report: label, east/north/altitude metres, signed east/north/vertical velocity m/s, horizontal/vertical position-error bounds0–1000m, velocity-error bound0–30m/s. Altitude reference MSL/AGL/UNKNOWN; omitted reference defaults to UNKNOWN, never MSL. Omitted error values default to zero for idealized synthetic exercises, not a verified accuracy estimate. Position ±100000m; component speed ±300m/s.
- Zone: unique name, centre east/north, radius1–10000m, floor/ceiling altitude, reference (omitted means UNKNOWN), active-from/until, source-updated. The example is the provenance; zones are synthetic and unverified, never official restrictions.
- Labels: up to40 ASCII letters/numbers/spaces/underscore/hyphen; must begin alphanumeric. Future observations/sources, reversed intervals, contradictory duplicates and excessive cardinalities fail.

Output includes aligned/frozen tracks, quality flags and ages, alert object names/kind/exact start/end seconds, stale-zone warnings, superseded-report count, incomparable-pair and unassessed-track counts, model and non-clearance statement. Export wraps the input and result with author metadata. No hidden score/ranking or collision probability is calculated.

## Native `AWARENESS/1`

Input whitespace tokens: `count horizon horizontal_margin vertical_margin`, then exactly eight finite values per row: `east north altitude ve vn vz horizontal_radius vertical_halfheight`. Counts0–80; horizon0–120; h0–2000; z0–1000; state absolute values≤1e6; bounds nonnegative. Independent native limits are broader than the API's physically illustrative limits. Trailing/missing values fail exit2. Maximum stdin65536 bytes, including whitespace. No files, URLs, compilation, shell or network in the kernel.

Output first line `AWARENESS/1`, then `indexA indexB startSeconds endSeconds`, indices ascending, twelve fractional digits. Exit0 is success; errors use stderr and exit2. Python rejects unexpected headers, nonfinite/unordered/out-of-range times, invalid indices or duplicate pairs. Pair omission cannot be detected by syntax validation alone: numerical/oracle tests provide independent correctness evidence, not protection from a malicious replaced binary. Run only trusted builds from reviewed source.
