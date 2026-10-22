# Threat model and privacy boundary

Jason Stys: local-only trust assumptions, defensive controls and remaining risks.

Assets: replay integrity, current evidence integrity, workstation execution boundary and any locally exported data. Trust only reviewed source, lockfiles and locally built binaries. Dependencies are installed during development; no package/API calls occur during analysis. OSV/pip-audit send package identities to public advisory services only when explicitly run as validation tooling.

| Threat | Control / verification |
| --- | --- |
| Shell/path/SSRF injection | No URL/file upload inputs; fixed binary path; stdin numbers; no shell; strict labels and closed finite schemas; native independent validation. |
| XSS / malicious replay text | All dynamic DOM/SVG text via textContent; no imported HTML; no inline JS/CSS; restrictive CSP; schema-label rejection. Constant HTML template only. |
| Drive-by local service abuse | Bind127.0.0.1; explicit Host whitelist; exact same-origin POST when Origin present; only JSON bodies; no CORS/preflight; no mutation/persistence/account endpoints. A missing Origin is allowed for local CLI clients. |
| Resource exhaustion | Byte/time/state/cardinality/output limits; two nonblocking native slots; visible429/503; native work caps. No claim of comprehensive protection against a malicious local administrator. |
| Data/credential exposure | No accounts/passwords/API keys, no persistent replay storage or analytics, no external scripts/fonts/maps/ads; no access logging in supported launcher; no-store/referrer/framing/permission headers. |
| Stale/partial feed or false assurance | Explicit age, unassessed/incomparable counts, stale-zone sources, modeled windows and permanent advisory/non-clearance statement; input changes clear old evidence. |
| Supply-chain compromise | Hash-locked Python/npm dependencies, fixed Rust compiler, zero external Rust crates, checksum-verified official OSV scanner, full audited package inventory, immutable Actions references and least privileges. |

There is no third-party ad network to block. CSP reduces injected external-content execution; it cannot remove browser extensions or malicious OS software. No service can promise absolute security or hide data from the owner/admin of the machine on which it runs. Do not submit confidential data on an untrusted workstation. Browser memory/downloads, OS crash dumps/page files, extensions and malicious local processes remain outside the app boundary.

Not a remote product: no TLS/login/tenant isolation, encrypted storage, audited feed/PKI or professional operational assurance. Do not expose via port forwarding, tunnels, reverse proxies or LAN binding. Mobile rendering is tested, not remote access support. Future hosting requires a separate threat model and authorization design. No vulnerability suppression, broad exception fallback or fabricated empty success is permitted.

Report issues privately following root SECURITY.md. CI security tools provide evidence, not absence-of-vulnerability guarantees. Native Rust is not covered by these CodeQL jobs; clippy, forbidden unsafe code, native protocol limits and independent numerical tests are the stated checks.
