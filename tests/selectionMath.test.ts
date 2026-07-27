import { describe, expect, it } from 'vitest';
import { normalizedScreenRect, screenPointInRect } from '../src/input/selectionMath';

describe('selection rectangle math', () => {
  it('normalizes drags in every direction', () => {
    expect(normalizedScreenRect(80, 90, 20, 10)).toEqual({
      left: 20, right: 80, top: 10, bottom: 90,
    });
  });

  it('includes visible points on the rectangle boundary', () => {
    const rect = normalizedScreenRect(10, 20, 50, 60);
    expect(screenPointInRect({ x: 10, y: 20, visible: true }, rect)).toBe(true);
    expect(screenPointInRect({ x: 50, y: 60, visible: true }, rect)).toBe(true);
  });

  it('rejects points outside the rectangle or outside camera depth', () => {
    const rect = normalizedScreenRect(10, 20, 50, 60);
    expect(screenPointInRect({ x: 51, y: 40, visible: true }, rect)).toBe(false);
    expect(screenPointInRect({ x: 30, y: 40, visible: false }, rect)).toBe(false);
  });
});
