import type { Team, UnitTypeKey, World } from '../core/types';
import { UNIT_TYPES } from '../data/units';
import { RESOURCES, RESOURCE_ORDER } from '../data/resources';
import type { ResourceId } from '../data/resources';
import { DEV_SPAWN_LIMIT } from '../sim/dev';
import { cmdDevGrantResources, cmdDevKill, cmdDevSpawn, cmdSetDevMode } from '../sim/dev';
import { issueCommand } from '../replay/live';

/**
 * In-game developer console. Backtick to open.
 *
 * Two kinds of command live here and they are deliberately kept apart:
 *
 *  - **Simulation commands** (`/dev`, `/add`, `/spawn`, `/kill`) change game
 *    state, so they route through `issueCommand` into the replay stream exactly
 *    like a player order. A cheat that mutated the world directly would make
 *    every replay of that session diverge from the moment it was used.
 *  - **Host commands** (`/pause`, `/speed`, `/tick`, `/reveal`) change how the
 *    session is being *observed* — loop pacing and fog presentation — and are
 *    not simulation state at all. Recording them would put no-ops in the replay
 *    and imply the sim knows what "paused" means. It does not, and should not:
 *    the sim only knows ticks.
 *
 * Parsing is a pure function (`parseDevCommand`) with no DOM involvement, which
 * is what makes the grammar testable in the headless test environment.
 */

/** What a typed line asks for, before anything is resolved against the world. */
export type DevRequest =
  | { kind: 'help' }
  | { kind: 'clear' }
  | { kind: 'devMode'; enabled: boolean }
  | { kind: 'grant'; amount: number; team: Team; resource: ResourceId | null }
  | { kind: 'spawn'; unit: UnitTypeKey; count: number; team: Team }
  | { kind: 'kill' }
  | { kind: 'pause'; on: boolean | 'toggle' }
  | { kind: 'speed'; value: number }
  | { kind: 'tick'; count: number }
  | { kind: 'reveal'; on: boolean | 'toggle' }
  | { kind: 'error'; message: string };

/** Callbacks for everything that is presentation or pacing, not simulation. */
export interface DevConsoleHost {
  setPaused: (on: boolean) => void;
  isPaused: () => boolean;
  setSpeed: (x: number) => void;
  getSpeed: () => number;
  stepOnce: () => void;
  setRevealAll: (on: boolean) => void;
  isRevealAll: () => boolean;
  /** Where `/spawn` puts things — usually what the camera is looking at. */
  spawnPoint: () => { x: number; z: number };
}

export interface DevConsole {
  /** Handle a key press. Returns true if the console consumed it. */
  handleKey: (e: KeyboardEvent) => boolean;
  isOpen: () => boolean;
  /** Run a line as if typed. Returns the lines printed in response. */
  run: (line: string) => string[];
}

const TEAM_WORDS: Record<string, Team> = {
  player: 'player', me: 'player', mine: 'player', p: 'player',
  rival: 'rival', enemy: 'rival', ai: 'rival', r: 'rival',
};

const MAX_SPEED = 16;

function parseTeam(word: string | undefined, fallback: Team): Team | null {
  if (word === undefined) return fallback;
  return TEAM_WORDS[word.toLowerCase()] ?? null;
}

function parseOnOff(word: string | undefined): boolean | 'toggle' | null {
  if (word === undefined) return 'toggle';
  const w = word.toLowerCase();
  if (w === 'on' || w === 'true' || w === '1') return true;
  if (w === 'off' || w === 'false' || w === '0') return false;
  return null;
}

/**
 * Parse one console line.
 *
 * Pure and world-independent on purpose: it validates *grammar*, not game state.
 * Whether a unit type exists is grammar (the data table says so); whether dev
 * mode is on is state, and belongs to the simulation command that enforces it —
 * duplicating that check here would let the two disagree.
 */
export function parseDevCommand(line: string): DevRequest {
  const trimmed = line.trim().replace(/^\//, '');
  if (!trimmed) return { kind: 'error', message: 'type /help for commands' };
  const [verb, ...args] = trimmed.split(/\s+/);
  const v = (verb ?? '').toLowerCase();

  switch (v) {
    case 'help': case '?': return { kind: 'help' };
    case 'clear': return { kind: 'clear' };

    case 'dev': case 'cheats': {
      const on = parseOnOff(args[0]);
      if (on === null) return { kind: 'error', message: 'usage: /dev [on|off]' };
      return { kind: 'devMode', enabled: on === 'toggle' ? true : on };
    }

    case 'add': case 'give': {
      const amount = Number(args[0]);
      if (!Number.isFinite(amount)) {
        return { kind: 'error', message: `usage: /add <amount> [${RESOURCE_ORDER.join('|')}|all] [team]` };
      }
      // Resource is optional and may be omitted entirely, in which case the
      // next word is the team. Checked against the registry, never a list here.
      let rest = args.slice(1);
      let resource: ResourceId | null = null;
      const first = (rest[0] ?? '').toLowerCase();
      if (first && first !== 'all') {
        const match = RESOURCE_ORDER.find(id => id.toLowerCase() === first);
        if (match) { resource = match; rest = rest.slice(1); }
      } else if (first === 'all') {
        rest = rest.slice(1);
      }
      const team = parseTeam(rest[0], 'player');
      if (!team) return { kind: 'error', message: `unknown team '${rest[0]}'` };
      return { kind: 'grant', amount, team, resource };
    }

    case 'spawn': {
      const raw = (args[0] ?? '').toLowerCase();
      // Validated against the data table rather than a list written here, so a
      // new unit type is spawnable the moment it is declared (D-029).
      const keys = Object.keys(UNIT_TYPES) as UnitTypeKey[];
      const unit = keys.find(k => k.toLowerCase() === raw);
      if (!unit) {
        return { kind: 'error', message: `usage: /spawn <${keys.join('|')}> [count] [team]` };
      }
      const count = args[1] === undefined ? 1 : Number(args[1]);
      if (!Number.isFinite(count) || count < 1) {
        return { kind: 'error', message: 'count must be a positive number' };
      }
      const team = parseTeam(args[2], 'player');
      if (!team) return { kind: 'error', message: `unknown team '${args[2]}'` };
      return { kind: 'spawn', unit, count: Math.min(DEV_SPAWN_LIMIT, Math.floor(count)), team };
    }

    case 'kill': return { kind: 'kill' };

    case 'pause': {
      const on = parseOnOff(args[0]);
      if (on === null) return { kind: 'error', message: 'usage: /pause [on|off]' };
      return { kind: 'pause', on };
    }

    case 'speed': {
      const value = Number(args[0]);
      if (!Number.isFinite(value) || value <= 0) {
        return { kind: 'error', message: 'usage: /speed <multiplier>' };
      }
      return { kind: 'speed', value: Math.min(MAX_SPEED, value) };
    }

    case 'tick': {
      const count = args[0] === undefined ? 1 : Number(args[0]);
      if (!Number.isFinite(count) || count < 1) {
        return { kind: 'error', message: 'usage: /tick [count]' };
      }
      // Capped: /tick 100000 while paused would hang the tab, which reads as a
      // crash rather than as a slow command.
      return { kind: 'tick', count: Math.min(600, Math.floor(count)) };
    }

    case 'reveal': {
      const on = parseOnOff(args[0]);
      if (on === null) return { kind: 'error', message: 'usage: /reveal [on|off]' };
      return { kind: 'reveal', on };
    }

    default:
      return { kind: 'error', message: `unknown command '${v}' — try /help` };
  }
}

export const DEV_HELP: readonly string[] = [
  '/dev [on|off]          enable cheats (recorded into the replay)',
  '/add <n> [res|all] [team]  grant resources',
  '/spawn <type> [n] [team]  spawn units at the camera focus',
  '/kill                  kill the current selection',
  '/pause [on|off]        pause the simulation',
  '/speed <x>             simulation speed multiplier',
  '/tick [n]              advance n ticks while paused',
  '/reveal [on|off]       reveal the whole map (presentation only)',
  '/clear                 clear this log',
];

/**
 * Apply a parsed request. Exported separately from the DOM so the mapping from
 * request to command is testable without a browser.
 */
export function applyDevRequest(
  world: World, host: DevConsoleHost, req: DevRequest,
): string[] {
  switch (req.kind) {
    case 'help': return [...DEV_HELP];
    case 'clear': return [];
    case 'error': return [req.message];

    case 'devMode': {
      const r = issueCommand({ t: 'devMode', enabled: req.enabled },
        () => cmdSetDevMode(world, req.enabled));
      if (!r.ok) return [r.reason ?? 'refused'];
      return [req.enabled
        ? 'dev mode ON — this session is flagged in its replay and state hash'
        : 'dev mode off'];
    }

    case 'grant': {
      const r = issueCommand(
        { t: 'devGrant', team: req.team, amount: req.amount, resource: req.resource },
        () => cmdDevGrantResources(world, req.team, req.amount, req.resource),
      );
      if (!r.ok) return [r.reason ?? 'refused'];
      const bag = world.resources[req.team];
      return [`${req.team}: ` + RESOURCE_ORDER
        .map(id => `${RESOURCES[id].label} ${Math.floor(bag[id])}`).join(' · ')];
    }

    case 'spawn': {
      const at = host.spawnPoint();
      const r = issueCommand(
        { t: 'devSpawn', team: req.team, unit: req.unit, count: req.count, x: at.x, z: at.z },
        () => cmdDevSpawn(world, req.unit, req.team, req.count, at.x, at.z),
      );
      return [r.ok
        ? `spawned ${req.count} × ${req.unit} (${req.team})`
        : r.reason ?? 'refused'];
    }

    case 'kill': {
      const ids = world.units.filter(u => u.selected).map(u => u.id);
      if (!ids.length) return ['nothing selected'];
      const r = issueCommand({ t: 'devKill', units: ids }, () => cmdDevKill(world, ids));
      return [r.ok ? `killed ${ids.length}` : r.reason ?? 'refused'];
    }

    case 'pause': {
      const on = req.on === 'toggle' ? !host.isPaused() : req.on;
      host.setPaused(on);
      return [on ? 'paused' : 'running'];
    }

    case 'speed': {
      host.setSpeed(req.value);
      return [`speed ${host.getSpeed()}×`];
    }

    case 'tick': {
      for (let i = 0; i < req.count; i++) host.stepOnce();
      return [`tick ${world.tick}`];
    }

    case 'reveal': {
      const on = req.on === 'toggle' ? !host.isRevealAll() : req.on;
      host.setRevealAll(on);
      return [on ? 'map revealed (presentation only)' : 'fog restored'];
    }
  }
}

export function createDevConsole(world: World, host: DevConsoleHost): DevConsole {
  const root = document.getElementById('devconsole');
  const log = document.getElementById('devconsole-log');
  const input = document.getElementById('devconsole-input') as HTMLInputElement | null;
  if (!root || !log || !input) {
    return { handleKey: () => false, isOpen: () => false, run: () => [] };
  }

  const history: string[] = [];
  let historyAt = -1;
  let open = false;

  function print(lines: readonly string[]): void {
    for (const line of lines) {
      const el = document.createElement('div');
      el.className = 'devconsole-line';
      el.textContent = line;
      log!.append(el);
    }
    log!.scrollTop = log!.scrollHeight;
  }

  function run(line: string): string[] {
    const req = parseDevCommand(line);
    const out = applyDevRequest(world, host, req);
    if (req.kind === 'clear') log!.replaceChildren();
    else print([`› ${line.trim()}`, ...out]);
    return out;
  }

  function setOpen(next: boolean): void {
    open = next;
    root!.hidden = !open;
    if (open) input!.focus();
    else input!.blur();
  }

  function recall(delta: number): void {
    if (!history.length) return;
    historyAt = Math.max(0, Math.min(history.length - 1, historyAt + delta));
    input!.value = history[historyAt] ?? '';
  }

  function handleKey(e: KeyboardEvent): boolean {
    // Backquote toggles. Checked before the open test so the same key closes it.
    if (e.key === '`' || e.key === '~') { setOpen(!open); return true; }
    if (!open) return false;

    if (e.key === 'Escape') { setOpen(false); return true; }
    if (e.key === 'Enter') {
      const line = input!.value;
      if (line.trim()) {
        history.unshift(line);
        run(line);
      }
      input!.value = '';
      historyAt = -1;
      return true;
    }
    if (e.key === 'ArrowUp') { recall(1); return true; }
    if (e.key === 'ArrowDown') { recall(-1); return true; }
    // Everything else is swallowed while open, so typing "s" in the console does
    // not also trigger the stop-order hotkey.
    return true;
  }

  print(['Greenmantle dev console — /help for commands.']);
  setOpen(false);

  return { handleKey, isOpen: () => open, run };
}
