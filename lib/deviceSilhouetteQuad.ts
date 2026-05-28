import type { PerspectivePhoneGeometry, PerspectiveQuad } from "@/lib/mockupPerspectiveGeometry";

/** Outer quad wrapping front + visible side — used for rigid device warp. */
export function deviceSilhouetteQuad(geo: PerspectivePhoneGeometry): PerspectiveQuad {
  if (!geo.side) return geo.front;

  if (geo.yawDeg > 0) {
    return {
      tl: geo.front.tl,
      tr: geo.side.tr,
      br: geo.side.br,
      bl: geo.front.bl,
    };
  }

  return {
    tl: geo.side.tl,
    tr: geo.front.tr,
    br: geo.front.br,
    bl: geo.side.bl,
  };
}

export function mapQuadToCanvas(
  quad: PerspectiveQuad,
  scale: number,
  offsetX: number,
  offsetY: number,
): PerspectiveQuad {
  const map = (p: { x: number; y: number }) => ({
    x: offsetX + p.x * scale,
    y: offsetY + p.y * scale,
  });
  return {
    tl: map(quad.tl),
    tr: map(quad.tr),
    br: map(quad.br),
    bl: map(quad.bl),
  };
}
