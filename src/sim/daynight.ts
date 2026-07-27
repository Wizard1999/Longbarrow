import { TICK_HZ } from '../core/loop';
import { DAY } from '../data/tuning';
import type { World } from '../core/types';

/**
 * Day/night cycle.
 *
 * Lives in the sim, in ticks, deliberately. It is tempting to treat a day
 * counter as pure decoration and drive it from `performance.now()` in the
 * renderer — but the moment anything gameplay-facing reads the time of day
 * (vision range at night, a night-only unit, a timed objective, or simply a
 * player deciding to attack at dusk), a wall-clock cycle desyncs across peers
 * and cannot be replayed. Deriving it from `world.tick` costs nothing and
 * closes that door before anyone walks through it.
 *
 * The starting time of day is part of world creation, so a match may begin at
 * any hour and still replay identically — the seed and the start hour together
 * fully determine the cycle.
 */

/** Ticks in one full in-game day. */
export const TICKS_PER_DAY = Math.round(DAY.realSecondsPerDay * TICK_HZ);

/** Phase through the current day, 0 (midnight) → 1 (next midnight). */
export function dayPhase(world: World): number {
  const t = (world.tick + world.dayStartTick) % TICKS_PER_DAY;
  return t / TICKS_PER_DAY;
}

/** In-game hour, 0–24, as a float. */
export function dayHour(world: World): number {
  return dayPhase(world) * 24;
}

/** Whole in-game days elapsed since the match began. */
export function dayNumber(world: World): number {
  return Math.floor((world.tick + world.dayStartTick) / TICKS_PER_DAY);
}

export type DayPeriod = 'night' | 'dawn' | 'day' | 'dusk';

/**
 * Named period, for UI and for any rule that wants to key off "night" rather
 * than a raw number. Boundaries are in `data/` so they stay tunable.
 */
export function dayPeriod(world: World): DayPeriod {
  const h = dayHour(world);
  if (h < DAY.dawnStart || h >= DAY.duskEnd) return 'night';
  if (h < DAY.dawnEnd) return 'dawn';
  if (h < DAY.duskStart) return 'day';
  return 'dusk';
}

/**
 * How lit the world is, 0 (deep night) → 1 (noon). Smooth across dawn and dusk
 * so nothing pops. Presentation reads this; rules may too.
 */
export function daylight(world: World): number {
  const h = dayHour(world);
  if (h <= DAY.dawnStart || h >= DAY.duskEnd) return 0;
  if (h >= DAY.dawnEnd && h <= DAY.duskStart) return 1;
  const t = h < DAY.dawnEnd
    ? (h - DAY.dawnStart) / (DAY.dawnEnd - DAY.dawnStart)
    : 1 - (h - DAY.duskStart) / (DAY.duskEnd - DAY.duskStart);
  return t * t * (3 - 2 * t);   // smoothstep
}

/** `14:30` — for the always-visible clock in the HUD. */
export function formatClock(world: World): string {
  const h = dayHour(world);
  const hh = Math.floor(h) % 24;
  const mm = Math.floor((h - Math.floor(h)) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Convert an hour-of-day into the `dayStartTick` that begins a match there. */
export function startTickForHour(hour: number): number {
  const wrapped = ((hour % 24) + 24) % 24;
  return Math.round((wrapped / 24) * TICKS_PER_DAY);
}
