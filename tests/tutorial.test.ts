import { describe, expect, it } from 'vitest';
import {
  firstIncompleteTutorialStep, TUTORIAL_STEPS, type TutorialSnapshot,
} from '../src/ui/tutorial';

const blank = (): TutorialSnapshot => ({
  selectedWorker: false,
  gatheringWorker: false,
  selectedStandard: false,
  trainedLegionnaire: false,
  selectedCombatUnit: false,
  issuedCombatMove: false,
  framedBoard: false,
});

describe('tutorial progression', () => {
  it('begins at worker selection', () => {
    expect(firstIncompleteTutorialStep(blank())).toBe(0);
  });

  it('advances only through completed prerequisites', () => {
    const snapshot = blank();
    snapshot.selectedWorker = true;
    snapshot.gatheringWorker = true;
    expect(firstIncompleteTutorialStep(snapshot)).toBe(2);
  });

  it('reports completion when every step is satisfied', () => {
    const snapshot = blank();
    for (const key of Object.keys(snapshot) as Array<keyof TutorialSnapshot>) {
      snapshot[key] = true;
    }
    expect(firstIncompleteTutorialStep(snapshot)).toBe(TUTORIAL_STEPS.length);
  });
});
