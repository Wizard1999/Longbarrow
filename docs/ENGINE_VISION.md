# Longbarrow as an Open RTS Engine

Longbarrow is both a game and, over time, a reusable browser-first RTS engine.
The game remains the proving ground: reusable systems must earn their place by
shipping in a coherent, playable Longbarrow match before they are generalized.

## Vision

Make it possible for another creator to fork or configure the project and build
a distinct RTS without replacing the deterministic simulation, renderer,
selection/command stack, replay tools, development website, or test harness.
Creators should eventually be able to define:

- factions, units, buildings, heroes, and armies;
- resources, gathering rules, production chains, supply systems, and victory conditions;
- lore, names, descriptions, icons, colors, materials, and concept art;
- maps, terrain rules, neutral encounters, and environmental presentation;
- technology trees, doctrines, upgrades, AI personalities, and balance values;
- tutorials, campaigns, scenarios, and multiplayer-compatible rule sets;
- a branded public landing page and live development roadmap.

The goal is not merely "make Longbarrow moddable." The goal is to make a good,
open, web-native RTS foundation that others can understand, repurpose, and extend.

## Architectural principle: engine, game, and content

Long-term code should settle into three conceptual layers:

```text
engine/     reusable deterministic RTS systems and browser tooling
games/      game-specific rule composition, including Longbarrow
content/    declarative faction, unit, building, resource, lore, map, and UI data
```

The current folders do not need to be reorganized immediately. Prematurely
extracting an engine would slow development and produce abstractions based on
imagined needs. Instead, new work should observe these boundaries now:

1. Put balance and authored definitions in data, not hard-coded branches.
2. Keep generic mechanics neutral; avoid names such as `cohortOnlyMovement()` in
   reusable systems when a capability or rule definition would express the same thing.
3. Allow game-specific composition to select and configure generic systems.
4. Keep deterministic commands serializable so replays and networking also work
   for custom rule sets.
5. Treat Longbarrow-specific art direction as content, not an engine assumption.
6. Add extension seams only after at least two real use cases demonstrate the need.

## Creator experience target

A future creator should be able to begin with a template and edit human-readable
files before writing engine code. A mature workflow may include:

- JSON, YAML, or TypeScript content definitions with schemas and autocomplete;
- a faction and unit editor;
- stat validation and balance warnings;
- hot reload for content changes;
- scenario and map editors;
- configurable resource and victory-condition modules;
- a doctrine/technology-tree editor;
- AI behavior profiles;
- asset import and preview tools;
- generated documentation and a customizable landing page;
- export as a static browser build;
- deterministic compatibility checks for replay and multiplayer safety.

TypeScript should remain the escape hatch for advanced creators. Data-driven
configuration must not become a restrictive visual scripting prison.

## Mod package concept

A future mod/game package should have a manifest and explicit compatibility data:

```text
my-rts/
  manifest.json
  factions/
  units/
  buildings/
  resources/
  technologies/
  scenarios/
  maps/
  lore/
  assets/
  site/
```

The manifest should eventually declare engine version, game identity, enabled
systems, entry scenario, asset licenses, deterministic/network compatibility,
and dependencies on reusable packages.

## Open-source and community principles

- Keep the code understandable and documented for people who did not author it.
- Prefer explicit systems over clever, opaque abstractions.
- Maintain examples and templates alongside APIs.
- Preserve a headless test path for custom games.
- Publish migration notes when content schemas change.
- Make contribution standards and extension points discoverable.
- Do not promise a particular open-source license until that decision is recorded.
- Track third-party asset and CodePen licensing separately from code inspiration.

## Staged delivery

### Stage A — Engine-friendly Longbarrow development (now)

- Keep rules data-driven where practical.
- Avoid unnecessary faction hard-coding.
- Add schemas/types for authored definitions.
- Preserve clean simulation, rendering, input, and UI boundaries.
- Record reusable-system candidates as they emerge.

### Stage B — Internal content packs

- Move Longbarrow faction definitions into explicit content modules.
- Prove that multiple factions can compose different mechanics without forks.
- Add validation and hot reload for development.

### Stage C — First external template

- Ship a minimal example RTS distinct from Longbarrow.
- Document how to create units, resources, production, win conditions, and lore.
- Provide a starter landing page and scenario.

### Stage D — Creator tools and mod SDK

- Editors, schema documentation, asset previews, diagnostics, packaging, and export.
- Compatibility/version tooling for mods and custom games.

### Stage E — Ecosystem

- Gallery or registry of community games and mods.
- Contribution guides and reusable extension packages.
- Stable APIs with migration support.

## Guardrails

- Longbarrow must remain a coherent game, not become a generic editor before its
  own core loop is compelling.
- The engine layer may not depend on Longbarrow lore, faction names, or art.
- Custom content must not bypass deterministic command and snapshot rules when it
  claims replay or multiplayer compatibility.
- User-authored scripts require a security model before arbitrary code is loaded
  from untrusted sources.
- Browser performance and static-host deployment remain first-class constraints.

## Success criteria

This vision is working when a technically comfortable creator can produce a
recognizably different RTS—different armies, economy, resources, lore, balance,
and presentation—without rewriting the fixed-tick simulation loop, renderer,
selection system, command pipeline, replay foundation, testing harness, or public
site infrastructure.
