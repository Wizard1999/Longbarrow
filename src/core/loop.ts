/** Fixed-tick constants. Every duration in the simulation is expressed in
 *  ticks, never seconds (06 §3).
 *
 *  30 Hz, not 20 and not 128 — see docs/DECISIONS.md D-004. Short version:
 *  an RTS's perceived responsiveness is dominated by input-to-feedback latency,
 *  not simulation granularity, and sim cost scales with unit count. 30 divides
 *  evenly into 60 Hz displays, which keeps render interpolation judder-free.
 *
 *  Changing this rescales the meaning of EVERY tick-denominated constant in
 *  data/, and invalidates recorded replays. Do not change it casually. */
export const TICK_HZ = 30;
export const TICK_MS = 1000 / TICK_HZ;
export const DT = 1 / TICK_HZ;

/** Cap catch-up so a slow frame can't spiral into an ever-growing backlog.
 *  Sized so a single maximally-clamped frame (250ms, below) can be absorbed in
 *  one go and no further: 8 x 33.3ms = 267ms. Raising TICK_HZ without raising
 *  this would silently start dropping simulated time on slow frames. */
export const MAX_CATCHUP = 8;

/** Deterministic spread without touching the RNG — used anywhere entities need
 *  to fan out around a point reproducibly. */
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
  let raf = 0;

  function frame(now: number): void {
    raf = requestAnimationFrame(frame);

    // Deliberate busy-wait, not a bug: the throttle test needs a genuinely slow
    // frame to prove tick-rate independence, and there is no other way to force
    // one from inside requestAnimationFrame.
    if (throttle) {
      const until = performance.now() + 60;
      while (performance.now() < until) { /* burn the frame */ }
    }

    let frameMs = now - lastFrameTime;
    lastFrameTime = now;
    if (frameMs > 250) frameMs = 250;
    const realDt = frameMs / 1000;

    accumulator += frameMs;
    let steps = 0;
    while (accumulator >= TICK_MS && steps < MAX_CATCHUP) {
      hooks.step();
      accumulator -= TICK_MS;
      steps++;
    }
    if (steps === MAX_CATCHUP) accumulator = 0;

    hooks.render(accumulator / TICK_MS, realDt, now);
  }

  return {
    start: () => { lastFrameTime = performance.now(); raf = requestAnimationFrame(frame); },
    stop: () => cancelAnimationFrame(raf),
    setThrottle: (on: boolean) => { throttle = on; },
    isThrottled: () => throttle,
  };
}
