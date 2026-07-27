/**
 * Seeded PRNG (mulberry32). The sim must never call Math.random() — every
 * random draw in the simulation comes from here so that the same seed always
 * replays identically (06 §3).
 *
 * The generator state is a plain number held on the World, deliberately *not*
 * captured in a closure. A closure-based RNG is unreachable state: it cannot be
 * snapshotted, restored, serialized or hashed. That breaks all three of the
 * networked requirements at once — rollback netcode cannot restore the
 * generator's position when it rewinds, replays cannot be seeked to a mid-match
 * tick, and server-side match validation cannot re-simulate from a snapshot.
 *
 * Keeping it as data costs nothing and preserves every one of those options.
 * See docs/DECISIONS.md D-010.
 */

/** Advance the generator and return the next value in [0, 1). Mutates `holder`. */
export function rngNext(holder: { rngState: number }): number {
  const a = (holder.rngState + 0x6d2b79f5) | 0;
  holder.rngState = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Normalise a seed into a valid starting state. */
export function rngSeed(seed: number): number {
  return seed >>> 0;
}
