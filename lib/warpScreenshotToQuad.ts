import sharp from "sharp";

import type { PerspectiveQuad } from "@/lib/mockupPerspectiveGeometry";
import { computeVerticalStripWarp } from "@/lib/warpQuadVerticalStrips";

/** Vertical strips — higher = smoother perspective (diminishing returns above ~128). */
const STRIP_COUNT = 112;

/**
 * Perspective-warp a rectangle into a quadrilateral (vertical strip mapping).
 * Source must already be fitted to the screen aspect (see fitScreenshotToScreenQuad).
 */
export async function warpScreenshotToQuad(
  screenshot: Buffer,
  quad: PerspectiveQuad,
): Promise<Buffer> {
  const meta = await sharp(screenshot).metadata();
  const srcW = meta.width ?? 1;
  const srcH = meta.height ?? 1;

  const { outW, outH, strips } = computeVerticalStripWarp(quad, srcW, srcH, STRIP_COUNT);
  const composites: sharp.OverlayOptions[] = [];

  for (const strip of strips) {
    const column = await sharp(screenshot)
      .extract({ left: strip.srcLeft, top: 0, width: strip.srcWidth, height: srcH })
      .resize(strip.destW, strip.destH, { fit: "fill", kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer();

    composites.push({
      input: column,
      left: strip.destLeft,
      top: strip.destTop,
    });
  }

  return sharp({
    create: {
      width: outW,
      height: outH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}
