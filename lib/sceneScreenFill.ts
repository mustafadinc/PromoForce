import { cleanWarpAlphaFringe, sampleBilinearPremultiplied } from "@/lib/alphaBilinearSample";
import type { PerspectiveQuad } from "@/lib/mockupPerspectiveGeometry";
import {
  homographyMapDestToSrc,
  homographyUnitSquareToQuadInverse,
} from "@/lib/rectToQuadHomography";

/**
 * Fill only the screen-glass pixels (from the baked mask) by inverse-mapping each pixel
 * through the screen quad homography. Guarantees every visible glass pixel gets content
 * even when the stored quad and mask diverge slightly.
 */
export function fillScreenshotIntoScreenMask(
  out: Uint8ClampedArray | Buffer,
  outW: number,
  outH: number,
  screenAlpha: Uint8Array,
  shotData: Uint8ClampedArray | Buffer,
  shotW: number,
  shotH: number,
  shotChannels: number,
  quad: PerspectiveQuad,
) {
  const inv = homographyUnitSquareToQuadInverse(quad);
  if (!inv) return;

  const [a, b, c, d, e, f, g, h7, i] = inv;

  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const p = y * outW + x;
      if (screenAlpha[p] < 128) continue;

      let u: number;
      let v: number;
      const mapped = homographyMapDestToSrc(inv, x + 0.5, y + 0.5);
      if (mapped) {
        u = Math.max(0, Math.min(1, mapped.u));
        v = Math.max(0, Math.min(1, mapped.v));
      } else {
        const denom = g * (x + 0.5) + h7 * (y + 0.5) + i;
        if (Math.abs(denom) < 1e-9) continue;
        u = (a * (x + 0.5) + b * (y + 0.5) + c) / denom;
        v = (d * (x + 0.5) + e * (y + 0.5) + f) / denom;
        u = Math.max(0, Math.min(1, u));
        v = Math.max(0, Math.min(1, v));
      }

      const rgba = sampleBilinearPremultiplied(shotData, shotW, shotH, shotChannels, u, v);
      const o = p * 4;
      out[o] = rgba[0];
      out[o + 1] = rgba[1];
      out[o + 2] = rgba[2];
      out[o + 3] = rgba[3];
    }
  }

  cleanWarpAlphaFringe(out, outW, outH);
}
