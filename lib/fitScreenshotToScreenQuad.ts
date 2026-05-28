import sharp from "sharp";

import { fitScreenshotToMockupScreen } from "@/lib/mockupScreenFitServer";
import { trimVerticalScreenshotMargins } from "@/lib/fitScreenshotToMockupScreen";
import type { PerspectiveQuad } from "@/lib/mockupPerspectiveGeometry";
import { quadPixelDimensions, quadToPath } from "@/lib/mockupPerspectiveGeometry";
import { warpScreenshotToQuad } from "@/lib/warpScreenshotToQuad";

async function clipBufferToQuad(buffer: Buffer, quad: PerspectiveQuad): Promise<Buffer> {
  const minX = Math.min(quad.tl.x, quad.tr.x, quad.br.x, quad.bl.x);
  const minY = Math.min(quad.tl.y, quad.tr.y, quad.br.y, quad.bl.y);
  const maxX = Math.max(quad.tl.x, quad.tr.x, quad.br.x, quad.bl.x);
  const maxY = Math.max(quad.tl.y, quad.tr.y, quad.br.y, quad.bl.y);
  const w = Math.max(1, Math.ceil(maxX - minX));
  const h = Math.max(1, Math.ceil(maxY - minY));

  const local: PerspectiveQuad = {
    tl: { x: quad.tl.x - minX, y: quad.tl.y - minY },
    tr: { x: quad.tr.x - minX, y: quad.tr.y - minY },
    br: { x: quad.br.x - minX, y: quad.br.y - minY },
    bl: { x: quad.bl.x - minX, y: quad.bl.y - minY },
  };

  const mask = Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <path d="${quadToPath(local)}" fill="white"/>
    </svg>`,
  );

  return sharp(buffer)
    .composite([{ input: await sharp(mask).png().toBuffer(), blend: "dest-in" }])
    .png()
    .toBuffer();
}

/**
 * Fit screenshot into the screen hole, then warp to the exact screen quad on canvas.
 * Pre-fitting uses the same contain/inset math as the flat mockup before perspective warp.
 */
export async function fitScreenshotToScreenQuad(
  screenshot: Buffer,
  screenQuad: PerspectiveQuad,
  _screenW?: number,
  _screenH?: number,
): Promise<Buffer> {
  const { width: screenW, height: screenH } = quadPixelDimensions(screenQuad);
  const trimmed = await trimVerticalScreenshotMargins(screenshot);
  const fittedFlat = await fitScreenshotToMockupScreen(trimmed, screenW, screenH);
  const warped = await warpScreenshotToQuad(fittedFlat, screenQuad);
  return clipBufferToQuad(warped, screenQuad);
}
