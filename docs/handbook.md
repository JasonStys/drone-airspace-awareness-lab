# Drone Airspace Awareness Lab handbook

By Jason Stys.

Review fictional drone routes against declared airspace, traffic and freshness constraints. Inspect conflicts and data-quality limits; the workbench does not supply authoritative airspace clearance or command aircraft.

Show pair/zone coverage ledgers with stale tracks, datum mismatch, unknown intervals and exclusion reasons.

Explains what an awareness result actually covers instead of implying empty or incomplete data means clear airspace.

## Read the documentation

| Edition | Audience and contents |
| --- | --- |
| [project-guide.docx](reports/project-guide.docx) | User and developer guide: purpose, current usage, design, boundaries and source references. |

The editable Markdown remains the maintenance source. The Word files are readable editions. See [publication identities and review](reports/publications.json) and the [documentation refresh record](reports/documentation-refresh-2026-11-09.md).

## Current usage and help

[README quick start](../README.md) is the entry point. Use the project-specific guides below before changing inputs, operating modes or deployment assumptions.

### Usage and operations

- [OPERATIONS](OPERATIONS.md)

### Design and contracts

- [API](API.md)
- [ARCHITECTURE](ARCHITECTURE.md)
- [RESEARCH](RESEARCH.md)

### Security and validation

- [SECURITY](SECURITY.md)
- [TESTING](TESTING.md)
- [VALIDATION](VALIDATION.md)

## Historical results and reproduction

The reviewed source is [`bff39487f0f1c018f52e12eca9eeacc3d07643d1`](https://github.com/JasonStys/drone-airspace-awareness-lab/tree/bff39487f0f1c018f52e12eca9eeacc3d07643d1). The observed functional workflow baseline is `bff39487f0f1c018f52e12eca9eeacc3d07643d1`; those observations are recorded at `2026-11-10T05:25:40.628667+00:00`. They do not certify an unrun later revision.

- [Detailed recorded validation](reports/PRACTICAL_WORKFLOWS_20261109.md)
- [Current Actions](https://github.com/JasonStys/drone-airspace-awareness-lab/actions) records later integration checks separately.
- Preserve dated measurements and follow the existing testing guide to reproduce them; a test-source inventory alone does not establish execution.

## Practical boundaries

- Fictional local-coordinate constant-velocity awareness, not flight permission, collision probability or avoidance control.
- Freshness is evaluated at the supplied snapshot, not continuously across the projection.
- No declared pairs or modeled overlap does not prove clear airspace; undeclared objects and incompatible altitude references remain unknown.
- Source-first project with current package/service validation; no public native desktop application release is supplied.

## Maintaining these editions

Update the editable usage/design/test documents first. Rebuild and visually review every Word page and workbook tab before replacing an edition; verify the exact binary digests and evidence source in publications.json. Keep account data, logs with secrets, installed-app state and private test stores out of documentation. Source and release assets retain their existing security and licensing boundaries.
