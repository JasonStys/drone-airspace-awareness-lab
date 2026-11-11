# Desktop airspace application candidate — 10 November 2026

This is a **local uncommitted 0.2.0 candidate**, not a published release or hosted
CI pass. Its last committed baseline is
`2d06a67e0861ccf0616af07148d5eaca6dcd6dca`; package metadata deliberately records
`source_dirty: true`. That baseline does not identify the subsequent uncommitted
implementation. A clean committed build and hosted native validation must precede
publication.

## Useful application workflow

The executable is the project's actual editable advisory workbench, with its
Python API, built browser UI and dependency-free Rust kernel. A local analyst can
open a supported JSON replay, review or change horizon/margin controls and input,
analyze, move the projection slider, inspect declared-pair assessment limitations
and download the complete input and analysis. The prepared example is optional;
there is no separate demo executable. No live aircraft, feed, controller or flight
permission endpoint is introduced.

Imported files are strict UTF-8 JSON objects, bounded to 256 KiB. The actual API
validates the remaining schema, finite values and geometry. A rejected import
retains editor text but removes obsolete assessment/export state. File-read
revision checks prevent delayed older reads from replacing newer input. Each
native launch owns its ephemeral loopback socket and private in-memory control
token; exact Host, browser Origin and token are required for confirmed Quit.

## Observed validation

| Check | Observed result and denominator |
| --- | --- |
| Python | 140 tests passed on Python 3.14.10; 99.14% combined statement/branch coverage for `awareness`. The original 90% floor remains unchanged. Existing HTTPX TestClient deprecation warnings are retained. |
| TypeScript | 29 tests passed; original mathematics plus the new bounded label-layout module have 100% statements, branches, functions and lines. All four 100% gates remain unchanged; the denominator was broadened to include labels. |
| Rust | Formatting, Clippy with warnings denied, two tests and the locked release build passed. Kernel source and its independent component identity 0.1.0 are unchanged. |
| Production browser UI | All 32 journeys passed across Chromium, Firefox, WebKit and a mobile profile. These cover arbitrary file import, strict UTF-8/size/finite-value rejection, independently gated stale reads versus typed/newer-file changes, dense names, keyboard navigation, exact exports and accessibility. |
| Actual portable application | A fresh Windows ZIP was safely extracted into an unrelated directory and its actual executable passed nonce, runtime and Rust digest checks. Developer runtimes were removed from PATH; no source server or existing listener was reused. |
| Native UI and lifecycle | The compiled application passed the real file/configure/analyze/export workflows, populated Axe WCAG 2/2.1/2.2 AA checks and a 390-pixel layout. Cancelled Quit preserved the service; keyboard-confirmed Quit exited 0, closed output and left the service unreachable without forced cleanup. |
| Negative boundaries | Foreign Host, foreign Origin, wrong/missing control token, malformed Quit, unknown routes and unexpected report POST are rejected. Existing body, concurrency, calculation timeout and native protocol guards remain in force. Package tests reject stale declarations, older freeze runtimes, dirty CI builds and archive path/link aliases and escapes. |
| Bounded benchmark | Thirty runs over 80 report rows and 3,160 declared pairs passed the original budget: median 9.704 ms, maximum 21.104 ms, including process spawn, native parse/solve and Python protocol handling. This is a local synthetic measurement, not an operational latency promise. |
| Supply chain | The full locked Python development graph and all 81 resolved npm identities were audited live with no known findings on this date. The packaging dependency graph is hash-locked. |

The imported independent crossing fixture places one object at east 0 metres and
another at east 1,000 metres moving west at 10 m/s, both fresh at time 1,000 s
with compatible MSL altitude and zero error bounds. At a 100-metre horizontal
margin, the native modeled window must be exactly **90–110 seconds**. The UI
and full downloaded evidence contain that window. Moving the slider to 120 s
changes the approaching marker from SVG x=570 to x=246. Stale/unknown-reference
fixtures instead retain all three declared pairs as unassessed, rather than
converting missing information into clear-airspace claims.

## Label and layout corrections

Nearby names previously shared their anchor area. Labels now use actual measured
text boxes, non-overlapping bounded candidate positions, leader lines and marker
protection. Names that cannot fit are omitted from the picture and remain in an
accessible complete track key. A keyboard user can prioritize a name without
changing marker/path geometry, native analysis or exported JSON. Independent
rectangle/edge/corner/grid and dense 32-track tests verify those invariants.

The dense mobile case exposed a real 392-pixel document at a 390-pixel viewport.
Constraining the select width and panel intrinsic width fixed it; long names wrap
in the key. The desktop control bar also now has explicit panel spacing. No
native coordinate or mathematical change was used to make labels fit.

The first private native test expected an unknown JSON route to return 404 but
omitted its JSON Content-Type; the existing media-type guard correctly returned
415 first. The test now sends the intended complete request and independently
expects 404. That failed harness receipt is retained privately; it was not an
application defect or a waived negative check.

## Package identity and limits

The accepted local Windows ZIP SHA256 is
`f3fca5002e0b3525472bcd033cafefe44f8678895a0b79e7668c6ce320197246`.
Its actual bundled Rust SHA256 is
`d57998c2da1d93a5537ebe465276d7aea81ec2d7940e076586acd0050c1f9732`.
The current package was frozen with the isolated official Python 3.14.10 SDK;
its actual `python314.dll` reports 3.14.10 and matches the SDK DLL digest.
Metadata records this version and runtime startup verifies it before readiness.
The builder rejects older cached runtimes and prereleases. Earlier 3.14.6
functional candidates remain only private historical checkpoints.

Two current actual UI screenshots were individually reviewed at original
resolution. The new three-OS desktop workflow is source only in this local phase;
it has not yet run remotely. The original native/Rust/core/browser Validation
workflow is unchanged. No release, installer transaction, Desktop shortcut or
existing user profile was modified.

This remains an unsigned portable educational advisory application. Automated
acceptance used `--no-browser` and actual headless Chromium; normal OS browser
opening and Desktop launch are separate manual checks. Constant-velocity ENU
projections and worst-horizon bounds are not maneuver predictions, legal flight
authorization, complete airspace coverage, collision probabilities or live
avoidance. No account isolation, mobile installation or real operations claim is
made. The trusted local OS/browser can inspect active plaintext.
