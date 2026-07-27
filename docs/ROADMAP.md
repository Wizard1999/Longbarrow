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

## ◐ Phase 1 — Single Race Core Loop (Cohort)

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
| 1.9 | Squad cohesion penalty | ⬜ next |
| 1.10 | Positioning-driven combat resolution | ⬜ |
| 1.11 | Simple AI opponent | ⬜ *(started early — see D-009)* |
| 1.12 | Base-destruction win condition | ⬜ |

**Also in Phase 1, added after the original plan:**

| | What | Status |
|---|---|---|
| — | Painterly art pass (D-005) | ◐ in flight |
| — | Tick rate 20 → 30 Hz (D-004) | ✅ |
| — | Dev console | ⬜ |
| — | Replay system (D-008) | ⬜ |

**Out of scope for Phase 1:** heroes, tech tree, PvE bosses, air units, the
other three races, multiplayer, audio.

---

## ⬜ Phase 2 — Prove Asymmetry (Mycora)

Add Mycora. Its economy — Grow construction, swarm-tap gathering, spread-gated
tech — is the furthest from Cohort's, making it the best test of whether "same
problem, different answer" produces genuinely different play rather than
different stats.

Blocked on Phase 1 completion. Design gaps to resolve first: Mycora naming pass,
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
| 4.3 | Networked multiplayer — lockstep; depends on determinism proven by replays |
| 4.4 | Audio/visual polish, balance tuning |

Balance numbers stay placeholders until 4.4 by design — systems are implemented
faithfully first, tuned last.

---

## The UI blueprint runs alongside, not after

`UI_BLUEPRINT.md` describes three command depths. Level 1 exists today. Level 2
(missions) and Level 3 (doctrine editor) are the substance of the game and
should grow through Phases 1–3 rather than being bolted on in Phase 4.

The one hard ordering constraint: **`Mission` must become a sim entity (D-007)
before any mission UI is built.**
