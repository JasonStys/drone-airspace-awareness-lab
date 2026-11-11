# Installed Windows 0.2.0 validation

By Jason Stys. 11 November 2026.

These observations describe the independently downloaded, published **0.2.0** application built from `bd6ae7ed687290f03c73d8185427010167368785`. Earlier Office editions, failed-run evidence and releases remain unchanged.

## Purpose and practical improvements

Inspect supported supplied track and airspace evidence using the actual bundled Rust kernel and full browser UI. Coverage, freshness, altitude-reference and observation limits remain explicit; no flight clearance or live surveillance is implied.

Show pair/zone coverage ledgers with stale tracks, datum mismatch, unknown intervals and exclusion reasons. Explains what an awareness result actually covers instead of implying empty or incomplete data means clear airspace.

## Observed validation

**Real native workflows: Passed.** The unchanged full installed-app consumer passed actual file import, original engine/results, role boundaries where applicable, exports, negative cases and normal owner Quit.

**Source and security: Passed.** All required main workflows for the runtime revision passed; processed CodeQL analyses reported zero open main alerts before release.

**Distribution identity: Verified.** All 2 assets matched provider/checksum identities; all 117 installed files remained unchanged during acceptance.

**PC scope: Verified.** New per-user version folder and individual links verified. Synthetic inputs and isolated outputs only; existing data and Docker were not used or changed.

## Illustrated use and implementation

The [four-page guide](windows-application-guide-0.2.0.docx) contains two actual installed-app screenshots, a worked user journey, an immutable source-code excerpt and operating limits. The [review manifest](windows-application-guide-0.2.0.json) binds exact Word, image, source and individually inspected page identities. Prepared cases are inputs inside the actual application, never separate demonstration apps.

## Installation and limits

Keep the complete extracted ZIP together and launch AirspaceAwarenessStudio.exe. No system runtime or terminal setup is needed.

Open the verified Desktop icon. Save the original supported replay JSON and Export evidence before quitting; reopening resets in-memory state. The evidence export contains author, input and analysis, rather than a directly importable replay. Retain the original replay or extract its input object to reimport.

Synthetic local-frame advisory calculation; no live traffic, verified airspace clearance, remote feed, aircraft control or flight authorization.

Tests used synthetic offline inputs and isolated outputs. No aircraft, emergency dispatch or production data was accessed. This viewer keeps its active review in memory; save files explicitly before quitting.

Individual shortcut targets were read-back verified. Actual installed-executable acceptance is separate from ordinary default-profile shortcut activation, which was not independently exercised. Only synthetic inputs and isolated outputs were used; normal user data and Docker were not opened or changed. This documentation commit requires its own original hosted checks and processed security analyses; prior runtime evidence does not certify later source changes.
