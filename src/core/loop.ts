/** Fixed-tick constants. Every duration in the simulation is expressed in
 *  ticks, never seconds (06 §3).
 *
 *  30 Hz, not 20 and not 128 — see docs/DECISIONS.md D-004. */
export const TICK_HZ = 30;
export const TICK_MS = 1000 / TICK_HZ;
export const DT = 1 / TICK_HZ;
export const MAX_CATCHUP = 8;
export const GOLDEN_ANGLE = 2.399963229728653;

export interface LoopHooks {
  step: () => void;
  render: (alpha: number, realDt: number, now: number) => void;
}

export interface Loop {
  start: () => void;
  stop: () => void;
  setThrottle: (on: boolean) => void;
  isThrottled: () => boolean;
  setPaused: (on: boolean) => void;
  isPaused: () => boolean;
  stepOnce: () => void;
  setSpeed: (speed: number) => void;
  getSpeed: () => number;
}

/**
 * Accumulator loop. Nothing in the render callback advances game state — the
 * sim only moves inside `step`, and `render` receives the leftover alpha so
 * views can interpolate between the previous and current tick.
 */
export function createLoop(hooks: LoopHooks): Loop {
  let accumulator = 0;
  let lastFrameTime = performance.now();
  let throttle = false;
  let paused = false;
  let speed = 1;
  let queuedSteps = 0;
  let raf = 0;

  function frame(now: number): void {
    raf = requestAnimationFrame(frame);

    if (throttle) {
      const until = performance.now() + 60;
      while (performance.now() < until) { /* deliberate throttle test */ }
    }

    let frameMs = now - lastFrameTime;
    lastFrameTime = now;
    if (frameMs > 250) frameMs = 250;
    const realDt = frameMs / 1000;

    if (!paused) accumulator += frameMs * speed;

    let steps = 0;
    while (queuedSteps > 0) {
      hooks.step();
      queuedSteps--;
      steps++;
    }
    while (!paused && accumulator >= TICK_MS && steps < MAX_CATCHUP) {
      hooks.step();
      accumulator -= TICK_MS;
      steps++;
    }
    if (steps === MAX_CATCHUP) accumulator = 0;

    hooks.render(paused ? 0 : accumulator / TICK_MS, realDt, now);
  }

  return {
    start: () => { lastFrameTime = performance.now(); raf = requestAnimationFrame(frame); },
    stop: () => cancelAnimationFrame(raf),
    setThrottle: (on: boolean) => { throttle = on; },
    isThrottled: () => throttle,
    setPaused: (on: boolean) => { paused = on; accumulator = 0; },
    isPaused: () => paused,
    stepOnce: () => { queuedSteps++; },
    setSpeed: (next: number) => { speed = Math.min(8, Math.max(0.25, next)); },
    getSpeed: () => speed,
  };
}
