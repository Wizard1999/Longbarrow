# Procedural Polygon Map Generation

Greenmantle's current test map is a square heightfield. Production maps should eventually be seeded, irregular polygons so each battlefield has a distinctive silhouette and the far-zoom World Turtle carries a visibly unique landmass.

## Design goals

- Deterministic from a recorded map seed and generator version.
- Irregular convex or gently concave boundaries rather than a permanent square.
- Gameplay-safe spawn regions, travel corridors, resource access, and buildable areas.
- Boundary data shared by simulation, renderer, camera framing, minimap, fog of war, placement, and pathfinding.
- Stable serialization: replays and saves record both seed and generator version.
- Art-directed variety through presets such as crescent, shield, broken ring, peninsula, archipelago-like connected plateaus, and asymmetric natural slabs.

## Planned pipeline

1. Generate a seeded set of radial boundary points around a center.
2. Relax and validate the polygon to avoid needle-thin angles and unusable pockets.
3. Derive an interior signed-distance field or point-in-polygon query.
4. Generate terrain height only inside the playable boundary, with a controlled rim transition.
5. Reserve fair spawn regions and connect them with multiple viable corridors.
6. Place resources, relic opportunities, landmarks, and scenery using deterministic constraints.
7. Triangulate the polygon for rendering and generate descending edge geometry from the actual boundary.
8. Build navigation, placement, minimap, camera framing, and World Turtle support geometry from the same canonical shape.

## Architectural rule

The polygon is authoritative data, not a render-only mask. No subsystem should independently guess the map edge. The first implementation should remain file/data driven so future engine users can supply their own polygons or generator presets.

## v1.20.0 visibility and seed browsing

The tactical map now rasterizes visibility inside the canonical polygon. Player-owned units, buildings, and construction sites provide current vision; visited cells persist as explored. Enemy tactical markers are emitted only in currently visible cells, while discovered resource nodes remain known. The browser accepts `?mapSeed=<integer>` and exposes compact Load/New controls above the tactical map. Choosing maps does not consume the match RNG.

The field is currently presentation-side. The next integration must use the same visibility policy for 3D enemy rendering, picking, commands, and replay/spectator information rules without contaminating deterministic world state.
