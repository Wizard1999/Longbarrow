export interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}

export interface ScreenRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function normalizedScreenRect(
  startX: number, startY: number, endX: number, endY: number,
): ScreenRect {
  return {
    left: Math.min(startX, endX),
    right: Math.max(startX, endX),
    top: Math.min(startY, endY),
    bottom: Math.max(startY, endY),
  };
}

export function screenPointInRect(point: ScreenPoint, rect: ScreenRect): boolean {
  return point.visible
    && point.x >= rect.left
    && point.x <= rect.right
    && point.y >= rect.top
    && point.y <= rect.bottom;
}
