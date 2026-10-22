# Validation report

Jason Stys: measured local/CI evidence, corrections and storage observations. Results will be recorded after execution; no unexecuted check is a pass.

## Initial storage check

2026-10-21T20:12:58-07:00: 98 repositories, 62,959,952 live Actions artifact bytes (~63.0MB decimal), private-repository artifact bytes0, separate caches8,185,324,614 bytes (~8.19GB). Account quota percentage was unavailable, not0%. Nothing deleted. This repository's workflows intentionally upload no Actions artifacts/caches.

## Local measured results — 2026-10-21

Environment: Windows11 build26300, Python3.14.6, Rust1.98.1, Node24.18.1. Actual release-mode Rust executable used by the Python/API/browser suites. No Docker changes or external traffic feeds.

| Check | Observed result |
| --- | --- |
| Rust | `cargo test --locked`: 2 native test groups pass, including hand-derived intervals and malformed/nonfinite/bounded-input cases. rustfmt and clippy warnings-denied pass. No third-party crate dependencies. Native line coverage not measured. |
| Python | 71 tests pass, including actual native oracle/API cases and15 independent OSV policy cases. Branch-aware package coverage99.25% (202 statements +64 branches; only launcher main-guard path not hit in unit coverage). 90% gate unchanged. |
| Numerical oracle | 200 seeded pairs ×241 sampled times =48,200 independent direct-inequality comparisons; swap/translation/expanded-margin invariants and analytical boundary cases also pass. Sampling is not a proof about all continuous times. |
| TypeScript | 10 tests; helpers100% statements/branches/functions/lines (5 statements,6 branches,5 functions,5 lines). Strict TS production build passes. DOM wiring is not part of this helper-coverage denominator. |
| Browser | 12 actual-service journeys pass: Chromium, Firefox, WebKit and mobile WebKit,3 journeys each. WCAG2A/AA/2.1AA axe checks pass; no horizontal overflow in the tested layouts. No retries or fabricated native responses. Race cases pause requests then forward them to the real service. |
| Performance | 30 full80-state/3160-overlap native process launches: median22.782ms, maximum27.422ms including IPC/Python result validation. All below3s timeout; machine-specific measurement, not hard-real-time assurance. |
| Payload | Production JS4248gzip bytes (budget40000), CSS1353gzip bytes (budget12000). No fonts, maps, analytics or third-party runtime requests. |
| Security/dependencies | Live OSV-Scannerv2.7.0:81/81 locked npm identities scanned,0 findings; full Python development hash-lock pip-audit:0 known vulnerabilities. Findings/unavailable/incomplete scans fail closed; no advisory suppressions. |
| Repository quality | Ruff lint/format, Prettier check, exact AST/lexical source map, complete file catalog, pinned workflow refs and source-hygiene checks pass. |

A Starlette test-client deprecation warning recommends its future httpx2 interface. Current pinned httpx/TestClient compatibility works and all tests pass; warning is visible and not suppressed. This is test tooling, not an application error or a skipped check.

## Corrections made during validation

- An initially ambiguous browser selector matched both the HTML output element's implicit status role and the analysis status paragraph. The test now targets the exact analysis message; all checks rerun, with no retries.
- Browser sequencing exposed stale completion messaging while new work was running. The UI now explicitly enters loading/analyzing states, disables competing actions, invalidates previous exports immediately, and rejects stale request revisions. Four-browser regressions prove neither an old analysis nor a late example response can restore obsolete evidence or overwrite edits.
- Lint findings in synthetic test fixtures were corrected; narrow annotations explain deliberately rejected bind-address text and deterministic noncryptographic mathematical randomness. No application security warning or advisory is suppressed.
- Final correctness review changed omitted altitude references to UNKNOWN rather than silently assuming MSL, for both observations and zones. Separate regressions verify unassessed/incomparable results. Invalid UTF-8 native input also fails explicitly.

## Hosted verification

Initial source commit `0a0923d5ef4ae71b0b51505b9a2695649bd6adaf`: all four core OS/Python jobs passed, as did both CodeQL security-and-quality languages with0 open alerts. [Initial Validation](https://github.com/JasonStys/drone-airspace-awareness-lab/actions/runs/39718230499) correctly failed the browser job because its test launcher assumed `.venv/bin/python`, whereas Actions setup-python installed globally. This was repository test-harness configuration, not an application or GitHub platform failure. The launcher now chooses the actual local venv when present, otherwise the configured Python on PATH; an explicit PYTHON override remains supported. No retries, skipped browsers or lowered assertions were used.

Final-head hosted evidence will be recorded after the corrected workflow completes. The workflows validate four OS/Python combinations and actual-service browser journeys; CodeQL separately covers Python/TypeScript security-and-quality, not native Rust.

This educational lab is not production/flight certified; numerical/property/browser checks do not establish operational suitability.
