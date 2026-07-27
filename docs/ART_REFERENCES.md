# Art References

External references the designer has supplied, and what each is wanted *for*.
Keep this file current — references given in chat are lost when context is.

---

## Ghibli painterly scene (received 2026-07-27, implemented)

The reference that established the project's shading model. Its shading core was
adapted into `src/render/painterly.ts`.

**Taken:** three-colour hue path (shade/mid/lit), half-lambert wrap, jittered
soft bands, hue-shifted shadows, hemispheric ambient normalised to unit
luminance, backlight rim, drifting cloud shadows.

**Deliberately not taken:** per-blade grass, planar reflections, full post-processing
chain. At a far top-down RTS camera these buy very little and are exactly what
breaks the "runs on any machine" requirement (`DECISIONS.md` D-006).

---

## Water and UI paneling — ⬜ pending review

Supplied 2026-07-27. **Not yet opened or analysed.**

| Reference | Wanted for |
|---|---|
| https://codepen.io/Margarita-the-solid/pen/xbgrWpd | water; class paneling; shaders |
| https://codepen.io/Margarita-the-solid/pen/NPRPBjd | water; class paneling; shaders |
| https://codepen.io/Kan3an/pen/YPpyVWd | water; class paneling; shaders |

Designer's note, verbatim:

> "I want to use this code, or code like this, to achieve similar results in the
> game so that when the time comes the water looks right, and the UI also looks
> good. I enjoy the class paneling and shaders shown in these projects."

### Why this matters more than it looks

Water is not cosmetic in this design. **Conclave is the Water race** — its whole
identity is "coordination flows through canals, locks and reflecting pools",
with water channels *visibly* connecting structures and the network literally
following rivers across the map (`GAME_DESIGN.md § 8.8`). Conclave arrives in
Phase 3, but the water shader is a Phase 3 *dependency*, not a polish item.

### Constraints any adopted technique must meet

Before lifting code from these, check it against the things already locked:

1. **`DECISIONS.md` D-006** — 1080p / 30 fps / 100+ units on a 2017 integrated
   GPU. Planar reflections and full-screen refraction passes are the usual way
   CodePen water looks good, and they are the usual way this target dies.
   A screen-space or vertex-displacement approach is far likelier to survive.
2. **`DECISIONS.md` D-005** — water must sit inside the hue-path model, not
   beside it. Realistic blue-green water next to painterly terrain will read as
   two art styles sharing a screen.
3. **Camera distance** — detail that only resolves close up is wasted. Judge
   every technique from the actual RTS camera height, not from a hero shot.
4. **UI paneling is DOM, not WebGL** — the HUD is DOM (`src/ui/`). Panel styling
   lifted from these pens is CSS work and carries none of the GPU cost above.
   It can therefore land much earlier and much more cheaply than the water can.

### Next action

Open all three, and for each record: the technique used, its per-frame cost, and
whether it survives constraint 1. Then decide what to adopt. Until that pass
happens, treat these as **unevaluated** — do not assume any of it is affordable.
