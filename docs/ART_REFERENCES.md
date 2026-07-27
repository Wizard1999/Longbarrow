# Art References

> Generating concept art? Start with `ART_PROMPTS.md` — ten prompts built from
> the locked direction, including the negative prompts that stop a generator
> defaulting to sci-fi clichés the design explicitly rejects.

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

## Water, UI, bloom, and interface references — 🟨 logged; technical review pending

Supplied 2026-07-27. These are permanent references, not approval to copy code
unchanged. Each must be checked for licensing, dependencies, frame cost, and fit
with Longbarrow's painterly war-table presentation before implementation.

| Reference | Primary use in Longbarrow | Direction status |
|---|---|---|
| https://codepen.io/Margarita-the-solid/pen/xbgrWpd | Ocean/water shader, day-cycle lighting, Conclave water research | Technical inspiration |
| https://codepen.io/Margarita-the-solid/pen/NPRPBjd | Liquid-glass HUD panels, layered translucency, interface depth | UI inspiration |
| https://codepen.io/Kan3an/pen/YPpyVWd | Dimensional panel construction, glass layers, rim lighting, tactile hover depth | UI inspiration |
| https://codepen.io/dermalhealth/pen/KwNXWZb | Cinematic transitions, layered gallery motion, presentation pacing | Motion/UI inspiration |
| https://codepen.io/VoXelo/pen/GgNawEE | Bloom, emissive readability, low-poly scene post-processing | **Technique only — not an art-direction target** |

### Why this matters more than it looks

Water is not cosmetic in this design. **Conclave is the Water race** — its whole
identity is "coordination flows through canals, locks and reflecting pools",
with water channels *visibly* connecting structures and the network literally
following rivers across the map (`GAME_DESIGN.md § 8.8`). Conclave arrives in
Phase 3, but the water shader is a Phase 3 *dependency*, not a polish item.

The UI references are useful for hierarchy, depth, and tactile response, but the
HUD must remain readable over a busy battlefield. Glass, blur, bloom, and motion
should be selectively applied rather than becoming a full-screen aesthetic.

### Constraints any adopted technique must meet

1. **`DECISIONS.md` D-006** — 1080p / 30 fps / 100+ units on a 2017 integrated
   GPU. Planar reflections, excessive blur passes, and full-screen bloom can
   violate this quickly.
2. **`DECISIONS.md` D-005** — water and emissive effects must live inside the
   established hue-path model rather than appearing to belong to a different
   renderer.
3. **Camera distance** — judge every technique from the actual RTS camera height,
   not only from a close hero shot.
4. **UI paneling is DOM, not WebGL** — HUD styling belongs in `src/ui/`, where
   many of these ideas can be tested without adding scene-render cost.
5. **Bloom is subordinate to readability** — the VoXelo village reference is
   specifically logged for bloom/emissive technique, not for Longbarrow's look.

### Review checklist

For each reference, record: renderer/library version, shader and post-processing
passes, texture requirements, geometry count, interaction dependencies, measured
GPU cost, licensing/attribution, and whether the technique survives D-006.

---

## High-fidelity WebGL and atmosphere references — 🟨 logged; technical review pending

Supplied 2026-07-27 as quality bars and possible technique sources:

| Reference | Primary use in Longbarrow |
|---|---|
| https://codepen.io/russell-henderson/pen/jEVVqBe | Overall rendering quality and transferable scene techniques |
| https://codepen.io/editor/lukeslp/pen/019f6c96-8616-7375-a33b-6c3f0260b2a0 | Overall rendering quality and transferable scene techniques |
| https://codepen.io/VoXelo/pen/yygKOVy | Lighting, atmosphere, materials, animation, and composition |
| https://codepen.io/VoXelo/pen/xbgpJre | Bioelectric/organic motion, pulsing networks, living-system visualization; potentially useful for Mycora hivemind language |

These are inspiration, not dependencies. Before adopting code or techniques,
record for each: renderer/library version, shader passes, post-processing,
lighting model, geometry count, texture requirements, licensing/attribution, and
measured impact against D-006. Techniques that only look good from a close hero
camera must be re-evaluated at Longbarrow's actual war-table distance.

## Complete supplied CodePen index

This is the authoritative checklist of every CodePen supplied through
2026-07-27. A new reference should be added here immediately, even before its
technical review is complete.

1. https://codepen.io/russell-henderson/pen/jEVVqBe
2. https://codepen.io/editor/lukeslp/pen/019f6c96-8616-7375-a33b-6c3f0260b2a0
3. https://codepen.io/VoXelo/pen/yygKOVy
4. https://codepen.io/Kan3an/pen/YPpyVWd
5. https://codepen.io/Margarita-the-solid/pen/NPRPBjd
6. https://codepen.io/Margarita-the-solid/pen/xbgrWpd
7. https://codepen.io/dermalhealth/pen/KwNXWZb
8. https://codepen.io/VoXelo/pen/xbgpJre
9. https://codepen.io/VoXelo/pen/GgNawEE — bloom/emissive technique only; not a target look


---

## First-party concept-art set — ✅ archived in repository

Eleven original visual targets supplied 2026-07-27 are stored in
`docs/assets/concept-art/` and curated in [`CONCEPT_ART.md`](CONCEPT_ART.md).
They cover the Cohort legionnaire, marksman, worker and Standard; Conclave
ritual language; Mycora spread; contested ground; Titanfolk; and the war-table
camera. These are now the primary visual references. External CodePens remain
technique references and may not override this first-party direction.
