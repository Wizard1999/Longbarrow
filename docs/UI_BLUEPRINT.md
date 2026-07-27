# RTS Command & User Interface Blueprint

> Status: **locked as direction**, not yet implemented. This is the target the
> UI grows toward. Current HUD (`src/ui/hud.ts`) is Level 1 only.

## Core Design Philosophy

The UI exists to express **intent**, not to compensate for mechanical execution.

The player is not controlling individual soldiers — although that remains
possible in the traditional StarCraft sense, it is simply typically worse. The
player acts as an **Operations Commander**, issuing objectives and doctrine to
an army capable of executing orders intelligently.

The interface should always ask *"What are you trying to accomplish?"* rather
than *"Where do you want this unit to stand?"*

Minimize unnecessary clicks. Maximize strategic expression.

## Primary Design Principles

### 1. Every click represents intent

Never require multiple clicks simply because the game lacks automation.

| Good | Bad |
|---|---|
| Assign mission | Repeatedly right-clicking the same destination |
| Set doctrine | Constant worker babysitting |
| Choose priority | Reissuing identical commands |

### 2. The player issues intent

The player decides objectives, priorities, formations, doctrine, fallback plans
and logistics. The simulation executes those instructions.

### 3. Information, never advice

The interface communicates **facts**, never recommendations.

| Good | Bad |
|---|---|
| Enemy Hero Sighted | Retreat Recommended |
| Bridge Destroyed | You Should Attack |
| Squad Taking Casualties | Low Success Chance |
| Mission Interrupted | |

The player owns every decision.

### 4. Strategy before mechanics

Expressing strategy should be effortless. Difficulty comes from choosing the
correct strategy — never from fighting the interface.

## ⚠️ Camera change pending (D-014)

This blueprint was written against a traditional RTS viewport. The camera is
being replaced by a **war table**: the map as a hologram in empty space, viewed
from any angle, with the player scaling from miniature to enormous.

Most of this document is unaffected — missions, doctrine, squad cards and the
operations log are all camera-independent. Two things need revisiting:

- **The minimap** may be redundant when the whole table is already visible at a
  glance, or may become a *fast travel* control rather than an overview.
- **World-space mission indicators** become considerably more valuable, since
  the player can fly down to read them directly.

## Screen Layout

```
─────────────────────────────────────────────────────────────
 Mission Panel          Resources               Minimap
─────────────────────────────────────────────────────────────

                       Battlefield
                    (85–90% of screen)

─────────────────────────────────────────────────────────────
 Selected Mission / Squad Information
─────────────────────────────────────────────────────────────
 Command Builder / Doctrine Editor
─────────────────────────────────────────────────────────────
```

The battlefield always occupies the majority of the screen.

## HUD Components

### Resources

Simple and readable — Material, Essence, Dominion, Relics. No clutter.

> ⚠️ Resource names are **not yet settled** — see `GAME_DESIGN.md § 11.1`.
> "Essence" and "Dominion" were floated early and never formally adopted.
> Resolve before building this panel.

### Mission Panel

Shows current *operations* rather than control groups:

```
Mission          Secure Western Ridge
Status           Executing
Priority         High
Assigned Squads  2, 5
Commander        Guardian Hero
Objective        Hold High Ground
```

The player thinks in operations rather than individual units.

### Minimap

A strategic intelligence display, not merely a position readout. Shows vision,
terrain changes (destroyed forests, destroyed bridges, removed cliffs), current
missions, squad routes, known enemy sightings, recent activity, PvE objectives
and environmental events.

## Selection Philosophy

Selecting units immediately asks for intent:

```
Create Mission
  □ Assault   □ Defend   □ Scout   □ Escort
  □ Expand    □ Harvest  □ Custom
```

The player's first interaction is defining intent.

## Mission Objects

Missions are **first-class simulation objects**. Each contains:

Mission Name · Objective · Priority · Assigned Squads · Assigned Heroes ·
Formation · Doctrine · Fallback Position · Completion Condition ·
Failure Condition · Support Requirements · Current Status

Missions persist until completed, cancelled, or replaced.

## Squad Hierarchy

```
Player → Army → Mission → Squad → Individual Unit
```

The player rarely interacts below the Squad level. Individual unit control
remains possible but is exceptional.

## Squad Cards

Instead of unit portraits, every squad communicates its purpose immediately:

```
Squad One    Holding   Hill Alpha
Squad Two    Raiding   Enemy East
Squad Three  Building  Forward Fortress
```

## Command Builder

The heart of the game. Players assemble behaviour from simple visual blocks —
no scripting language, no programming knowledge required.

```
Move → Capture Hill → Hold Position → If Enemy Retreats
     → Advance → Return → Repeat
```

### Command Categories

**Movement** — Move, Advance, Retreat, Hold Position, Patrol, Escort,
Circle Area, Follow, Regroup

**Combat** — Attack, Defend, Focus Hero, Destroy Buildings, Ignore Workers,
Protect Target, Intercept, Pursue, Hold Fire

**Terrain** — Secure High Ground, Destroy Forest, Build Bridge, Collapse Bridge,
Destroy Cliff, Fortify Position, Watch Area

**Economy** — Harvest, Expand, Repair, Refine, Transport Resources,
Gather Relic, Build Infrastructure

**Logic** — If, Else, Repeat, Until, Wait, Timeout, Priority, Cancel, Branch

These blocks stay **intentionally limited** to preserve accessibility.

## Doctrine Templates

Most players should never build doctrine from scratch. The game ships with
templates players gradually modify into their own styles:

```
Raid     Move → Attack Economy → Retreat At 30% → Return
Scout    Move → Observe → Signal Allies → Avoid Combat → Repeat
Defend   Capture Position → Hold → Counterattack → Return
```

## Doctrine Library

Reusable collections, saveable, renameable, importable, exportable, shareable:

- **Economy** — Greedy Expansion, Safe Expansion, Early Tech
- **Military** — Pincer Assault, Delayed Push, Defensive Hold, Counterattack
- **Terrain** — Forest Control, Ridge Defense, Bridge Demolition

## Mission Visualization

Selecting a mission displays movement arrows, formation positions, fallback
lines, support routes, logistics routes, attack direction, and the objective
marker. The map becomes a tactical planning board.

## Communication System

Avoid repetitive notifications. Instead: Mission Started · Mission Complete ·
Mission Interrupted · Mission Failed · Enemy Hero Sighted · Bridge Destroyed ·
Forest Cleared · Dominion Mine Exhausted · Squad Regrouping.

Clear. Professional. Minimal.

## Operations Log

Chronological battlefield events. Clicking an event moves the camera to it.

```
15:01  Squad Three reached Hill Alpha
15:10  Enemy Hero Sighted
15:18  Bridge Destroyed
15:30  Dominion Mine Exhausted
```

## Hero Interface

Heroes primarily unlock **doctrine** rather than active abilities:

- **Commander** — Coordinated Advance, Organized Withdrawal, Multi-Squad Assault
- **Guardian** — Hold Until Reinforced, Defensive Formation, Area Fortification
- **Engineer** — Bridge Construction, Rapid Fortification, Terrain Restoration

Heroes change how armies *think*, not simply how much damage they deal.

## Worker Interface

Never notify "Worker Idle". Instead notify at the **system** level:

- Northern Harvest Chain Interrupted
- Southern Logistics Delayed
- Expansion Construction Paused

The player manages systems, not individuals.

## Three Command Depths

| Level | What | For |
|---|---|---|
| **1 — Traditional RTS** | Move, Attack, Gather, Build | Every player |
| **2 — Mission System** | Objectives, formations, behaviours, priorities, support | The primary gameplay layer |
| **3 — Doctrine Editor** | Custom chains, conditional logic, reusable templates, squad specializations, automated responses | Optional for beginners, essential for mastery |

## World-Space Mission Indicators

Every squad visibly displays its current mission:

```
🛡 Hold   ⚔ Assault   👁 Scout   ⛏ Harvest   🌉 Construct   🏃 Raid
```

Zoomed out, players immediately understand battlefield *intent* rather than
merely unit positions.

## Doctrine as a Strategic Asset

Doctrine is editable outside of matches. Players build libraries, version them,
share them, import/export, assign defaults, and create race-specific sets.
Doctrine preparation becomes analogous to build-order preparation in classic RTS.

## Spectator Integration

Observers can inspect any mission and immediately see objective, assigned
squads, formation, doctrine, priority, planned routes, fallback position and
current status. This dramatically improves watchability.

## Final UI Philosophy

The interface should never make the player feel like they are clicking faster
than their opponent. It should make them feel like they are **commanding an
intelligent army**.

The battlefield should resemble a living operational plan where every squad has
a purpose, every mission has intent, and every action contributes to a larger
strategic vision.

**The player does not control units. The player commands operations.**

---

## Implementation gap (as of 2026-07-27)

| Blueprint element | Status |
|---|---|
| Level 1 commands (move/attack/gather/build) | ✅ built |
| Squads as persistent objects | ✅ built (`sim/squads.ts`) |
| Behaviour chains | ◐ partial — chain editor exists, block set is small |
| Command bandwidth gating automation | ✅ built (`AUTOMATION.commandPerSlot`) |
| Missions as first-class sim objects | ❌ not started |
| Mission panel / squad cards | ❌ not started |
| Doctrine templates + library | ❌ not started |
| Operations log | ❌ not started |
| Minimap | ❌ not started |
| World-space mission indicators | ❌ not started |
| Hero doctrine unlocks | ❌ not started |

**The biggest architectural implication:** *Mission* must become a real entity
in `src/sim/`, owned by the simulation and serialized in replays — not a UI
construct. Squads currently carry behaviour chains directly; Missions should sit
above squads and own the objective, priority, fallback and completion
conditions. Plan this before building the mission UI, not after.
