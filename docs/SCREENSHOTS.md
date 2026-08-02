# Development screenshots

**These are real in-game captures, not concept art.** Everything on this page is
the actual build rendering actual simulation state — which is exactly why it is
worth being blunt: *the game does not look good yet.* The concept art in
[`CONCEPT_ART.md`](CONCEPT_ART.md) is the target; this page is the honest
distance still to travel.

Captured at v1.27.0 on 1600×900.

> **Caveat on fidelity.** These were taken in a headless container with no GPU,
> so Chromium fell back to software rendering (SwiftShader) and the quality
> tier auto-detected to **Low**. Shadows, higher mesh subdivision and the full
> painterly response are absent. On real hardware at High the shading model is
> considerably warmer than this — but the *composition* problems visible here
> are real and not a rendering artefact.

---

## The war table, whole board

![Whole board](assets/screenshots/01-war-table.png)

`Home` frames the entire play area. The polygon boundary, both bases, their
control rings and the resource nodes are all visible; map revealed via the dev
console. At this distance the level-of-detail system deliberately swaps unit
meshes for strategic markers (D-014) — the dots are the LOD working, not units
failing to render.

**Ground now reads as ground.** The pale ochre patches are high ground drying
out, mixed by world height, slope and meadow noise — so the elevation that
combat already rewards is finally visible from the war table (D-035). The
earlier capture of this same view was one flat lime sheet.

**What this shot still says about the work left:** the *shape* of the terrain is
soft. Colour tells you roughly where the rises are, but there are no distinct
ramps, no chokepoints, and no route worth discovering — because the generator
does not yet author any. That is D-033's job and remains the real blocker for
arcade legibility; ground colour was only the half of it that shading could
fix.

## Contact

![Two armies meeting](assets/screenshots/04-battle.png)

Outriders (blue) against a Legionnaire line (red), 18 a side, spawned through
the dev console and left to fight. Command shows `46/15` — over cap, because
cheats do not respect supply. The research panel is lit now that both currencies
are banked, and each upgrade shows its split cost: *90 Material · 30 Legacy*.

The Outrider's whole case is visible in the shape of the engagement: it is the
fastest unit on the roster, so it arrives first and curls around rather than
meeting the line head-on, which is exactly where its doubled flank bonus pays
and its zero defense does not.

## Research

![Research panel](assets/screenshots/02-research-panel.png)

The tech track (D-028), reachable in-game. Rows grey out when unaffordable and
light the moment they are payable. Costs are rendered from the resource registry
rather than hardcoded, so each upgrade shows its real split — Material for the
labour, Legacy for the understanding (D-031). Doctrine pairs state explicitly
that taking one does not forfeit the other; that reassurance is the mechanic.

## Developer console

![Dev console](assets/screenshots/03-dev-console.png)

Backtick opens it. Every shot on this page was staged through it — `/dev on`,
`/reveal on`, `/add 2000`, `/spawn`. Cheats are recorded into the replay stream
as ordinary commands and gated on hashed `devMode`, so a session staged this way
still replays exactly, and a clean competitive match can prove no cheat was ever
enabled. `/add` reports both currencies because it walks the resource registry;
it does not know their names.

---

## Where this is going

The gap between these captures and the concept art is the subject of the
**visual overhaul** queued in [`TODO.md`](TODO.md). Ground material variation
and readable elevation are now done — the first item on that list. What remains,
in order of return: **contact shadows** where geometry meets ground (nothing
currently sits *in* the world, it all floats on it), **silhouette variety**
beyond near-cylinders now that the camera can drop to miniature scale, and
**depth in the void** so the table feels suspended in something.
