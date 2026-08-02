# Live Development Progress

**Last updated:** 2026-07-27
**Current overall completion:** **90%** of the active 11-phase development plan.

This file is the live scoreboard. Update it whenever a benchmark lands, scope is
added, or a task changes state. `CURRENT_STATE.md` explains the project in detail;
this file answers "where are we right now?" at a glance.

## Active plan scoreboard

| Phase | Weight | Status | Completion | Current benchmark |
|---|---:|---|---:|---|
| 0. Verified baseline | 5% | Complete | 100% | `npm ci` and the complete verification workflow pass on v1.23.0 |
| 1. Launch and verification workflow | 5% | Complete | 100% | Local, live-LAN, production-LAN launchers plus `npm run verify` and build IDs |
| 2. Developer sandbox framework | 10% | Complete | 100% | Scenario presets, controls, metrics, selected-order readout, and world overlays implemented |
| 3. War-table camera | 15% | In progress | 97% | Whole-board framing plus adaptive near clipping across miniature and cosmological zoom |
| 4. Selection and command reliability | 10% | In progress | 96% | Direct attack-move, patrol, stop, and hold-position orders are replay-safe, polygon-safe, and exposed through hotkeys and selection cards |
| 5. Debug overlay and observability | 10% | Complete | 100% | In-game dev console with replay-recorded cheats, host-only pacing controls, and hashed dev-mode gating |
| 6. Visual asset foundation | 15% | In progress | 42% | Painterly materials now cover terrain, units, buildings, scenery, and nodes; concept-art gallery and war-table hero published |
| 7. LOD and performance architecture | 10% | In progress | 82% | Screen-consistent strategic markers, distance LOD, scenery culling, and persistent in-game quality selection |
| 8. World presentation | 10% | In progress | 95% | Fog of war rebuilt as a terrain-following sampled coverage texture: soft cell boundaries, soft polygon rim, one draw call |
| 9. Core gameplay expansion | 5% | In progress | 94% | Two-resource economy live as a data-driven registry, with self-rebalancing workers and research paid in both currencies |
| 10. Replay/save validation | 5% | In progress | 100% | Live player-command capture, AI-aware playback, endpoint hashes, export/verify/import, and director policy foundation |

Weighted overall: approximately **90%**.

## Most recent completed benchmarks

- [x] Two-resource economy (Material and Legacy) implemented as a resource registry in `src/data/` plus generic mechanics in `src/sim/`, so the engine never learns how many currencies exist; workers self-rebalance toward declared shares with no player input.

- [x] In-game developer console: cheats routed through `sim/dev.ts` into the replay stream, host-only pause/speed/tick/reveal kept out of it, and a hashed `devMode` flag so dev sessions replay correctly while a clean competitive result stays provable.
- [x] Fog of war softened (B-004): one terrain-following sheet sampling an R8 coverage texture with linear filtering and a two-band smoothstep, replacing ~2,300 instanced quads with a single draw call.
- [x] All four long-standing design blockers resolved and locked: two-resource economy, terrain concealment, map geometry as generation, and a single shared supply pool (D-031–D-035).
- [x] Engine-first content boundary now executable: `tests/architecture.test.ts` fails the build if `src/sim/` names any unit, race, resource, or tech, with a shrinking debt list. Caught four pre-existing leaks on its first run.
- [x] Research UI shipped, closing the gap where a complete tech system existed that no player could reach.
- [x] Replay-safe core RTS direct orders: attack-move, patrol, stop, and hold-position, with hotkeys, selection-card buttons, polygon clamping, and deterministic order-state hashing.
- [x] Optional guided tutorial mode with deterministic-state observation, seven-step onboarding, persistent completion state, and a permanent in-game launcher.
- [x] Full 3D fog-of-war enforcement with shared visibility policy, hidden-rival rendering/picking, resource memory, spectator/replay omniscience, and instanced terrain overlay.
- [x] Full `ROADMAP.md` publication on the development website, canonical documentation drift correction, and automated site-sync verification.
- [x] Polygon-aware fog-of-war foundation with persistent exploration, current visibility, hidden-enemy filtering, and map-seed load/new controls.
- [x] Polygon-aware tactical map with shared boundary mask, live entity markers, camera heading, and click/drag recentering.
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
- [x] Camera math test suite authored and executed as part of the complete 302-test verification run.
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
- [x] Single top-navigation **Play** button on the public site.
- [x] Keyboard-accessible full-screen concept-art lightbox.
- [x] Distant, smaller war-table hero composition with stronger black negative space.
- [x] Unrestricted tabletop camera envelope and off-table travel.
- [x] Pure-black world void and temporary descending terrain body.
- [x] Interactive replay timeline with start/end, 10-second skip, play/pause, scrub control, and lazy deterministic keyframes.
- [x] World Turtle far-zoom presentation locked as the replacement for the temporary terrain underside.
- [x] First camera-distance LOD policy implemented for units, buildings, scenery, and strategic world-view markers.
- [x] First far-zoom World Turtle silhouette blockout implemented with shell, head, limbs, and tail.
- [x] Strategic unit/building markers now scale gently with camera distance so the entire board remains readable at cosmological zoom.
- [x] Persistent in-game Low/Medium/High quality selector with safe full-renderer reload.
- [x] Adaptive perspective near clipping preserves miniature inspection while improving depth precision at world scale.
- [x] Deterministic rotationally symmetric polygon maps now replace the permanent square battlefield.
- [x] The canonical map boundary now drives terrain geometry, descending edges, scenery placement, construction validation, and whole-board framing.
- [x] Manual moves, formations, rallies, behaviour chains, unit production, and per-tick movement are clamped to navigable polygon space.
- [x] Starting bases, resource clusters, workers, and armies are derived from deterministic mirrored boundary anchors rather than fixed square-map coordinates.

## Current work

1. Validate attack-move, patrol, stop, and hold-position feel in a real browser, then refine direct-order feedback and tutorial coverage.
2. Validate and refine tutorial pacing in a real browser, then add scenario-specific tutorial setup and accessibility polish.
3. Refine 3D fog presentation with softer boundaries, terrain-memory styling, and performance profiling.
4. Connect replay-observed events to the cinematic director and add smooth framing after playback mode exists.
5. Manually validate camera, selection, saves, diagnostics, and production LAN flow in supported browsers.
6. Begin the visual asset foundation with shared faction material conventions.
7. Collect real-machine benchmark reports and start contested-ground experiments.

## Verification status

The v1.23.0 integration has been independently verified after a clean `npm ci`.
Site synchronization, site consistency, typecheck, lint, all 302 tests, and the
production Vite build pass. Manual cross-browser gameplay and real-machine
performance validation remain active work rather than environment blockers.

## Strategic platform direction

Greenmantle is now formally planned as the proving ground for an open,
browser-first RTS engine and creator ecosystem. The platform track includes
content-defined factions, units, resources, lore, balance, scenarios, custom
landing pages, validation, templates, and eventual creator tools.

This does **not** change the current 90% game-production score. It is tracked as a
long-term platform track whose architectural rules apply now, while extraction and
creator tooling follow only after Greenmantle proves the systems in real play.
See `ENGINE_VISION.md`.


### 2026-07-27 tabletop freedom and website usability
- Public site uses one obvious top-navigation button labelled **Play**.
- Concept-art gallery supports full-screen click/keyboard viewing.
- Hero war-table artwork is smaller and visually farther back in black negative space.
- Camera envelope supports miniature-level inspection, near-overhead overview, full orbit, and travel beyond the authored terrain.
- World backdrop is pure black and the terrain has temporary descending table edges pending the later support-world concept.

### 2026-07-27 replay timeline and World Turtle direction
- Replay viewer now supports deterministic seeking, lazy 10-second keyframes, timeline scrubbing, play/pause, and coarse navigation.
- Far-zoom world presentation is locked to a monumental World Turtle silhouette; temporary terrain skirts remain until production geometry and LOD are built.


### 2026-07-27 whole-board visibility and polygon-map direction
- Removed global distance fog so maximum zoom never erases the battlefield.
- Extended the perspective far plane to 10,000 and camera overview limit to 520 world units.
- Added aspect-aware whole-board framing on the `Home` key with pure math tests.
- Added the canonical deterministic procedural polygon-map plan in `MAP_GENERATION.md`.
- Required versioned names for extracted work folders and release archives.

### 2026-07-27 zoom-aware rendering and first World Turtle blockout
- Added a pure, quality-aware LOD policy with dedicated tests.
- Close/tactical views retain full units and buildings; strategic/world views switch to readable low-cost markers.
- Distant scenery is culled automatically.
- The anonymous slab is replaced at cosmological zoom by a first silhouette-only World Turtle support model.
- Advanced the game-production score to 62% and version to v1.15.0.

### 2026-07-27 strategic-view readability and quality controls
- Added distance-aware strategic marker scaling so units and structures remain legible across the full tabletop zoom range.
- Added a persistent Low/Medium/High renderer selector that reloads safely after changing tiers.
- Added adaptive near clipping for better depth precision without sacrificing close miniature inspection.
- Advanced the game-production score to 65% and version to v1.16.0.

### 2026-07-27 seeded polygon battlefield
- Added a deterministic 12-vertex, rotationally symmetric map boundary derived from the map seed.
- Replaced the permanent square render surface with a polygon-clipped heightfield and matching descending perimeter skirt.
- Construction footprints and scenery generation now respect the same canonical boundary.
- Whole-board framing uses the generated polygon bounds.
- Advanced game production to 68% and version to v1.17.0.

### 2026-07-27 polygon-safe gameplay and seeded layouts
- Manual orders, formation offsets, rallies, automation chains, production exits, and per-tick movement now stay inside the canonical polygon.
- Bases, resource clusters, worker groups, and starting armies are derived from mirrored boundary anchors rather than fixed square-map coordinates.
- `MAP_VERSION` advanced to 3.
- The complete project passes site consistency, typecheck, lint, 302 tests, and the production Vite build after a clean dependency installation.
