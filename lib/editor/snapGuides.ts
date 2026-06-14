export const SNAP_THRESHOLD_PX = 14;

export type SnapResult = {
  x: number;
  y: number;
  guideX: number | null;
  guideY: number | null;
};

export function snapDragPosition(
  x: number,
  y: number,
  guidesX: number[],
  guidesY: number[] = [],
): SnapResult {
  let guideX: number | null = null;
  let guideY: number | null = null;
  let snappedX = x;
  let snappedY = y;

  for (const gx of guidesX) {
    if (Math.abs(x - gx) <= SNAP_THRESHOLD_PX) {
      snappedX = gx;
      guideX = gx;
      break;
    }
  }

  for (const gy of guidesY) {
    if (Math.abs(y - gy) <= SNAP_THRESHOLD_PX) {
      snappedY = gy;
      guideY = gy;
      break;
    }
  }

  return { x: snappedX, y: snappedY, guideX, guideY };
}

export function canvasCenterGuides(canvasW: number, canvasH: number) {
  return {
    guidesX: [canvasW / 2],
    guidesY: [canvasH / 2, canvasH * 0.14, canvasH * 0.38],
  };
}
