# Desktop advisory application

The 0.2.0 application candidate packages this project's complete local browser UI,
Python runtime and actual dependency-free Rust kernel. It is the same editable
synthetic replay workbench, not a separate preset demo. The kernel's independent
component version remains 0.1.0 because its mathematics and protocol are unchanged.
No live feed, aircraft endpoint, controller, flight permission or avoidance maneuver
is added by packaging it.

## Use the application

Extract the complete archive into a fresh folder and open
`AirspaceAwarenessStudio` (`AirspaceAwarenessStudio.exe` on Windows). Keep its
internal files together. It owns a new loopback port and opens your normal browser.
Built packages need no system Python, Node, Rust, Docker, API key or account.

Choose **Load example**, **Open JSON file**, or edit/paste the existing replay JSON.
Files must be strict UTF-8 JSON objects no larger than 256 KiB. Import populates
the horizon and margin controls when supplied; review those controls before
**Analyze replay**. Import alone is not a schema-valid assessment. The actual API
still validates all fields, finite SI values, timestamps, caps and altitude rules.
When pasting manually, the visible horizon/margin controls remain authoritative.

Move the projection slider to see the original constant-velocity picture. Labels
use measured text boxes and leader lines rather than covering each other. A name
that cannot fit is omitted from the picture, not from the data. Open **Track key
and projected positions** to read every name and coordinate or prioritize a label.
This changes display only: marker/path coordinates, native overlap windows and
exports stay unchanged. The bounded layout considers at most 64 names and 24
candidate positions per name; its worst-case work is quadratic in track count.

Read observation quality and declared-pair coverage before interpreting a quiet
picture. Stale observations, unknown/incompatible altitude references and missing
zones do not prove clear airspace. The source snapshot, bounds and local synthetic
datum travel with **Export evidence**. No report or uploaded file is persisted by
the service. Downloads use your browser's ordinary download location.

Changing input immediately clears obsolete output and disables export. Rejected
file imports retain the prior editor text but leave no current assessment. Delayed
older file reads cannot overwrite a newer file or typed edit. Analyze again only
after reviewing the current input and controls.

Choose **Quit application** and confirm to stop this launch's local service.
Cancel leaves it running. You can also return to its console and press Ctrl+C;
closing only the browser tab does not stop it. Each launch has its own port and
ephemeral control token. The token moves from the initial fragment into memory,
is removed from the address, and is never included in exported evidence or browser
storage. Quit requires the exact bound authority, browser origin and token.

## Build and validate

Use final Python **3.14.10 or a later 3.14 security patch** for freezing. The
builder rejects older cached runtimes and prereleases. Runtime startup checks its
recorded Python version and actual bundled Rust SHA256 before announcing readiness.
Source development compatibility is separate from this packaging rule.

```text
python -m pip install --require-hashes -r requirements-dev.lock
python -m pip install --require-hashes -r requirements-package.lock
cargo build --release --locked
npm ci --ignore-scripts --no-audit
npm run build
npx playwright install chromium
python tools/package_app.py
```

The builder includes current license notices, creates one version/OS/architecture
archive, inspects every archive member, extracts into a new unrelated directory,
and uses the actual executable. Only after native/file/config/export/negative/UI
Quit acceptance succeeds does it write the SHA256 sidecar. Windows uses ZIP;
POSIX uses tar.gz to preserve relative links and execute modes. Existing evidence
destinations are never overwritten, and no command publishes or retargets a tag.

Hosted builds require clean exact checked-out source. Local developers may use
`--allow-dirty`, which explicitly labels an uncommitted candidate and is forbidden
in CI. Runtime/build output stays in ignored `.runtime/`. Source use through the
original `python -m awareness` CLI and its loopback API remains supported.

## Limits

This is an unsigned portable application, not a signed installer or a proven
install/upgrade/uninstall transaction. Automated native acceptance uses
`--no-browser` and actual headless Chromium. Normal OS browser opening and Desktop
shortcuts are separate manual checks. The trusted local OS and browser can inspect
active plaintext. No account isolation, mobile installation, live traffic, real
aircraft operations, legal authorization or collision-probability claim is made.
