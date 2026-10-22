# Help and operations

Jason Stys: reproducible local use, interpretation, troubleshooting and recovery.

1. Follow README prerequisites/build commands. Start `python -m awareness --port 8871`; keep this process running. Open `http://127.0.0.1:8871/` locally. It never binds an external interface.
2. The original example has a training drone, simulated traffic, a stale observation, an unknown altitude reference and a timed training zone. All are fictional and geographically unlocated.
3. Change horizon or horizontal margin, then select **Analyze replay**. Changing inputs invalidates previous evidence/export immediately. A revision guard prevents an in-flight older analysis from replacing newer edits.
4. Move the time slider to inspect linear projected paths; stale tracks remain frozen. Review quality below the plot and exact overlap windows in the table. Horizon0 assesses the current snapshot only. A zero-width alert is a boundary/tangent instant, not an error.
5. Edit the JSON to model synthetic report ordering, freshness, errors, altitude datums or zone timing. The horizon/margin controls override those two JSON fields when analyzing; all other fields come from the editor. This behavior is intentional and visible through the exported input.
6. Open **How to use this lab** for interpretation help. Export current evidence as a local JSON download. It contains the submitted synthetic input and computed result; protect/delete it yourself if you add anything confidential. No server-side account/history exists.

The plot shows traffic/error/path context, not a geographic map or legally authoritative zone chart. Timed zone overlap appears in the table. Consult official sources for any real operation. No alert does not imply clear airspace. The tool cannot interpret weather, terrain, pilot intent, sudden maneuvers, feed spoofing or missing objects.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `cargo` unavailable | Install official Rust and the platform linker; ensure PATH is set. Repository pins1.98.1. Do not change Docker. |
| Native503 / no assessment | `cargo build --release --locked`; confirm release binary exists and passes native tests. Never rename an arbitrary downloaded executable into place. |
| UI503 | `npm ci --ignore-scripts --no-audit` and `npm run build`; no Vite development server is required. |
| Port already used | Choose another1024–65535 port, open that same loopback address. Do not terminate unrelated services. |
| JSON422 | Read field/type information; fix unknown fields, nonfinite values, label characters, duplicate contradictions and time/datum assumptions. |
| Busy429 | Wait for the other local analyses; no queued unbounded work or hidden cloud fallback. |
| Sluggish native launch | OS antivirus/process-startup overhead can dominate; benchmark on your machine. No hard-real-time guarantee. |
| Browser audit needs binaries | Install Playwright's official Chromium/Firefox/WebKit builds; on Linux use `--with-deps` if necessary. |
| Advisory audit unavailable | Retry later; unavailable OSV/pip advisory databases are failures, not a clean scan. Never suppress findings to make CI green. |

## Stop, upgrade and rollback

Stop your own foreground process with Ctrl+C. No server database/account migration, scheduler, registry modification or automatic cleanup exists. Keep explicit exports outside Git if needed. Upgrade by reviewing source/locks, rerunning all gates and rebuilding. Roll back to a known reviewed Git commit and rebuild native/UI assets together; don't mix incompatible binaries/protocols. The app is not signed, packaged or automatically updated. Downloading public source does not imply platform safety certification.
