# Bugs

Known defects. Fixed bugs move to `CHANGELOG.md` with the version that fixed them.

Format: severity · area · description · repro · status

---

## Open

### B-004 · medium · render · Fog of war renders as hard tiles
The fog overlay is a coarse grid of instanced quads, so its edges are visibly
square against painterly terrain — it reads as a checkerboard rather than
concealment. The colour was fixed (was pure black, violating D-005's "shadows
shift hue, never go black"; now deep violet-blue), but the tiling is
structural.
**Fix direction:** render fog to a texture and sample it smoothly, or blur the
mask, rather than raising the grid resolution — more, smaller squares is still
squares.
**Repro:** load the game at any quality with default vision.
**Status:** open. Colour corrected 2026-07-27; softness outstanding.

### B-001 · low · render · Scenery and resource nodes use stock materials
`sceneryViews.ts` and `nodeViews.ts` still build `MeshStandardMaterial`, so they
do not match the painterly shading applied elsewhere. Cosmetic inconsistency,
not a defect in behaviour.
**Status:** open — folded into the art pass in `TODO.md`.

### B-002 · unknown · perf · 100-unit performance is unverified
`DECISIONS.md` D-006 commits to 100+ units at 1080p/30fps on a 2017 integrated
GPU. Nothing has measured this yet. It may already fail.
**Repro:** none — needs the perf harness in `TODO.md § Infrastructure`.
**Status:** open, unmeasured.

### B-003 · low · sim · Combat target acquisition is O(n²)
Every unit scans every enemy each tick. Fine at current counts, but this is the
first thing that will break the 100-unit target, and the tick-rate increase to
30 Hz makes it 1.5× more expensive per second.
**Status:** open — needs a spatial grid before unit counts grow.

---

## Watch list

Not bugs yet, but the places where bugs are most likely to appear first.

- **Determinism.** No test currently proves the sim is deterministic. Until the
  replay determinism test exists, a desync bug could sit undetected for months.
- **Tick-rate migration.** The 20 → 30 Hz change rescaled every tick constant by
  1.5. Any constant that was missed will produce subtly wrong timing rather than
  an obvious failure. Suspect this first if pacing feels off.
- **`MAX_CATCHUP` clamp.** After 5 catch-up steps the accumulator is zeroed,
  which silently drops simulated time. Correct for a stalled tab, but it means a
  heavily loaded client runs *slower* than real time rather than falling behind
  — relevant if lockstep multiplayer ever lands.

---

## Fixed

*(none yet — this file was created 2026-07-27)*
