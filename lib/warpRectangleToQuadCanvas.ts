import { cleanWarpAlphaFringe, sampleBilinearPremultiplied } from "@/lib/alphaBilinearSample";
import type { PerspectiveQuad } from "@/lib/mockupPerspectiveGeometry";
import { homographyMapDestToSrc, homographyUnitSquareToQuadInverse } from "@/lib/rectToQuadHomography";

/** Map a source rectangle onto a destination quad — same homography as server export. */
export function warpRectangleToQuadCanvas(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  destQuad: PerspectiveQuad,
): HTMLCanvasElement {
  const minX = Math.floor(Math.min(destQuad.tl.x, destQuad.tr.x, destQuad.bl.x, destQuad.br.x));
  const minY = Math.floor(Math.min(destQuad.tl.y, destQuad.tr.y, destQuad.bl.y, destQuad.br.y));
  const maxX = Math.ceil(Math.max(destQuad.tl.x, destQuad.tr.x, destQuad.bl.x, destQuad.br.x));
  const maxY = Math.ceil(Math.max(destQuad.tl.y, destQuad.tr.y, destQuad.bl.y, destQuad.br.y));
  const outW = Math.max(1, maxX - minX);
  const outH = Math.max(1, maxY - minY);

  const local: PerspectiveQuad = {
    tl: { x: destQuad.tl.x - minX, y: destQuad.tl.y - minY },
    tr: { x: destQuad.tr.x - minX, y: destQuad.tr.y - minY },
    br: { x: destQuad.br.x - minX, y: destQuad.br.y - minY },
    bl: { x: destQuad.bl.x - minX, y: destQuad.bl.y - minY },
  };

  const invH = homographyUnitSquareToQuadInverse(local);

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext("2d");
  if (!srcCtx) return document.createElement("canvas");
  srcCtx.drawImage(source, 0, 0, srcW, srcH);
  const imageData = srcCtx.getImageData(0, 0, srcW, srcH);

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext("2d");
  if (!ctx) return out;

  const outData = ctx.createImageData(outW, outH);
  if (invH) {
    for (let y = 0; y < outH; y += 1) {
      for (let x = 0; x < outW; x += 1) {
        const uv = homographyMapDestToSrc(invH, x + 0.5, y + 0.5);
        const o = (y * outW + x) * 4;
        if (!uv) continue;
        const rgba = sampleBilinearPremultiplied(imageData.data, srcW, srcH, 4, uv.u, uv.v);
        outData.data[o] = rgba[0];
        outData.data[o + 1] = rgba[1];
        outData.data[o + 2] = rgba[2];
        outData.data[o + 3] = rgba[3];
      }
    }
  }
  cleanWarpAlphaFringe(outData.data, outW, outH);
  ctx.putImageData(outData, 0, 0);
  return out;
}
