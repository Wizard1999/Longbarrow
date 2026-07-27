# Performance Testing

Greenmantle is intended to run directly in a browser across a wide range of
machines. Performance claims must therefore come from repeatable measurements,
not impressions from one development computer.

## Quick benchmark

Start the game and open one of these URLs:

- `/?dev=performance&quality=low`
- `/?dev=performance&quality=medium`
- `/?dev=performance&quality=high`

Then:

1. Click **Load preset** once to create the fixed 200-unit formation.
2. Click **Reset benchmark** after the scene has settled.
3. Move and rotate the camera through overview and close inspection distances.
4. Let the sample run for at least 60 seconds.
5. Click **Export report**.

The JSON report records the selected quality settings, viewport and pixel ratio,
frame-time percentiles, draw calls, triangle count, world counts, user agent, and
simulation tick. Attach it to bug reports and compare reports from equivalent
scenarios rather than comparing unrelated matches.

## Reading the numbers

- **Average FPS** is useful for a broad impression but can hide stutters.
- **p95 frame time** means 95% of measured frames were at or below that time; it
  is the main responsiveness metric for this harness.
- **Worst frame time** is diagnostic only and can be distorted by browser or OS
  interruptions.
- **Draw calls and triangles** explain rendering workload but do not alone prove
  that a scene is fast or slow.

The monitor ignores gaps longer than 250 ms so changing tabs or suspending the
browser does not poison the sample. Reports currently cover render-frame health;
separate simulation-step timing will be added when the fixed loop exposes it.

## Benchmark discipline

Do not change the scenario, viewport, browser zoom, or camera path while making
a tier-to-tier comparison. Record the machine/browser in the report rather than
turning one result into a universal performance claim.
