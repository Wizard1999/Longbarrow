import { describe, expect, it } from 'vitest';
import { createWorld, simStep } from '../src/sim/world';
import { spawnUnit } from '../src/sim/entities';
import { cmdAttackMove, cmdHoldPosition, cmdMove, cmdPatrol, cmdStop } from '../src/sim/commands';

describe('direct RTS orders', () => {
  it('attack-move is serializable intent and finishes idle at the destination', () => {
    const w = createWorld(1);
    const u = spawnUnit(w, 'legionnaire', 'player', 0, 0);
    cmdAttackMove(w, [u.id], 2, 0);
    expect(u.orderMode).toBe('attackMove');
    for (let i = 0; i < 300 && u.target; i++) simStep(w);
    expect(u.target).toBeNull();
    expect(u.orderMode).toBe('idle');
  });

  it('patrol reverses direction after reaching an endpoint', () => {
    const w = createWorld(2);
    const u = spawnUnit(w, 'legionnaire', 'player', 0, 0);
    cmdPatrol(w, [u.id], 2, 0);
    for (let i = 0; i < 300 && u.patrolHeading === 'to'; i++) simStep(w);
    expect(u.orderMode).toBe('patrol');
    expect(u.patrolHeading).toBe('from');
    expect(u.target).not.toBeNull();
  });

  it('stop clears movement while hold records a persistent stance', () => {
    const w = createWorld(3);
    const u = spawnUnit(w, 'legionnaire', 'player', 0, 0);
    cmdMove(w, [u.id], 5, 0);
    cmdStop(w, [u.id]);
    expect(u.target).toBeNull();
    expect(u.orderMode).toBe('idle');
    cmdHoldPosition(w, [u.id]);
    expect(u.orderMode).toBe('hold');
    expect(u.target).toBeNull();
  });
});
