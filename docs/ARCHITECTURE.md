# Architecture and decision record

Jason Stys: requirements, bounded data flow, calculation assumptions and trade-offs.

## Requirements and flow

`Synthetic replay → closed Pydantic schema → newest/fresh reports → aligned SI state → fixed Rust subprocess → overlap intervals → altitude/time filtering → JSON evidence → safe DOM/SVG rendering`.

No database is necessary: an analysis is stateless and deterministic. Input/export stays in browser memory unless a user explicitly saves the JSON download. The service does not persist uploads, call an external provider or infer identity.

Maximums: 256 reports, 64 unique tracks, 16 zones, 80 native states, 3,160 pair comparisons, 120 seconds, 256 KiB HTTP body, 64 KiB native stdin, 256,000 characters native output. The kernel timeout is three seconds; at most two analyses execute concurrently per process. Input positions ±100 km, speeds ±300 m/s and errors are bounded. This is a local small-scenario instrument, not a distributed traffic-control service.

## ADR-001 — Rust kernel, Python service, TypeScript presentation

**Context:** demonstrate distinct strengths without embedding every language or depending on an opaque flight library. A malformed replay must not execute code or fetch a URL.

**Decision:** use dependency-free safe Rust for finite, bounded interval algebra; Python/Pydantic/FastAPI for replay contracts, report-quality rules and HTTP safety; TypeScript/HTML/CSS for accessible interactive views. Native data crosses a small whitespace-numeric stdin protocol, never shell commands. Native validates input independently and Python validates returned intervals/index uniqueness.

**Alternatives:** a pure-Python implementation is simpler but offers less native-boundary evidence; a Rust web framework adds dependencies without a demonstrated need; full geospatial/live surveillance infrastructure would require authoritative feeds, datum transforms, coverage models and substantial operational assurance outside this lab.

**Consequences:** users need a Rust linker/build chain once. Three-second process startup overhead is measured, not hidden. No third-party crate supply chain exists. UI cannot bypass server/native checks. CodeQL covers Python/TypeScript, not Rust; Rust uses forbidden unsafe code, clippy, native tests and cross-platform independent numerical tests.

## Mathematical contract

For each fresh report, align position with `p(as_of) = p(report) + velocity × age`. The projected model is `p(t) = p(as_of) + velocity × t`. Radius/half-height bounds include `position_error + velocity_error × (age + horizon)`. This assumes the supplied error values bound the true errors in this linear model; it does not estimate them or guarantee real-world containment. Holding the full-horizon bound constant deliberately overstates uncertainty at early times.

For each pair, solve `(dx+dvx*t)^2 + (dy+dvy*t)^2 ≤ (horizontal margin + both radii)^2` and `abs(dz+dvz*t) ≤ vertical margin + both half-heights`. Intersect their **closed** intervals and `[0,horizon]`. Stable quadratic roots reduce cancellation; equality/tangency is included. This is finite double-precision numerical math, not formally verified exact arithmetic. Near-floating-point-boundary robustness is tested with analytical cases; no flight-safety assurance follows.

Zones become stationary states with their radius and half altitude-band height; the same demonstration margins also expand zone awareness. Clip resulting windows to zone-active times. Skip zone-to-zone pairs and incomparable/UNKNOWN altitude references. Stale zone geometry can still yield an advisory but is explicitly flagged; absence of a hit from stale geometry cannot establish clearance. All AGL coordinates must share a flat synthetic terrain datum; no terrain model or MSL/AGL conversion is performed.

Report selection: newest timestamp independent of input order, exact duplicates counted, contradictory equal-timestamp records rejected. Stale tracks are frozen/displayed but excluded from calculation. Fresh UNKNOWN altitude is displayed/projected but unassessed. Missing traffic is unknowable; no output indicates complete coverage. Incomparable counts refer only to otherwise usable native-row pairs with at least one moving track; stale/UNKNOWN tracks are reported separately.

Complexity: report selection `O(R)` plus deterministic track sort `O(T log T)`; native comparisons `O((T+Z)^2)`; output `O((T+Z)^2)` worst case. UI rendering `O(T+A)`; no persistent or unbounded history. Future extensions should preserve these caps and require explicit decisions for data provenance, privacy and authorization.
