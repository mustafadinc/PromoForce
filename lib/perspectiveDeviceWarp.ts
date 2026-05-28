import type { PerspectivePhoneGeometry, PerspectiveQuad } from "@/lib/mockupPerspectiveGeometry";
import { mapQuadToCanvas } from "@/lib/deviceSilhouetteQuad";
import { quadExtents } from "@/lib/perspectiveStackPosition";

export type MappedPerspectiveFaces = {
  front: PerspectiveQuad;
  side: PerspectiveQuad | null;
};

export function mapPerspectiveFacesToCanvas(
  geo: PerspectivePhoneGeometry,
  scale: number,
  stackX: number,
  stackY: number,
): MappedPerspectiveFaces {
  return {
    front: mapQuadToCanvas(geo.front, scale, stackX, stackY),
    side: geo.side ? mapQuadToCanvas(geo.side, scale, stackX, stackY) : null,
  };
}

/** Axis-aligned bounds covering warped front + side layers. */
export function mappedFacesExtents(faces: MappedPerspectiveFaces) {
  const parts = [quadExtents(faces.front)];
  if (faces.side) parts.push(quadExtents(faces.side));
  return {
    minX: Math.min(...parts.map((p) => p.minX)),
    minY: Math.min(...parts.map((p) => p.minY)),
    maxX: Math.max(...parts.map((p) => p.maxX)),
    maxY: Math.max(...parts.map((p) => p.maxY)),
  };
}

export function quadDrawOrigin(quad: PerspectiveQuad) {
  return {
    left: Math.floor(Math.min(quad.tl.x, quad.tr.x, quad.bl.x, quad.br.x)),
    top: Math.floor(Math.min(quad.tl.y, quad.tr.y, quad.bl.y, quad.br.y)),
  };
}

/** Keep full device inside horizontal canvas insets (preview + export). */
export function nudgePerspectiveStackX(
  geo: PerspectivePhoneGeometry,
  scale: number,
  stackX: number,
  stackY: number,
  canvasWidth: number,
  insetPx: number,
): number {
  let x = stackX;
  for (let pass = 0; pass < 4; pass += 1) {
    const ext = mappedFacesExtents(mapPerspectiveFacesToCanvas(geo, scale, x, stackY));
    if (ext.minX < insetPx) x += Math.ceil(insetPx - ext.minX);
    if (ext.maxX > canvasWidth - insetPx) x -= Math.ceil(ext.maxX - (canvasWidth - insetPx));
  }
  return x;
}
