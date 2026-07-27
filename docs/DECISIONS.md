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

---

## D-010 — Sim state is plain, reachable data (rollback prerequisite)
**Date:** 2026-07-27

**Decision:** No sim state may live anywhere a structured clone cannot reach.
No closures, no functions, no `Map`/`Set` held on `World`, no references
between entities other than ids.

**Reason:** Rollback netcode, replays and server-side match validation are all
the same three operations — snapshot, restore, hash — and all three break on
unreachable state. This was not hypothetical: `World.rng` was a closure, so the
generator's position was unreachable. A fresh sim from tick 0 still worked, so
nothing failed visibly, but rollback could not have restored the RNG position
and every rewind would have desynced. Fixed by storing `rngState` as a number.

**Consequence:** `sim/snapshot.ts` owns `snapshot()`, `restore()` and `hash()`.
`restore()` mutates in place rather than returning a new object, because views
hold long-lived references to the `World`. `tests/determinism.test.ts` guards
all of it, including a JSON round trip — which a closure cannot survive.

**Cost if deferred:** this is cheap now and near-impossible later. Retrofitting
snapshot-safety means auditing every field added in between.

---

## D-011 — Rollback netcode: the state layout is the real decision
**Date:** 2026-07-27
**Amended 2026-07-27:** rollback **deferred** by the designer as too ambitious
for now. See D-016 for what that does and does not cost.

**Decision:** Target rollback netcode. Keep `structuredClone` for now; route
every snapshot through `sim/snapshot.ts` so the representation can change
without touching call sites.

**Reason, and the honest caveat.** Rollback is standard in fighting games — two
players, tiny state, snapshot 60×/sec trivially. An RTS is the opposite: 100+
entities means state is orders of magnitude larger, which is exactly why most
RTS ship **lockstep with input delay** instead. Rollback here is achievable but
it is a genuine engineering commitment, and the thing that decides whether it
is affordable is **state layout**, not netcode cleverness.

- Object graph + `structuredClone` (today): allocates, walks the graph, GC
  pressure. Fine at current scale, will not hold at 100+ units × 30 Hz.
- Structure-of-arrays over typed arrays: snapshot becomes `TypedArray.set()`
  into a ring buffer — a memcpy, microseconds, zero allocation.

**Not rewriting to SoA yet** — it would stall Phase 1 for a system that has no
consumer. But D-010's plain-data rule keeps the option open at zero cost, and
`snapshot.ts` is the single file that changes when the time comes.

**Interaction with D-004:** rollback multiplies sim cost by the rollback window.
A 7-tick rewind is 7× the work in one frame. This *strengthens* the case for
30 Hz over 128 — at 128 Hz the same wall-clock window is ~30 ticks to
re-simulate.

**Measure before committing:** snapshot+restore cost at 50 / 100 / 200 units.
If a snapshot exceeds roughly a third of a frame at target unit count, take
lockstep-with-input-delay instead and revisit. That is a real outcome, not a
failure.

---

## D-012 — Replays, matchmaking and MMR ride on determinism
**Date:** 2026-07-27

**Decision:** Automated match replays and global matchmaking with MMR are
product requirements. All three of replay, rollback and rating validation are
served by the same foundation from D-010.

**Reason:** A deterministic sim makes each of these cheap rather than each
needing its own machinery:

| Requirement | What it needs |
|---|---|
| Automated replays | Command stream + seed + start hour (D-008) |
| Replay seeking | `restore()` to the nearest keyframe, then re-simulate |
| Rollback | `restore()` + N × `simStep()` |
| Desync detection | `hash()` compared per tick |
| MMR result validation | Server re-simulates and confirms the final `hash()` |
| Anti-cheat | A client cannot report a result the command stream does not produce |

**Consequence:** replays must record seed, tick rate, **start hour** and a
version. Any of these missing makes a replay silently wrong rather than
obviously broken. MMR is otherwise a backend concern and does not constrain the
sim beyond this.

---

## D-013 — Day/night cycle is simulation state, in ticks
**Date:** 2026-07-27

**Decision:** Ten real minutes per full in-game day. The cycle is derived from
`world.tick` plus a `dayStartTick` offset, so a match may begin at any hour.
Time of day is displayed at all times in the HUD.

**Reason:** A day counter looks like pure decoration, and the obvious
implementation is `performance.now()` in the renderer. That is a trap. The
moment anything gameplay-facing reads the time of day — night vision ranges, a
night-only unit, a timed objective, or simply a player choosing to attack at
dusk — a wall-clock cycle desyncs across peers and cannot be replayed. Deriving
it from the tick costs nothing and closes the door before anyone walks through
it.

**Consequence:** `dayStartTick` is part of hashed state, so a replay cannot
restore a match to the wrong time of day and still report agreement. Day length
is declared in `data/tuning.ts` as **real seconds** and converted to ticks once,
so changing `TICK_HZ` cannot silently change day length.

**Presentation:** `render/skyCycle.ts` derives sun direction, light colour, sky
and fog from the sim clock and never writes back. Night lifts ambient well above
physical darkness deliberately — a strategy game that is hard to read at night
is one people refuse to play at night.

---

## D-014 — The war table: free-flight camera, not a traditional RTS view
**Date:** 2026-07-27
**Status:** direction locked, implementation deliberately deferred

**Decision:** Replace the top-down pan/zoom camera. The map is a holographic
war table floating in an otherwise empty universe. The player flies freely
around it and views it from any angle, scaling themselves from *miniature*
(down inside the map, among the units) to *enormous* (the whole table at a
glance).

**Reason:** It is the camera the rest of the design already implies. The player
is an Operations Commander reading an operational picture, not a soldier with a
fixed viewport — a war table is literally what commanders use. It also makes
`UI_BLUEPRINT.md`'s mission visualisation (arrows, fallback lines, logistics
routes) read as objects on a table rather than overlays on a screen.

**Rejected:** traditional pan/zoom/edge-scroll. Retained only as a fallback if
free flight proves to hurt readability in competitive play.

### Consequences — these are the parts that cost something

1. **It invalidates an assumption in the art pass (D-005).** That work justified
   omitting close-range detail because "at a far top-down RTS camera it buys
   little". If the player can shrink into the map, close-up detail is exactly
   what they will be looking at. The renderer will need real LOD: cheap
   impostors at table scale, genuine detail at miniature scale. **Do not read
   D-005's omissions as permanent — they were scoped to a camera that is now
   being replaced.**

2. **It changes the sky cycle (D-013).** Aerial-perspective fog fading toward a
   sky colour assumes a horizon. In an empty universe there is none. The day/
   night cycle must light *the table* while the surround stays void — closer to
   a lit diorama than a landscape. Fog becomes a table-edge falloff, not
   distance haze. `render/skyCycle.ts` will need revisiting; the sim-side clock
   in `sim/daynight.ts` is unaffected, which is the point of the split.

3. **The map needs a defined edge.** Terrain is currently an infinite-feeling
   plane. A floating table has a visible rim, underside and silhouette, and all
   three become art surfaces.

4. **Culling and LOD stop being optional.** A fixed top-down camera makes both
   easy. Arbitrary angles plus arbitrary scale make them load-bearing for the
   100-unit target (D-006).

5. **The minimap is reconsidered.** In `UI_BLUEPRINT.md` the minimap is a
   strategic intelligence display. With a war table already showing the whole
   map at a glance, the minimap may be redundant, or may become the *fast
   travel* control rather than an overview. Open question.

**Sequencing:** deferred by the designer's explicit instruction — capture now,
build in the right order. It should land **before** the remaining art work on
units, buildings and scenery, so that work is done once against the real camera
rather than twice. The sim is entirely unaffected either way, which is why
deferring it is safe.

---

## D-015 — Project codename is Longbarrow, distinct from the race names
**Date:** 2026-07-27

**Decision:** The project is codenamed **Longbarrow**. Repository, package name
and page title use it. The four races keep their own names.

**Reason:** The project was previously titled "Cohort RTS", which conflates the
project with *Cohort*, one of four playable races and the Phase 1 proving
ground. That naming ages badly — by Phase 3 the game contains four races and
being named after one of them is misleading, and it quietly implies Cohort is
the protagonist faction when the design explicitly treats all four as forces of
nature with no privileged viewpoint.

A longbarrow is a prehistoric burial mound, grassed over. It carries the same
imagery Cohort's visual identity is built from — ancient machinery of death,
gently overgrown, as inherent to the landscape as a hill — without being the
race's name. Evocative of the world rather than of one faction in it.

**Consequence:** `Cohort` continues to mean the race, everywhere in the design
documents. Only project-level titles changed: `README.md`, `CLAUDE.md`,
`package.json`, and the page `<title>`.


---

## D-016 — Rollback deferred; the foundation stays because it was never rollback-specific
**Date:** 2026-07-27

**Decision:** Stop pursuing rollback netcode for now. Keep `sim/snapshot.ts`,
the plain-data rule (D-010) and the determinism tests exactly as they are.

**The question this answers:** does deferring rollback hurt development later?
**No** — and specifically:

**Nothing built for it is wasted.** Snapshot, restore and hash were never
rollback-only. Each has an independent consumer that is still wanted:

| Capability | Needs | Still wanted? |
|---|---|---|
| Replay seeking | `restore()` to a keyframe | Yes — D-012 |
| Desync detection | `hash()` per tick | Yes, for any netcode |
| Save / load a match | `snapshot()` + `restore()` | Yes |
| Server-side MMR validation | re-simulate, compare `hash()` | Yes — D-012 |
| Determinism regression tests | all three | Yes, already running |
| AI lookahead ("what if I attack here?") | `snapshot()` + simulate + `restore()` | Likely — D-009 |

Even if rollback is never built, none of this becomes dead code.

**Nothing was spent that would not have been spent anyway.** The costly parts
of rollback — per-tick snapshotting, a structure-of-arrays rewrite, prediction
and reconciliation — were deliberately *not* started. D-011 gated them behind a
measurement precisely so they would not be built on speculation.

**The option stays open at zero ongoing cost.** The only thing rollback needs
preserved is D-010's rule: sim state must be plain reachable data — no closures,
no functions, no `Map`/`Set` on `World`. That rule is worth keeping on its own
merits (replays and networking both require it), it is enforced by existing
tests, and it costs nothing to follow.

**What to do instead when multiplayer arrives:** deterministic lockstep with
input delay. It is what most RTS ship, it reuses the same command stream
`sim/replay.ts` already produces, and it needs no snapshotting at all. If
rollback is ever revisited, D-011's measurement gate is still the right first
step — do not start with netcode, start by measuring snapshot cost at 100+ units.

**The one thing that would genuinely hurt later:** letting unreachable state
back into `World`. A closure, a `Map`, or an object reference between entities
would break replays and validation too, not just rollback — and it would be
invisible until something desyncs. Keep the rule.

---

## D-017 — Map seed is separate from match seed
**Date:** 2026-07-27

**Decision:** `World.mapSeed` is distinct from the match seed. The same map seed
always produces the same map, and map generation draws from its own generator —
never from `world.rngState`. Maps also carry a `MAP_VERSION`.

**Reason.** They look like one number and must not be. Three things break if
they are shared:

1. **A map browser becomes impossible.** Previewing a seed would advance the
   match generator, so the match you then played would differ from the match
   you would have played without previewing.
2. **You cannot replay a match on a map you liked.** With one seed there is no
   way to hold the map fixed and vary the match, or vice versa.
3. **Matches on different maps diverge for unrelated reasons.** Generating a
   larger map consumes more random draws, silently shifting every later combat
   roll.

**`MAP_VERSION` is the non-obvious half.** A seed alone does not reproduce a
map — the generator must match too. Without a version, improving map generation
would silently make every existing seed produce different terrain, and old
replays would play out on ground that no longer matches what was recorded.
Versioning converts that from a plausible wrong answer into an explicit
rejection, exactly as tick rate already does.

**Consequence:** `mapSeed` and `mapVersion` are in the hashed state and in the
replay format (`REPLAY_VERSION` → 2). `generateScenery()` takes its RNG source
as an argument rather than reaching for the world's.

**Still to build:** actual procedural generation. Terrain is currently a fixed
formula and the map layout is hand-placed, so seeds vary only scenery today.
The seed *plumbing* is done and correct, which is the part that would have been
expensive to retrofit; the generator can be written whenever.

---

## D-018 — Multiplayer path: deterministic lockstep with input delay
**Date:** 2026-07-27

**Decision:** When multiplayer arrives, build **deterministic lockstep with
input delay**. Confirmed by the designer, superseding rollback (D-016).

**Reason:** It is what most RTS ship, for the reason RTS keep choosing it —
state is far too large to snapshot per frame at 100+ units. It also reuses what
already exists: `sim/replay.ts` produces exactly the serializable per-tick
command stream lockstep needs to exchange, and `hash()` gives per-tick desync
detection for free.

**Consequence:** input delay becomes a tuning number (typically 2–4 ticks; at
30 Hz that is 66–133 ms). This raises the value of the immediate
input-acknowledgement work already in `TODO.md` — under lockstep, local
feedback on the frame of the click is what hides the delay.
