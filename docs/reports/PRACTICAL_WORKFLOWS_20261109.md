# Declared assessment coverage validation — 2026-11-09

Jason Stys: observation freshness and per-pair eligibility evidence.

`awareness/coverage.py` adds an explicit ledger after existing Rust analytical
geometry and alert filtering. All declared tracks remain visible, including stale
or unknown-altitude observations omitted from native rows. Pairs distinguish
unknown altitude, MSL/AGL mismatch, stale observations and inactive zone windows;
stale zone sources are warned separately and do not silently disappear. No
geometric threshold, numerical kernel, original count or alert rule is changed.

The UI inspects at most 79 partners of one selected track (64 tracks/16 zones);
the exported ledger contains every pair, at most choose(64,2)+64*16 = 3,040.
Per-track report count, distinct timestamps, duplicate count and strictly older
observations are distinct. Freshness is inclusive at the snapshot boundary.

## Observed local results

- 74 Python tests passed; 99.38% branch-inclusive coverage, new ledger 100%.
- Two unchanged native Rust tests, rustfmt, locked build and warning-denying Clippy
  passed. Existing independent geometric random/dense-time oracles passed.
- 10 TypeScript tests (100% pure presentation helper coverage), strict production
  build and 16 actual browser journeys across Chromium/Firefox/WebKit/mobile
  passed. Real API/native execution, selected missing-data reasons, JSON download,
  input invalidation, hostile text and accessibility were exercised.
- 30-process existing native benchmark: 80 rows / 3,160 native overlaps, median
  11.719 ms, max 19.882 ms; below existing 3-second process deadline. This is not
  a real-time/flight-safety guarantee.
- Hash-locked Python advisory audit: no known vulnerabilities. Live OSV npm
  inventory: 81/81 locked identities, zero findings. Existing lint, formatting,
  generated navigation and source/bundle checks remain required.

Independent hand-accounting checks 18 declared pairs with two eligible overlap
windows and 16 unassessed pairs; exact freshness threshold, stale source, a
zero-duration zone activation, duplicate/older timestamps, empty input, typed
track/zone names and the maximum 3,040-pair ledger are tested. An initial oracle
fixture incorrectly treated a 1,000-second source age as beyond the default
3,600-second source threshold; its explicit threshold was corrected to 999 seconds.

## Limits

Only fictional local ENU coordinates and stationary/constant-velocity bounded
projections are supported. No live traffic, complete coverage, flight permission,
collision probability, avoidance command or operational decision is provided.
Unlisted objects remain unknown. Fresh-at-snapshot does not imply fresh across the
projection. Windows native/browser checks do not replace publication CI or real
system validation. This worker did not trigger Actions or touch user services.
