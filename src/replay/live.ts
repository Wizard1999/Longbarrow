import type { World } from '../core/types';
import type { Command, Recorder } from '../sim/replay';

/**
 * Browser-side command gateway.
 *
 * UI code still calls the authoritative simulation command functions so it can
 * receive their normal return values, but every player command passes through
 * this gateway first. That gives live recording one auditable integration
 * point without coupling deterministic simulation code to browser state.
 */
let activeWorld: World | null = null;
let activeRecorder: Recorder | null = null;

export function configureLiveRecording(world: World, recorder: Recorder): void {
  activeWorld = world;
  activeRecorder = recorder;
}

export function issueCommand<T>(command: Command, apply: () => T): T {
  if (activeWorld && activeRecorder) activeRecorder.record(activeWorld, command);
  return apply();
}

export function liveRecorder(): Recorder | null {
  return activeRecorder;
}
