# Roadmap

Phase structure comes from `GAME_DESIGN.md § 10.2`. This file tracks *progress
against it*; the design doc holds the rationale.

Version history lives in `CHANGELOG.md`. Active work is in `TODO.md`.

---

## ✅ Phase 0 — Tech Spike

Prove the stack: one unit, low-poly terrain, RTS camera, selection.
No combat, economy or AI.

**Done** — v0.

---

## ✅ Phase 1 — Single Race Core Loop (Cohort) — COMPLETE

Cohort first: its linear, forgiving economy is the simplest proving ground for
core systems before asymmetry is layered on.

| Step | What | Status |
|---|---|---|
| 1.1 | Project structure | ✅ v1.1 |
| 1.2 | Fixed-tick simulation | ✅ v1.2 |
| 1.3 | Terrain & high ground | ✅ v1.3 |
| 1.4 | Resource nodes & worker gather loop | ✅ v1.4 |
| 1.5 | Command supply, production, outposts | ✅ v1.5 |
| 1.6 | Queue & walk construction | ✅ v1.6 |
| 1.7 | Squads & behaviour chains | ✅ v1.7 |
| 1.8 | Core units — Legionnaire shield-wall, Marksman setup | ✅ v1.8 |
| 1.9 | Squad cohesion penalty | ✅ |
| 1.10 | Positioning-driven combat resolution | ✅ |
| 1.11 | Simple AI opponent | ✅ |
| 1.12 | Base-destruction win condition | ✅ |

**Also in Phase 1, added after the original plan:**

| | What | Status |
|---|---|---|
| — | Painterly art pass (D-005) | ◐ in flight |
| — | War table camera (D-014) | ⬜ deferred, precedes remaining art |
| — | Day/night cycle (D-013) | ✅ |
| — | Snapshot/restore/hash (D-010) | ✅ |
| — | Tick rate 20 → 30 Hz (D-004) | ✅ |
| — | Dev console | ⬜ |
| — | Replay system (D-008) | ◐ live capture/export/verification complete; timeline viewer and keyframes next |
| — | Save/load files | ◐ versioned developer quick-save/import/export complete |

**Out of scope for Phase 1:** heroes, tech tree, PvE bosses, air units, the
other three races, multiplayer, audio.

---

## ⬜ Phase 2 — Prove Asymmetry (Mycora)

Add Mycora. Its economy — Grow construction, swarm-tap gathering, spread-gated
tech — is the furthest from Cohort's, making it the best test of whether "same
problem, different answer" produces genuinely different play rather than
different stats.

Phase 1 is complete; this is now the next major phase. Design gaps to resolve first: Mycora naming pass,
contested ground-cover effect.

---

## ⬜ Phase 3 — Remaining Races, Heroes, Tech Trees

Conclave and Titanfolk, plus hero archetypes and full tech branching, once the
core loop is validated.

Heroes primarily unlock **doctrine**, not active abilities — see `UI_BLUEPRINT.md`.
Stealth/detection must be designed before Conclave's Phantom (`GAME_DESIGN.md § 11.1`).

---

## ⬜ Phase 4 — PvE Bosses, Air Units, Multiplayer, Polish

| | Notes |
|---|---|
| 4.1 | PvE boss system |
| 4.2 | Air units — needs the supply-pool decision (`§ 11.1`) resolved first |
| 4.3 | LAN multiplayer first, then internet multiplayer — deterministic lockstep; depends on replay/hash verification |
| 4.4 | Audio/visual polish, balance tuning |

Balance numbers stay placeholders until 4.4 by design — systems are implemented
faithfully first, tuned last.

### Multiplayer staging

1. **LAN build sharing (available now):** one host serves the current client build
   to other browsers on the same network. Each browser still runs an independent
   match.
2. **LAN synchronized prototype:** direct host/join, two player slots, command
   exchange, fixed input delay, tick synchronization, and desync hashes.
3. **Resilience pass:** reconnect/disconnect policy, lobby UX, replay capture of
   network commands, and deterministic failure reproduction.
4. **Internet transport:** reuse the command protocol behind a relay/lobby service
   rather than redesigning simulation networking.

The LAN prototype should not begin until live replay recording and periodic hash
checks are routine development tools.

---

## The UI blueprint runs alongside, not after

`UI_BLUEPRINT.md` describes three command depths. Level 1 exists today. Level 2
(missions) and Level 3 (doctrine editor) are the substance of the game and
should grow through Phases 1–3 rather than being bolted on in Phase 4.

The one hard ordering constraint: **`Mission` must become a sim entity (D-007)
before any mission UI is built.**

## Recently completed infrastructure

- Live replay recording with AI-aware match setup, endpoint hash verification, JSON export, and verified endpoint import.
- Versioned deterministic save files with browser quick-save/load and portable JSON import/export.

- Production LAN build launcher and visible build identifiers for tester reports.
- Terrain-aware camera anchoring and developer world overlays.
- Repeatable performance sandbox with quality overrides and JSON benchmark reports.

---

## Long-term platform track — Open RTS Engine and Mod SDK

Longbarrow is intended to mature into a reusable, open, browser-first RTS engine.
This track begins architecturally now but is deliberately staged after the game
proves each system in production. See `ENGINE_VISION.md` for the full principles,
creator workflow, package concept, guardrails, and success criteria.

| Stage | Goal | Status |
|---|---|---|
| A | Keep Longbarrow systems engine-friendly and increasingly data-driven | ◐ ongoing |
| B | Extract Longbarrow factions and rules into validated content packs | ⬜ |
| C | Ship a second, minimal example RTS and starter template | ⬜ |
| D | Creator tools, schemas, editors, packaging, and export workflow | ⬜ |
| E | Community ecosystem, reusable extensions, and compatibility policy | ⬜ |

This platform track is not currently included in the 41% game-production score.
It is an ongoing post-foundation product track rather than a finite content phase.
Its architectural constraints apply immediately so the game does not become
needlessly difficult to generalize later.

## Replay presentation extension

- Cinematic replay director (optional): event observation, importance ranking, smooth camera framing, free/follow/event/director modes, and manual-override protection.
- This remains presentation-only; recorded commands and deterministic playback are the source of truth.
