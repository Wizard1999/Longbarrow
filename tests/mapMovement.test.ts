import { describe, expect, it } from 'vitest';
import { createWorld, simStep } from '../src/sim/world';
import { buildTestMap } from '../src/sim/map';
import { cmdAddChainStep, cmdFormSquad, cmdMove, cmdSetRally } from '../src/sim/commands';
import { circleInMapBoundary, mapBoundaryForSeed } from '../src/sim/mapBoundary';

describe('polygon-bound gameplay destinations', () => {
  it('clamps manual move destinations and keeps units on the board', () => {
    const world = buildTestMap(createWorld(1234));
    const unit = world.units.find(u => u.team === 'player')!;
    const boundary = mapBoundaryForSeed(world.mapSeed);
    cmdMove(world, [unit.id], 999, 999);
    expect(unit.target).not.toBeNull();
    expect(circleInMapBoundary(boundary, unit.target!.x, unit.target!.z, unit.radius)).toBe(true);
    for (let i = 0; i < 3000 && unit.target; i++) simStep(world);
    expect(circleInMapBoundary(boundary, unit.x, unit.z, unit.radius)).toBe(true);
  });

  it('clamps rallies and behaviour-chain steps when authored beyond the edge', () => {
    const world = buildTestMap(createWorld(4321));
    const boundary = mapBoundaryForSeed(world.mapSeed);
    const base = world.buildings.find(b => b.team === 'player')!;
    expect(cmdSetRally(world, base.id, -999, 999).ok).toBe(true);
    expect(circleInMapBoundary(boundary, base.rally.x, base.rally.z, 0.5)).toBe(true);

    const members = world.units.filter(u => u.team === 'player').slice(0, 2);
    const formed = cmdFormSquad(world, 'player', members.map(u => u.id), 1);
    expect(formed.ok).toBe(true);
    expect(formed.siteId).toBeDefined();
    const squad = world.squads.find(s => s.id === formed.siteId)!;
    expect(cmdAddChainStep(world, squad.id, 'move', 999, -999).ok).toBe(true);
    expect(circleInMapBoundary(boundary, squad.chain[0]!.x, squad.chain[0]!.z, 0.5)).toBe(true);
  });
});
