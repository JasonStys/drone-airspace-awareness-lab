# Testing strategy

Jason Stys: risk-based validation, independent oracles and explicit coverage denominators.

Top risks are a false clear-airspace interpretation, inconsistent time/altitude comparisons, incorrect simultaneous overlap algebra, stale UI evidence, input execution, unbounded work and misleading security-tool success.

- Native unit tests: hand-derived horizontal/vertical intervals, tangency, stationary motion, disjoint windows, malformed tokens/nonfinite/negative/error/row limits.
- Actual-binary Python tests: 200 deterministic random pairs, 241 direct-inequality sample times each; swapping, translation and uncertainty-monotonicity invariants. Direct Euclidean inequalities are an independent sampled oracle, not a second copy of the quadratic solver. Samples alone cannot prove very narrow intervals absent; hand-derived boundary cases supplement them.
- Report/zone cases: unordered/duplicate/contradictory records, future time, freshness exact boundary, age alignment, unassessed tracks, datum mismatch, expanded error, activation clipping, expired zones, stale source and zone-to-zone filtering; zero objects/zero horizon/full80-state boundary.
- Boundary failures: real native CLI oversized stdin; process timeout/missing/nonzero; malformed/out-of-range/duplicate result. Failure-path mocks are isolated boundary tests; production numerical correctness always calls the executable.
- HTTP security: rebinding Host, cross-origin/form/preflight, oversize/slow body, privacy-preserving422, busy429, worker503, readiness/build failures, path traversal, security headers.
- TypeScript: presentation helpers100% lines/branches/functions/statements. This denominator deliberately excludes main DOM wiring, which is tested with actual-service browsers rather than claiming all UI code100% covered.
- Browser: Chromium/Firefox/WebKit and mobile WebKit against the built UI/Python/Rust stack; replay, slider, export, input invalidation, schema/error state, reset, empty-data warning, WCAG2A/AA/2.1AA axe checks, mobile overflow and author/contact. No server mocks, retries or snapshot-only success.
- Static/dependency: strict TS, rustfmt/clippy warnings denied, Ruff/lint/format, Python/TypeScript CodeQL security-and-quality; pip-audit full Python hash lock and official checksum-pinned live OSV scan independently verified against every resolved npm identity. Rust has zero third-party crate dependencies. Fail closed on unavailable/incomplete audits.
- Reproducibility: Python3.12/3.14 Linux plus3.14 Windows/macOS; fixed Rust1.98.1 and Node24. No artifact/cache uploads. Navigation and complete file catalog rejected if stale. Gzip budgets cap shipped JS40KB/CSS12KB.

API package branch-aware coverage gate is90%. The CLI launcher is included and its parsing/loopback arguments are unit-tested; the main-guard invocation is exercised during real browser startup but does not join the Python unit coverage session. Native line/branch coverage is **not measured**; native cases/oracle invariants are reported as evidence without inventing a percentage. Performance includes30 actual full80-state/3160-overlap process launches and IPC, gated only against the3s timeout; measured timing is not a hard-real-time or flight-safety guarantee.

Run README commands from the repository root in the activated environment. `python tools/docs_index.py` refreshes navigation after authored changes; `--check` in CI never silently rewrites it. See VALIDATION.md for actual measured results and commit-linked Actions evidence.
