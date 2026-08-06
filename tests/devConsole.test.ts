import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { buildTestMap } from '../src/sim/map';
import { spawnUnit } from '../src/sim/entities';
import { hash } from '../src/sim/snapshot';
import {
  DEV_SPAWN_LIMIT, cmdDevGrantResources, cmdDevKill, cmdDevSpawn, cmdSetDevMode,
} from '../src/sim/dev';
import { Recorder, dispatch } from '../src/sim/replay';
import { run, stock } from './helpers';
import {
  applyDevRequest, parseDevCommand,
} from '../src/ui/devConsole';
import type { DevConsoleHost } from '../src/ui/devConsole';
import type { World } from '../src/core/types';

const fresh = (seed = 1337) => buildTestMap(createWorld(seed));

/** Dev mode on, via the real command, so the gate is exercised rather than bypassed. */
function devOn(w: World): World {
  expect(cmdSetDevMode(w, true).ok).toBe(true);
  return w;
}

describe('dev commands are gated', () => {
  it('a fresh world has cheats off', () => {
    expect(fresh().devMode).toBe(false);
  });

  it('refuses every cheat while dev mode is off', () => {
    const w = fresh();
    expect(cmdDevGrantResources(w, 'player', 500).ok).toBe(false);
    expect(cmdDevSpawn(w, 'worker', 'player', 3, 0, 0).ok).toBe(false);
    expect(cmdDevKill(w, [1]).ok).toBe(false);
  });

  it('changes nothing at all when refused', () => {
    const w = fresh();
    const before = hash(w);
    cmdDevGrantResources(w, 'player', 9999);
    cmdDevSpawn(w, 'worker', 'player', 10, 0, 0);
    expect(hash(w)).toBe(before);
  });

  it('will not enable twice, so the replay carries no redundant commands', () => {
    const w = devOn(fresh());
    expect(cmdSetDevMode(w, true).ok).toBe(false);
    expect(cmdSetDevMode(w, false).ok).toBe(true);
  });

  it('is part of the state hash, so a clean match is provable', () => {
    const a = fresh();
    const b = fresh();
    expect(hash(a)).toBe(hash(b));
    devOn(b);
    expect(hash(a)).not.toBe(hash(b));
  });
});

describe('dev command behaviour', () => {
  it('grants resources and never drops below zero', () => {
    const w = devOn(fresh());
    cmdDevGrantResources(w, 'player', 250);
    expect(stock(w, 'player')).toBe(250);
    cmdDevGrantResources(w, 'player', -1000);
    expect(stock(w, 'player')).toBe(0);
  });

  it('floors fractional grants, so two peers cannot disagree', () => {
    const w = devOn(fresh());
    cmdDevGrantResources(w, 'player', 10.7);
    expect(stock(w, 'player')).toBe(10);
  });

  it('rejects a non-numeric grant', () => {
    const w = devOn(fresh());
    expect(cmdDevGrantResources(w, 'player', Number.NaN).ok).toBe(false);
  });

  it('spawns the requested count', () => {
    const w = devOn(fresh());
    const before = w.units.length;
    expect(cmdDevSpawn(w, 'worker', 'rival', 5, 0, 0).ok).toBe(true);
    expect(w.units.length).toBe(before + 5);
    expect(w.units.slice(-5).every(u => u.team === 'rival')).toBe(true);
  });

  it('clamps a silly spawn count rather than hanging', () => {
    const w = devOn(fresh());
    const before = w.units.length;
    cmdDevSpawn(w, 'worker', 'player', 10_000, 0, 0);
    expect(w.units.length).toBe(before + DEV_SPAWN_LIMIT);
  });

  it('refuses an unknown unit type', () => {
    const w = devOn(fresh());
    // Cast: the point is that a bad key coming from console text is refused.
    expect(cmdDevSpawn(w, 'catapult' as 'worker', 'player', 1, 0, 0).ok).toBe(false);
  });

  it('kills by id and clears references to the dead', () => {
    const w = devOn(fresh());
    const victim = spawnUnit(w, 'legionnaire', 'rival', 4, 4);
    const hunter = spawnUnit(w, 'legionnaire', 'player', 4.5, 4);
    hunter.targetId = victim.id;
    expect(cmdDevKill(w, [victim.id]).ok).toBe(true);
    expect(w.units.some(u => u.id === victim.id)).toBe(false);
    // A dangling targetId would outlive its unit and could be re-matched to a
    // later entity reusing the id.
    expect(hunter.targetId).toBeNull();
  });

  it('removes killed units from their squads', () => {
    const w = devOn(fresh());
    const u = spawnUnit(w, 'legionnaire', 'player', 2, 2);
    w.squads.push({
      id: 9001, team: 'player', number: 1, memberIds: [u.id], chain: [], index: 0,
      running: false, loop: true, dispatched: false, stepTicks: 0,
      patrolFrom: null, patrolTo: null, patrolHeading: 'to',
    });
    cmdDevKill(w, [u.id]);
    expect(w.squads[0]?.memberIds).toEqual([]);
  });

  it('refuses a kill that matches nothing', () => {
    const w = devOn(fresh());
    expect(cmdDevKill(w, [999_999]).ok).toBe(false);
    expect(cmdDevKill(w, []).ok).toBe(false);
  });

  it('leaves the world steppable after a kill', () => {
    const w = devOn(fresh());
    const u = spawnUnit(w, 'worker', 'player', 3, 3);
    cmdDevKill(w, [u.id]);
    expect(() => run(w, 30)).not.toThrow();
  });
});

describe('dev commands replay identically (D-008)', () => {
  // The whole reason cheats are commands. If a dev session did not reproduce,
  // every bug found with the console would be unreproducible from its replay.
  it('a cheated session reaches the same hash when replayed', () => {
    const live = fresh();
    const recorder = new Recorder(1337, 8, 1337, 'none');

    const script = [
      { t: 'devMode', enabled: true },
      { t: 'devGrant', team: 'player', amount: 750 },
      { t: 'devSpawn', team: 'rival', unit: 'legionnaire', count: 4, x: 6, z: -3 },
    ] as const;

    for (const cmd of script) {
      recorder.record(live, cmd);
      dispatch(live, cmd);
    }
    run(live, 60);
    const killIds = live.units.filter(u => u.team === 'rival').slice(0, 2).map(u => u.id);
    const killCmd = { t: 'devKill', units: killIds } as const;
    recorder.record(live, killCmd);
    dispatch(live, killCmd);
    run(live, 60);

    const replay = recorder.finish(live);
    const rebuilt = fresh();
    let at = 0;
    for (const tc of replay.commands) {
      while (at < tc.tick) { run(rebuilt, 1); at++; }
      dispatch(rebuilt, tc.cmd);
    }
    while (at < live.tick) { run(rebuilt, 1); at++; }

    expect(hash(rebuilt)).toBe(hash(live));
  });

  it('a replay of a cheated session still reports dev mode', () => {
    const w = fresh();
    dispatch(w, { t: 'devMode', enabled: true });
    expect(w.devMode).toBe(true);
  });
});

describe('console grammar', () => {
  it('accepts commands with or without the leading slash', () => {
    expect(parseDevCommand('/help').kind).toBe('help');
    expect(parseDevCommand('help').kind).toBe('help');
  });

  it('parses a grant with an explicit team', () => {
    expect(parseDevCommand('/add 500 enemy')).toEqual({
      kind: 'grant', amount: 500, team: 'rival', resource: null,
    });
  });

  it('defaults a grant to the player', () => {
    expect(parseDevCommand('/add 500')).toMatchObject({ team: 'player' });
  });

  it('parses a spawn, defaulting count and team', () => {
    expect(parseDevCommand('/spawn worker')).toEqual({
      kind: 'spawn', unit: 'worker', count: 1, team: 'player',
    });
  });

  it('clamps a spawn count in the grammar too', () => {
    expect(parseDevCommand('/spawn worker 99999')).toMatchObject({ count: DEV_SPAWN_LIMIT });
  });

  it('is case-insensitive about verbs, types and teams', () => {
    expect(parseDevCommand('/SPAWN Worker 2 RIVAL')).toEqual({
      kind: 'spawn', unit: 'worker', count: 2, team: 'rival',
    });
  });

  it('reports unknown verbs, types and teams instead of guessing', () => {
    expect(parseDevCommand('/nope').kind).toBe('error');
    expect(parseDevCommand('/spawn dragon').kind).toBe('error');
    expect(parseDevCommand('/add 5 nobody').kind).toBe('error');
    expect(parseDevCommand('').kind).toBe('error');
  });

  it('treats a bare toggle as on for on/off commands', () => {
    expect(parseDevCommand('/pause')).toEqual({ kind: 'pause', on: 'toggle' });
    expect(parseDevCommand('/pause off')).toEqual({ kind: 'pause', on: false });
    expect(parseDevCommand('/reveal on')).toEqual({ kind: 'reveal', on: true });
  });

  it('caps /tick so a paused tab cannot be hung by a typo', () => {
    expect(parseDevCommand('/tick 100000')).toMatchObject({ kind: 'tick', count: 600 });
    expect(parseDevCommand('/tick').kind).toBe('tick');
  });

  it('caps /speed and rejects nonsense', () => {
    expect(parseDevCommand('/speed 1000')).toMatchObject({ value: 16 });
    expect(parseDevCommand('/speed 0').kind).toBe('error');
    expect(parseDevCommand('/speed fast').kind).toBe('error');
  });
});

describe('console dispatch', () => {
  function host(): DevConsoleHost & { paused: boolean; speed: number; steps: number; revealed: boolean } {
    const state = { paused: false, speed: 1, steps: 0, revealed: false };
    return {
      ...state,
      setPaused(on) { this.paused = on; },
      isPaused() { return this.paused; },
      setSpeed(x) { this.speed = x; },
      getSpeed() { return this.speed; },
      stepOnce() { this.steps++; },
      setRevealAll(on) { this.revealed = on; },
      isRevealAll() { return this.revealed; },
      spawnPoint: () => ({ x: 5, z: -5 }),
    } as DevConsoleHost & typeof state;
  }

  it('routes host commands to the host and not to the world', () => {
    const w = fresh();
    const h = host();
    const before = hash(w);

    applyDevRequest(w, h, { kind: 'pause', on: true });
    applyDevRequest(w, h, { kind: 'speed', value: 4 });
    applyDevRequest(w, h, { kind: 'reveal', on: true });

    expect(h.paused).toBe(true);
    expect(h.speed).toBe(4);
    expect(h.revealed).toBe(true);
    // Pacing and fog are presentation. None of it may touch sim state, or a
    // replay of the session would diverge.
    expect(hash(w)).toBe(before);
  });

  it('toggles pause and reveal against current host state', () => {
    const w = fresh();
    const h = host();
    h.paused = true;
    applyDevRequest(w, h, { kind: 'pause', on: 'toggle' });
    expect(h.paused).toBe(false);
  });

  it('/tick advances exactly the requested number of steps', () => {
    const w = fresh();
    const h = host();
    applyDevRequest(w, h, { kind: 'tick', count: 7 });
    expect(h.steps).toBe(7);
  });

  it('/kill acts on the selection and says so when there is none', () => {
    const w = devOn(fresh());
    const h = host();
    expect(applyDevRequest(w, h, { kind: 'kill' })).toEqual(['nothing selected']);

    const u = spawnUnit(w, 'legionnaire', 'player', 1, 1);
    u.selected = true;
    applyDevRequest(w, h, { kind: 'kill' });
    expect(w.units.some(x => x.id === u.id)).toBe(false);
  });

  it('surfaces the refusal when cheats are off', () => {
    const w = fresh();
    const h = host();
    expect(applyDevRequest(w, h, { kind: 'grant', amount: 100, team: 'player', resource: null }))
      .toEqual(['dev mode is off']);
  });

  it('spawns at the host spawn point', () => {
    const w = devOn(fresh());
    const h = host();
    applyDevRequest(w, h, { kind: 'spawn', unit: 'worker', count: 1, team: 'player' });
    const spawned = w.units[w.units.length - 1];
    expect(spawned?.x).toBeCloseTo(6.6, 1);
    expect(spawned?.z).toBeCloseTo(-5, 1);
  });

  it('/help lists something', () => {
    const w = fresh();
    expect(applyDevRequest(w, host(), { kind: 'help' }).length).toBeGreaterThan(4);
  });
});
