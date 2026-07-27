# Live Development Progress

**Last updated:** 2026-07-27
**Current overall completion:** **49%** of the active 10-phase development plan.

This file is the live scoreboard. Update it whenever a benchmark lands, scope is
added, or a task changes state. `CURRENT_STATE.md` explains the project in detail;
this file answers "where are we right now?" at a glance.

## Active plan scoreboard

| Phase | Weight | Status | Completion | Current benchmark |
|---|---:|---|---:|---|
| 0. Verified baseline | 5% | Blocked | 40% | Source inspected; dependency install unavailable in current container |
| 1. Launch and verification workflow | 5% | Complete | 100% | Local, live-LAN, production-LAN launchers plus `npm run verify` and build IDs |
| 2. Developer sandbox framework | 10% | Complete | 100% | Scenario presets, controls, metrics, selected-order readout, and world overlays implemented |
| 3. War-table camera | 15% | In progress | 62% | Real-terrain cursor anchoring and terrain-height focus added to pan/orbit/zoom foundation |
| 4. Selection and command reliability | 10% | In progress | 58% | Tested overlap priority plus move, gather, rally, attack, and invalid feedback |
| 5. Debug overlay and observability | 10% | In progress | 68% | Metrics plus toggleable selected-unit order lines and footprint/radius overlays |
| 6. Visual asset foundation | 15% | In progress | 22% | First-party concept archive plus a polished public development landing page are now in-repo |
| 7. LOD and performance architecture | 10% | In progress | 35% | Repeatable 200-unit harness, per-tier URL overrides, frame percentiles, and JSON report export implemented |
| 8. World presentation | 10% | Planned | 0% | Contested ground and resource presentation queued |
| 9. Core gameplay expansion | 5% | Planned | 3% | Tutorial and staged LAN/network play added to future scope |
| 10. Replay/save validation | 5% | In progress | 96% | Live player-command capture, AI-aware playback, endpoint hashes, export/verify/import, and director policy foundation |

Weighted overall: approximately **49%**.

## Most recent completed benchmarks

- [x] Repository unpacked and architecture audited.
- [x] One-button Windows play launcher.
- [x] One-button LAN build-sharing launcher and LAN package scripts.
- [x] One-button Windows test and production-build launchers.
- [x] Unified `npm run verify` workflow.
- [x] Developer sandbox entry point using `?dev=<mode>`.
- [x] Sandbox pause/resume, one-tick step, simulation speed, and basic spawning.
- [x] War-table camera iteration one: pure math module, camera-relative pan, middle-mouse orbit, smooth zoom, and bounds.
- [x] Cursor-anchored zoom over the battlefield ground plane.
- [x] World-space move, gather, and rally command confirmation markers.
- [x] Camera math test suite authored (execution pending dependencies).
- [x] New design notes captured as decisions/backlog rather than left in chat.
- [x] Complete supplied CodePen set captured in the permanent art-reference log, with intended use and the bloom-only caveat recorded.
- [x] Eleven first-party concept images archived, interpreted, and integrated into the GitHub README/gallery.
- [x] One-page public development site added at `/development.html`, including a browser-play CTA and automatic progress synchronization from this file.
- [x] Permanent agent reasoning and work-quality protocol added, with structured analysis, honesty, verification, and documentation requirements.
- [x] Expanded sandbox diagnostics: scenario presets, FPS, draw calls, triangles, entity totals, camera state, and selected-unit order readout.
- [x] Camera-safe box selection with reusable rectangle math, depth visibility rejection, and dedicated tests.
- [x] Overlap-aware click-picking priority with dedicated policy tests.
- [x] Attack and invalid-order acknowledgement added to the existing command marker system.
- [x] Camera focus and cursor zoom now follow the real terrain mesh rather than a flat plane.
- [x] Toggleable developer order-line and selected-radius world overlays.
- [x] Visible generated build identifier for LAN/web tester bug reports.
- [x] Optimized production LAN build-and-preview launcher.
- [x] Repeatable performance harness with quality-tier URL overrides, p50/p95 frame timing, and portable JSON report export.
- [x] Versioned deterministic save files with browser quick-save/load, JSON import/export, map compatibility checks, and state-hash validation.
- [x] Pure cinematic replay-director policy with event ranking, shot/cut safeguards, manual override protection, and dedicated tests.
- [x] Live human commands routed through a single recording gateway without losing UI command results.
- [x] Replay format v3 records AI match setup, endpoint tick, and optional final state hash.
- [x] Sandbox replay export, exact re-simulation verification, and verified endpoint import/playback.

## Current work

1. Build the interactive replay viewer with timeline controls and periodic keyframes.
2. Connect replay-observed events to the cinematic director and add smooth framing after playback mode exists.
3. Validate camera, selection, saves, diagnostics, and production LAN flow in a real browser once dependencies are available.
4. Begin the visual asset foundation with shared faction material conventions.
5. Collect real-machine benchmark reports and start contested-ground experiments.

## Environment blocker

The uploaded ZIP does not contain `node_modules`. Package installation is not
completing in the current execution environment, so typecheck/lint/test/build
cannot yet be independently certified here. This is logged as an environment
blocker, not a source-code failure. The launchers install dependencies on the
user's Windows machine when needed.

## Strategic platform direction

Longbarrow is now formally planned as the proving ground for an open,
browser-first RTS engine and creator ecosystem. The platform track includes
content-defined factions, units, resources, lore, balance, scenarios, custom
landing pages, validation, templates, and eventual creator tools.

This does **not** change the current 49% game-production score. It is tracked as a
long-term platform track whose architectural rules apply now, while extraction and
creator tooling follow only after Longbarrow proves the systems in real play.
See `ENGINE_VISION.md`.
