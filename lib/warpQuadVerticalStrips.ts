import type { PerspectiveQuad } from "@/lib/mockupPerspectiveGeometry";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export type VerticalStripPlacement = {
  srcLeft: number;
  srcWidth: number;
  destLeft: number;
  destTop: number;
  destW: number;
  destH: number;
};

/** Map source rectangle columns into a destination quad (vertical strip homography). */
export function computeVerticalStripWarp(
  quad: PerspectiveQuad,
  srcW: number,
  srcH: number,
  stripCount: number,
): { outW: number; outH: number; localQuad: PerspectiveQuad; strips: VerticalStripPlacement[] } {
  const minX = Math.min(quad.tl.x, quad.tr.x, quad.br.x, quad.bl.x);
  const minY = Math.min(quad.tl.y, quad.tr.y, quad.br.y, quad.bl.y);
  const maxX = Math.max(quad.tl.x, quad.tr.x, quad.br.x, quad.bl.x);
  const maxY = Math.max(quad.tl.y, quad.tr.y, quad.br.y, quad.bl.y);
  const outW = Math.max(1, Math.ceil(maxX - minX));
  const outH = Math.max(1, Math.ceil(maxY - minY));

  const localQuad: PerspectiveQuad = {
    tl: { x: quad.tl.x - minX, y: quad.tl.y - minY },
    tr: { x: quad.tr.x - minX, y: quad.tr.y - minY },
    br: { x: quad.br.x - minX, y: quad.br.y - minY },
    bl: { x: quad.bl.x - minX, y: quad.bl.y - minY },
  };

  const strips: VerticalStripPlacement[] = [];

  for (let i = 0; i < stripCount; i += 1) {
    const u0 = i / stripCount;
    const u1 = (i + 1) / stripCount;

    const topLeft = {
      x: lerp(localQuad.tl.x, localQuad.tr.x, u0),
      y: lerp(localQuad.tl.y, localQuad.tr.y, u0),
    };
    const topRight = {
      x: lerp(localQuad.tl.x, localQuad.tr.x, u1),
      y: lerp(localQuad.tl.y, localQuad.tr.y, u1),
    };
    const bottomLeft = {
      x: lerp(localQuad.bl.x, localQuad.br.x, u0),
      y: lerp(localQuad.bl.y, localQuad.br.y, u0),
    };
    const bottomRight = {
      x: lerp(localQuad.bl.x, localQuad.br.x, u1),
      y: lerp(localQuad.bl.y, localQuad.br.y, u1),
    };

    const destLeft = Math.floor(Math.min(topLeft.x, bottomLeft.x));
    const destTop = Math.floor(Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y));
    const destRight = Math.ceil(Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x));
    const destBottom = Math.ceil(Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y));
    const destW = Math.max(1, destRight - destLeft);
    const destH = Math.max(1, destBottom - destTop);

    const srcLeft = Math.min(srcW - 1, Math.max(0, Math.floor(u0 * srcW)));
    const srcWidth = Math.max(1, Math.min(srcW - srcLeft, Math.ceil((u1 - u0) * srcW) || 1));

    strips.push({ srcLeft, srcWidth, destLeft, destTop, destW, destH });
  }

  return { outW, outH, localQuad, strips };
}
