import type { PerspectivePhoneGeometry } from "@/lib/mockupPerspectiveGeometry";
import type { MockupPlacement } from "@/lib/mockupPose";

export type PerspectiveStackPlacement = {
  stackX: number;
  stackY: number;
  boxW: number;
  boxH: number;
};

/** Where the front-face center should sit (ASO hero — front readable, bg on opposite side). */
/** SWAY-style hero: front face center on canvas (placement right = show left bg). */
const FRONT_CENTER_X_RATIO: Record<MockupPlacement, number> = {
  center: 0.52,
  left: 0.46,
  right: 0.56,
};

function frontFaceAnchor(geo: PerspectivePhoneGeometry) {
  const f = geo.front;
  return {
    cx: (f.tl.x + f.tr.x + f.br.x + f.bl.x) / 4,
    bottomY: (f.bl.y + f.br.y) / 2,
  };
}

/**
 * Place projected device. For 3D tilts with left/right placement, anchor the **front face**
 * (not the full bounds box) so "show left bg" does not crop the phone to a thin side sliver.
 */
export function computePerspectiveStackPlacement(
  geo: PerspectivePhoneGeometry,
  scale: number,
  canvasWidth: number,
  placement: MockupPlacement,
  options: {
    bottomY: number;
    marginTop?: number;
    edgeInsetPx?: number;
  },
): PerspectiveStackPlacement {
  const boxW = Math.ceil((geo.bounds.maxX - geo.bounds.minX) * scale);
  const boxH = Math.ceil((geo.bounds.maxY - geo.bounds.minY) * scale);
  const inset = options.edgeInsetPx ?? Math.round(canvasWidth * 0.07);

  let stackX: number;
  if (geo.side && placement !== "center") {
    const { cx, bottomY } = frontFaceAnchor(geo);
    const targetFcX = Math.max(
      inset,
      Math.min(canvasWidth - inset, Math.round(canvasWidth * FRONT_CENTER_X_RATIO[placement])),
    );
    stackX = Math.round(targetFcX - cx * scale);
  } else {
    let targetMinX = Math.round((canvasWidth - boxW) / 2);
    if (placement === "left") {
      targetMinX = inset;
    } else if (placement === "right") {
      targetMinX = Math.max(inset, canvasWidth - inset - boxW);
    }
    stackX = Math.round(targetMinX - geo.bounds.minX * scale);
  }

  const anchorBottomY = geo.side && placement !== "center" ? frontFaceAnchor(geo).bottomY : geo.bounds.maxY;
  let stackY = Math.round(options.bottomY - anchorBottomY * scale);
  if (options.marginTop !== undefined) {
    const minStackY = Math.ceil(options.marginTop - geo.bounds.minY * scale);
    if (stackY < minStackY) stackY = minStackY;
  }

  return { stackX, stackY, boxW, boxH };
}

export function quadExtents(quad: {
  tl: { x: number; y: number };
  tr: { x: number; y: number };
  br: { x: number; y: number };
  bl: { x: number; y: number };
}) {
  return {
    minX: Math.min(quad.tl.x, quad.tr.x, quad.br.x, quad.bl.x),
    maxX: Math.max(quad.tl.x, quad.tr.x, quad.br.x, quad.bl.x),
    minY: Math.min(quad.tl.y, quad.tr.y, quad.br.y, quad.bl.y),
    maxY: Math.max(quad.tl.y, quad.tr.y, quad.br.y, quad.bl.y),
  };
}
