import sharp from "sharp";

import { cleanWarpAlphaFringe, sampleBilinearPremultiplied } from "@/lib/alphaBilinearSample";
import type { PerspectiveQuad } from "@/lib/mockupPerspectiveGeometry";
import { homographyMapDestToSrc, homographyUnitSquareToQuadInverse } from "@/lib/rectToQuadHomography";

/** Map a source rectangle onto a destination quad (true perspective homography). */
export async function warpRectangleToQuad(
  source: Buffer,
  srcW: number,
  srcH: number,
  destQuad: PerspectiveQuad,
): Promise<Buffer> {
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
  if (!invH) {
    return sharp({
      create: { width: outW, height: outH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer();
  }

  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const out = Buffer.alloc(outW * outH * 4, 0);

  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const uv = homographyMapDestToSrc(invH, x + 0.5, y + 0.5);
      if (!uv) continue;
      const rgba = sampleBilinearPremultiplied(data, srcW, srcH, channels, uv.u, uv.v);
      const o = (y * outW + x) * 4;
      out[o] = rgba[0];
      out[o + 1] = rgba[1];
      out[o + 2] = rgba[2];
      out[o + 3] = rgba[3];
    }
  }

  cleanWarpAlphaFringe(out, outW, outH);

  return sharp(out, { raw: { width: outW, height: outH, channels: 4 } }).png().toBuffer();
}
