# Save and Replay Development Tools

Longbarrow treats saves, replays, rollback, desync detection, and eventual
lockstep multiplayer as one deterministic systems family.

## Save files available now

Developer sandbox modes (`?dev=camera`, `battle`, `units`, `economy`, or
`performance`) expose four save controls:

- **Quick save** stores a snapshot in browser local storage.
- **Quick load** restores that browser snapshot in place.
- **Export save** downloads a portable JSON file.
- **Import save** validates and restores a JSON save.

A save contains:

- a dedicated format identifier and version;
- creation timestamp;
- map-generator version;
- simulation tick;
- complete plain-data `World` snapshot;
- deterministic state hash.

The loader rejects unknown formats, incompatible versions, map-generator
mismatches, inconsistent tick metadata, and state-hash mismatches. It does not
attempt a best-effort load because plausible-but-wrong state is more dangerous
than an explicit incompatibility message.

## Replays

`src/sim/replay.ts` already defines serializable player commands, recording,
validation, and deterministic playback from tick zero. Live browser input still
needs to be routed through the recorder before ordinary matches can export real
replays.

Planned order:

1. Route every human command through one live command gateway.
2. Add replay start/stop/export controls to the developer sandbox.
3. Add replay import and playback mode.
4. Add periodic snapshot keyframes for seeking.
5. Add hash checkpoints and divergence reporting.
6. Reuse the command stream and hashes for LAN lockstep.

AI commands remain unrecorded because AI state is deterministic simulation state
and playback re-derives its decisions.

## Optional cinematic replay director

Replay playback will include an optional camera-director layer. It is not part
of deterministic simulation and never changes the recorded match. Instead it
consumes plain replay events and chooses what the viewer should see.

Planned viewing modes:

- free camera;
- follow a selected unit or squad;
- event camera for important moments;
- cinematic director that ranks concurrent events and frames the strongest one.

The first pure policy foundation lives in `src/replay/director.ts`. It defines
serializable event kinds, importance scoring, shot-duration and switch-cooldown
rules, distance-aware ranking, and manual-camera override protection. Future
integration must add the event observer, smooth camera travel/framing, replay UI,
and optional event queue or picture-in-picture treatment.

Candidate events include battle starts, base breaches, destroyed structures,
high-value deaths, relic discoveries, territory swings, Mycora surges, major
resource swings, match points, and match end. The director must remain calm: it
should hold shots long enough to understand them, avoid rapid cuts, and yield to
manual input.
