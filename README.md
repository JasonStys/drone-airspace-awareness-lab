# Drone Airspace Awareness Lab

Jason Stys: a **synthetic, advisory-only traffic-awareness workbench** that makes missing data and uncertainty visible instead of treating a quiet display as clear airspace.

The **declared-pair assessment coverage** inspector explains every supplied
track/track and track/zone pair, including observations excluded from native
geometry because they are stale or lack an altitude reference. Select a declared
track to inspect exact reasons, datum mismatches, inactive zone windows, modeled
overlap intervals and stale source warnings. Observation timestamps, inclusive
freshness boundaries, exact duplicates and older superseded observations are
reported separately. The complete ledger accompanies the existing JSON export;
editing input clears the old display and disables obsolete exports.

Freshness is assessed at the supplied snapshot, not continuously throughout the
projection. No declared pairs, no modeled overlap, or a quiet display never proves
clear airspace. The existing Rust geometry, bounds and advisory-only rules are
unchanged. See [workflow validation](docs/reports/PRACTICAL_WORKFLOWS_20261109.md).

[Validation](https://github.com/JasonStys/drone-airspace-awareness-lab/actions/workflows/validate.yml) · [CodeQL](https://github.com/JasonStys/drone-airspace-awareness-lab/actions/workflows/codeql.yml) · [Architecture](docs/ARCHITECTURE.md) · [Help](docs/OPERATIONS.md) · [Measured evidence](docs/VALIDATION.md)

## What it demonstrates

The lab takes bounded synthetic observations in a local east/north/up frame, selects the newest report for each track, aligns fresh observations to the analysis time, and calculates **time windows where horizontal and vertical awareness volumes overlap simultaneously**. A crossing on a 2D plot alone is not an alert: time and altitude must also overlap. Position/velocity error bounds conservatively enlarge the volumes. Timed cylindrical zones provide additional context.

The responsive website provides an editable replay, horizon/margin controls, a projected-path slider, observation-quality explanations, an exact overlap-window table, local JSON evidence export, and inline help. It runs as a local browser application on Windows, Linux and macOS; mobile layouts are browser-tested, but this is not a packaged mobile/native app.

### Major features

| Feature | What the code actually does |
| --- | --- |
| Rust calculation kernel | Dependency-free analytical quadratic/linear interval intersection; strict finite input/byte/row limits; no unsafe Rust or command execution. |
| Report quality | Unordered reports accepted; newest timestamp wins; exact duplicates counted; contradictory duplicates/future observations rejected; stale/unknown tracks explicitly unassessed. |
| Altitude consistency | MSL and AGL are not compared. UNKNOWN altitude is unassessed. All coordinates must share the same synthetic origin and terrain datum. |
| Uncertainty | Position bounds plus velocity-error × (report age + horizon), held constant for the whole prediction window. Conservative bounds, **not collision probabilities**. |
| Zone context | Synthetic cylinders, altitude bands, active time windows, source age and provenance documented in the replay contract; stale-source warnings retained. |
| Private by design | No login, data collection, upload storage, analytics, third-party scripts or outbound runtime requests. Loopback-only service with Host/origin/body/concurrency limits and restrictive CSP. |
| Evidence | Native unit cases, independent seeded numerical oracle, invariants, real HTTP/browser tests, dependency audits, source navigation and bounded-work timing. |

## Start locally

A **0.2.0 desktop application candidate** now includes the real Rust kernel and
complete editable GUI, bounded JSON file import, readable leader-line labels with
a keyboard track key, local exports and an owned **Quit application** control.
This is source for an unpublished portable candidate; no new download is claimed
until the clean source and cross-platform package checks are accepted. See
[desktop use, build steps and limits](docs/DESKTOP.md).

Prerequisites: Python 3.12–3.14, Node.js 24, Rust **1.98.1** with rustfmt/clippy, and the platform Rust linker toolchain (Visual Studio C++ Build Tools on Windows, Xcode command-line tools on macOS, GCC/Clang build tools on Linux). Download tools only from their official vendors. This repository does not install or change system software automatically.

```text
python -m venv .venv
```

Activate `.venv` using your platform's normal activation command, then:

```text
python -m pip install --require-hashes -r requirements-dev.lock
npm ci --ignore-scripts --no-audit
cargo build --release --locked
npm run build
python -m awareness --port 8871
```

Open **http://127.0.0.1:8871/**. The synthetic example analyzes automatically through the real Rust executable. No API keys or account setup are required. `npm --no-audit` avoids the unreliable install-time audit endpoint; the separate required **live OSV audit** below still checks the full locked dependency inventory with zero advisory suppressions.

## Validate

```text
cargo fmt --check
cargo clippy --all-targets --locked -- -D warnings
cargo test --locked
python -m ruff check awareness tests tools
python -m ruff format --check awareness tests tools
python -m pytest --cov=awareness --cov-report=term-missing
npm run format:check
npm test
npm run build
python tools/docs_index.py --check
python tools/check_repo.py
python -m tools.benchmark
python -m pip_audit --disable-pip --no-deps -r requirements-dev.lock
python tools/audit_osv.py
npx playwright install chromium firefox webkit
npm run test:e2e
```

Python HTTP tests require the built UI and native release binary. Linux browser installation may require `--with-deps`. CI runs four OS/Python combinations plus actual-service Chromium/Firefox/WebKit/mobile journeys and separate Python/TypeScript CodeQL jobs. Workflows do not upload Actions artifacts or caches. Complete commands, test denominators and evidence are in [Testing](docs/TESTING.md) and [Validation](docs/VALIDATION.md).

## Scope matters

This is **not** ADS-B reception, an official airspace/NOTAM/TFR source, LAANC authorization, a certified detect-and-avoid system, a collision predictor, aircraft control, surveillance/identity lookup, or flight guidance. It cannot say airspace is safe or legal to fly in. It has no live feed, geographical map, aircraft command link, maneuver generation or operational deployment mode. Synthetic margins are demonstration settings, not regulatory separation standards. Real traffic may be absent, inaccurate or maneuvering; the linear model cannot infer that.

FAA guidance describes surveillance limitations and the advisory nature of cockpit traffic information. Consult official sources, qualified operators and applicable rules separately: [FAA surveillance systems](https://www.faa.gov/air_traffic/publications/aim_html/chap4_section_5.html), [airspace restrictions](https://www.faa.gov/uas/getting_started/where_can_i_fly/airspace_restrictions). No FAA or employer affiliation is claimed.

## Repository guide

- `native/main.rs`: bounded mathematical kernel and native unit cases.
- `awareness/`: closed replay schemas, report alignment, fixed-process bridge, private local API and launcher.
- `ui/`: accessible TypeScript/HTML/CSS interface and independently tested presentation math.
- `examples/`: original synthetic mixed-quality exercise; no real people or aircraft.
- `tests/`: independent numerical/contract/security tests and real-service browser acceptance.
- `tools/`: complete lockfile audit, source/file navigation, source hygiene and measured performance.
- `.github/workflows/`: pinned, least-privilege validation and security workflows.
- `docs/`: requirements, architecture/ADR, research, API, help, threat model, testing and measured results.

Every file has a responsibility summary in the [file catalog](docs/FILE_CATALOG.md). Source headers link to the generated [exact declaration/variable line map](docs/SOURCE_MAP.md), avoiding stale hand-maintained line numbers. Function/class headers explain their responsibilities.

Created by **Jason Stys** · [GitHub / contact](https://github.com/JasonStys) · [LinkedIn](https://www.linkedin.com/in/jason-stys-31b30b351/). MIT-licensed original source; third-party tools/dependencies retain their own licenses.

## Documentation editions

Start with the [organized handbook](docs/handbook.md) for current usage, design, security and test guidance. Reviewed downloadable editions: [project-guide.docx](docs/reports/project-guide.docx).

[Publication identities and source scope](docs/reports/publications.json) · [Documentation validation record](docs/reports/documentation-refresh-2026-11-09.md). Historical results retain their own tested revision and date.


## Current installed application guide

The published **0.2.0** application has a [four-page illustrated guide](docs/reports/windows-application-guide-0.2.0.docx) with actual installed screenshots, a practical journey, source excerpts and operating limits. Read its [installed validation report](docs/reports/installed-windows-0.2.0-2026-11-11.md) and [review manifest](docs/reports/windows-application-guide-0.2.0.json) for the exact runtime source and scope. Historical documentation remains available.

New documentation:

- [docs/reports/windows-application-guide-0.2.0.docx](docs/reports/windows-application-guide-0.2.0.docx): Current four-page installed application guide with two actual screenshots, immutable source and operating limits.
- [docs/reports/windows-application-guide-0.2.0.json](docs/reports/windows-application-guide-0.2.0.json): Exact Word, installed screenshot, immutable code and individually reviewed page identities.
- [docs/reports/installed-windows-0.2.0-2026-11-11.md](docs/reports/installed-windows-0.2.0-2026-11-11.md): Observed installed workflows, distribution identity, practical instructions and precise validation limits.
