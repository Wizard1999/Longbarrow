import type {
  Building, BuildingTypeKey, ResourceNode, Team, Unit, UnitTypeKey, World,
} from '../core/types';
import { UNIT_TYPES } from '../data/units';
import { BUILDING_TYPES } from '../data/buildings';
import { ECON } from '../data/tuning';
import { rngNext } from '../core/rng';

export function spawnUnit(
  world: World, typeKey: UnitTypeKey, team: Team, x: number, z: number,
): Unit {
  const t = UNIT_TYPES[typeKey];
  const u: Unit = {
    id: world.nextId++,
    type: typeKey, team,
    x, z, prevX: x, prevZ: z,
    facing: 0, prevFacing: 0,
    speed: t.speed, radius: t.radius,
    target: null,
    selected: false,
    gather: t.isWorker ? { state: 'idle', nodeId: null, carrying: 0, timer: 0 } : null,
    build: t.isWorker ? { siteId: null } : null,
    hp: t.combat.hp,
    stillTicks: 0,
  };
  world.units.push(u);
  return u;
}

export function spawnBuilding(
  world: World, typeKey: BuildingTypeKey, team: Team, x: number, z: number,
): Building {
  const t = BUILDING_TYPES[typeKey];
  const b: Building = {
    id: world.nextId++,
    type: typeKey, team, x, z,
    radius: t.radius,
    queue: [],
    rally: { x, z: z + t.radius + 2.5 },
  };
  world.buildings.push(b);
  return b;
}

export function spawnResourceNode(
  world: World, x: number, z: number, amount?: number,
): ResourceNode {
  const n: ResourceNode = {
    id: world.nextId++,
    x, z,
    amount: amount ?? ECON.nodeCapacity,
    maxAmount: amount ?? ECON.nodeCapacity,
  };
  world.nodes.push(n);
  return n;
}

export function spawnSquad(
  world: World, typeKey: UnitTypeKey, team: Team, cx: number, cz: number, count: number,
): Unit[] {
  const out: Unit[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    out.push(spawnUnit(world, typeKey, team, cx + Math.cos(angle) * 1.6, cz + Math.sin(angle) * 1.6));
  }
  return out;
}

/**
 * Scenery is part of the *map*, so it draws from a map-seeded generator passed
 * in — never from `world.rngState`, the match generator.
 *
 * If it drew from the match generator, generating a map would advance match
 * randomness, and two matches on the same map would diverge purely because one
 * of them previewed the map first. It would also make a map browser impossible:
 * previewing a seed would corrupt the match you then played on it.
 */
export function generateScenery(
  world: World, count: number, rng: { rngState: number },
): void {
  for (let i = 0; i < count; i++) {
    const x = (rngNext(rng) - 0.5) * 64;
    const z = (rngNext(rng) - 0.5) * 64;
    const kind = rngNext(rng) < 0.5 ? 'rock' : 'tree';
    const scale = 0.6 + rngNext(rng) * 0.6;
    const spin = rngNext(rng) * Math.PI * 2;
    // keep clear of both bases and both resource clusters
    const nearBuilding = world.buildings.some(b => Math.hypot(x - b.x, z - b.z) < 7);
    const nearNode = world.nodes.some(n => Math.hypot(x - n.x, z - n.z) < 5);
    if (nearBuilding || nearNode) continue;
    world.scenery.push({ kind, x, z, scale, spin });
  }
}
