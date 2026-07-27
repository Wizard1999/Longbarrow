import { describe, expect, it } from 'vitest';
import { createWorld, simStep } from '../src/sim/world';
import { TICK_HZ } from '../src/core/loop';
import { DAY } from '../src/data/tuning';
import {
  TICKS_PER_DAY, dayHour, dayNumber, dayPeriod, daylight, dayPhase,
  formatClock, startTickForHour,
} from '../src/sim/daynight';
import { hash } from '../src/sim/snapshot';

function run(w: ReturnType<typeof createWorld>, ticks: number): void {
  for (let i = 0; i < ticks; i++) simStep(w);
}

describe('day length', () => {
  it('a full day is ten real minutes', () => {
    expect(TICKS_PER_DAY).toBe(DAY.realSecondsPerDay * TICK_HZ);
    expect(TICKS_PER_DAY / TICK_HZ / 60).toBe(10);
  });

  it('phase wraps exactly once per day', () => {
    const w = createWorld(1, 0);
    expect(dayPhase(w)).toBeCloseTo(0, 6);
    run(w, TICKS_PER_DAY / 2);
    expect(dayPhase(w)).toBeCloseTo(0.5, 6);
    run(w, TICKS_PER_DAY / 2);
    expect(dayPhase(w)).toBeCloseTo(0, 6);
  });

  it('counts elapsed days', () => {
    const w = createWorld(1, 0);
    expect(dayNumber(w)).toBe(0);
    run(w, TICKS_PER_DAY);
    expect(dayNumber(w)).toBe(1);
    run(w, TICKS_PER_DAY * 2);
    expect(dayNumber(w)).toBe(3);
  });
});

describe('starting at any time of day', () => {
  it.each([0, 6, 8, 12, 17, 23])('a match can begin at %i:00', (hour) => {
    const w = createWorld(1, hour);
    expect(dayHour(w)).toBeCloseTo(hour, 4);
    expect(formatClock(w)).toBe(`${String(hour).padStart(2, '0')}:00`);
  });

  it('wraps out-of-range and negative hours', () => {
    expect(startTickForHour(24)).toBe(startTickForHour(0));
    expect(startTickForHour(-1)).toBe(startTickForHour(23));
  });

  it('the clock advances from wherever it started', () => {
    const w = createWorld(1, 23);
    run(w, TICKS_PER_DAY / 24 * 2);        // two in-game hours
    expect(dayHour(w)).toBeCloseTo(1, 3);  // ...wraps past midnight
  });
});

describe('periods and light level', () => {
  const at = (hour: number) => createWorld(1, hour);

  it('names the period', () => {
    expect(dayPeriod(at(2))).toBe('night');
    expect(dayPeriod(at(6))).toBe('dawn');
    expect(dayPeriod(at(12))).toBe('day');
    expect(dayPeriod(at(20))).toBe('dusk');
    expect(dayPeriod(at(23))).toBe('night');
  });

  it('daylight is 0 at night and 1 at noon', () => {
    expect(daylight(at(2))).toBe(0);
    expect(daylight(at(12))).toBe(1);
  });

  it('daylight moves smoothly through dawn, never jumping', () => {
    let prev = 0;
    let maxJump = 0;
    for (let t = 0; t <= TICKS_PER_DAY; t += 30) {
      const w = createWorld(1, 0);
      w.tick = t;
      const d = daylight(w);
      maxJump = Math.max(maxJump, Math.abs(d - prev));
      prev = d;
    }
    expect(maxJump).toBeLessThan(0.05);
  });

  it('is monotonic rising through dawn and falling through dusk', () => {
    const light = (h: number) => daylight(at(h));
    expect(light(5)).toBeLessThan(light(6));
    expect(light(6)).toBeLessThan(light(7));
    expect(light(19)).toBeGreaterThan(light(20));
    expect(light(20)).toBeGreaterThan(light(21));
  });
});

describe('the cycle is deterministic sim state, not wall clock', () => {
  it('two worlds started at the same hour stay in step', () => {
    const a = createWorld(7, 17);
    const b = createWorld(7, 17);
    run(a, 500); run(b, 500);
    expect(dayHour(a)).toBe(dayHour(b));
    expect(hash(a)).toBe(hash(b));
  });

  it('start hour is part of the hashed state', () => {
    // Otherwise a replay could restore a match to the wrong time of day and
    // still report agreement.
    const a = createWorld(7, 8);
    const b = createWorld(7, 20);
    expect(hash(a)).not.toBe(hash(b));
  });

  it('survives a serialize round trip', () => {
    const w = createWorld(3, 14);
    run(w, 200);
    const wire = JSON.parse(JSON.stringify(w)) as typeof w;
    expect(dayHour(wire)).toBe(dayHour(w));
    expect(formatClock(wire)).toBe(formatClock(w));
  });
});
