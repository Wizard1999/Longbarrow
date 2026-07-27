# Design Decisions

Append-only. Each entry records what was decided, why, and what was rejected.
**Do not relitigate these without a new entry superseding the old one.**

---

## D-001 — The simulation is pure and headless
**Date:** 2026-07-26

**Decision:** `src/sim/` never imports from `render/`, `input/` or `ui/`.
Enforced by `tests/architecture.test.ts`.

**Reason:** Replays, lockstep multiplayer and a testable AI opponent are all
free if determinism holds from day one, and all three are near-impossible to
retrofit. The cost of the rule is close to zero.

**Rejected:** Letting views read/write sim state directly for convenience.

---

## D-002 — All durations are ticks, never seconds
**Date:** 2026-07-26

**Decision:** Every duration in the simulation is expressed in ticks.

**Reason:** Wall-clock time is non-deterministic and frame-rate dependent.

**Consequence:** Changing `TICK_HZ` rescales the meaning of every constant —
see D-004.

---

## D-003 — Units do not execute player commands directly
**Date:** 2026-07-26

**Decision:** Player intent flows through squads and behaviour chains rather
than into individual units.

```
Player command → Squad → Behaviour chain → Individual units
```

**Reason:** The game is about expressing intent, not mechanical execution.

**Rejected:** Direct per-unit commands as the primary interaction, StarCraft
style. Note this remains *possible* — it is simply the worse way to play, not
a removed capability.

---

## D-004 — Tick rate is 30 Hz, not 20 and not 128
**Date:** 2026-07-27

**Decision:** `TICK_HZ` raised from 20 to **30**. All tick-denominated
constants multiplied by 1.5 to preserve wall-clock behaviour.

**Reason.** The 128-tick figure comes from competitive Counter-Strike, and it
solves a problem this game does not have. In a hitscan FPS, tick rate governs
*hit registration* — whether a shot fired at a target moving across your screen
at high angular velocity connects. That is a genuine 8 ms-scale problem.

An RTS has a different bottleneck. Perceived responsiveness here is dominated
by **input-to-feedback latency**, not simulation granularity, and tick rate is
only one small term in that sum:

| Tick rate | Worst-case command delay | Average |
|---|---|---|
| 20 Hz | 50 ms | 25 ms |
| **30 Hz** | **33 ms** | **17 ms** |
| 60 Hz | 17 ms | 8 ms |
| 128 Hz | 8 ms | 4 ms |

Going 20 → 30 buys 8 ms of average latency for a 1.5× sim cost. Going 30 → 128
would buy a further 13 ms for a **4.3× sim cost** — and sim cost is exactly the
budget we committed to spending on 100+ units at 1080p/30fps on a 2017
integrated GPU. Target acquisition is the expensive part and scales with unit
count; multiplying it by 4.3 to save 13 ms is a bad trade.

For reference, shipped RTS tick rates: StarCraft II ≈ 22.4, Age of Empires II
≈ 20–30, Company of Heroes ≈ 10, Supreme Commander 10. None of these feel
unresponsive, because they spend their responsiveness budget elsewhere.

30 Hz also divides evenly into 60 Hz displays (exactly 2 render frames per
tick), which keeps interpolation judder-free. 128 divides into nothing.

**Where responsiveness actually comes from** — these matter far more than tick
rate and are the real work:
1. **Render interpolation** (already built) — views lerp with the loop's `alpha`,
   so motion is smooth at any framerate regardless of tick rate.
2. **Immediate input acknowledgement** — click feedback (marker, cursor, sound)
   must fire on the frame of the click, before the tick applies the command.
   *Not yet built — see TODO.*
3. **Command batching at tick boundaries** rather than dropping input between ticks.

**Rejected:** 128 Hz (cost without benefit), 60 Hz (2× cost for 8 ms; revisit
only if profiling shows headroom at 100+ units), staying at 20 Hz.

**Locked because:** tick rate is baked into the replay format. Changing it later
invalidates every recorded replay. Decided now, deliberately, before the replay
system is built.

---

## D-005 — Art direction: Ghibli-influenced, hue-path shading
**Date:** 2026-07-27

**Decision:** Surfaces are shaded along a **hue path** — three distinct colours
(shade / mid / lit) — rather than one colour lit and darkened. Shadows shift
hue instead of going black.

**Reason:** This is the single largest difference between "stylised" and "3D
render with the lights turned down". It is fragment maths, so it costs
essentially nothing and can ship in every quality tier.

**Consequence:** The *look* is not tiered; the *cost* is. Quality tiers scale
shadow resolution, antialiasing, pixel ratio and mesh subdivision only.

---

## D-006 — Performance target
**Date:** 2026-07-27

**Decision:** 1080p, 30 fps, **100+ units**, on a ~2017 integrated GPU
(Intel HD 620 class), from a cold page load in a browser.

**Reason:** The game must run on practically any machine straight from the
website. Late-game unit counts are where performance actually collapses, so the
target is set at late-game load rather than a comfortable early-game figure.

---

## D-007 — Missions become first-class simulation objects
**Date:** 2026-07-27

**Decision:** When the mission system is built, `Mission` lives in `src/sim/`
and is serialized in replays. It is **not** a UI construct.

**Reason:** Missions carry objective, priority, fallback position and
completion/failure conditions — all of which affect unit behaviour and
therefore must be deterministic and replayable. Building it in the UI layer
first would make it unreplayable and force a rewrite.

**Consequence:** `Mission` sits *above* `Squad` in the hierarchy. Squads
currently own behaviour chains directly; that ownership moves up when missions
land. See `UI_BLUEPRINT.md`.

---

## D-008 — Replays record commands, not state
**Date:** 2026-07-27

**Decision:** A replay is `{ seed, tickRate, version, commands[] }` where each
command is `{ tick, playerId, command }`. Playback re-simulates from tick 0.

**Reason:** Command streams are orders of magnitude smaller than state
snapshots, and re-simulation is a continuous proof that determinism holds — a
desync in playback is a determinism bug worth knowing about.

**Consequence:** Every command in `sim/commands.ts` must stay **serializable** —
no functions, no Three.js objects, no DOM references in a command payload.
Replays must store the tick rate and a version so old replays can be rejected
rather than silently desyncing.

---

## D-009 — The AI opponent is developed incrementally alongside features
**Date:** 2026-07-27

**Decision:** A basic CPU opponent is built now and levelled up with each new
system, rather than written from scratch late.

**Reason:** An AI written after the fact has to reverse-engineer every system at
once. An AI grown alongside the game stays cheap to extend, and it doubles as a
continuous integration test of the systems it drives — if the AI can't gather,
gathering is broken. It also means there is always something to play against.

**Consequence:** The AI issues the *same* commands a human does, through
`sim/commands.ts`. It gets no privileged access to state it should not see.
This keeps it honest and keeps it replayable.
