import sharp from "sharp";

import { resolveMockupScreenFit } from "@/lib/mockupScreenFit";

async function clipToRoundedScreen(buffer: Buffer, width: number, height: number, radius: number) {
  const roundedMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="#ffffff"/>
    </svg>`,
  );

  const mask = await sharp(roundedMask).png().toBuffer();
  return sharp(buffer).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

/** Fit entire screenshot inside the screen hole (contain, bottom-aligned). */
export async function fitScreenshotToMockupScreen(
  screenshot: Buffer,
  screenW: number,
  screenH: number,
): Promise<Buffer> {
  const fit = resolveMockupScreenFit(screenW, screenH);
  const meta = await sharp(screenshot).metadata();
  const srcW = meta.width ?? 1;
  const srcH = meta.height ?? 1;

  const scale =
    Math.min(fit.contentW / srcW, fit.contentH / srcH) * fit.containScale;
  const scaledW = Math.max(1, Math.round(srcW * scale));
  const scaledH = Math.max(1, Math.round(srcH * scale));

  const resized = await sharp(screenshot)
    .resize(scaledW, scaledH, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  const destX = fit.sideInset + (fit.contentW - scaledW) / 2 + fit.shiftX + fit.objectShiftX;
  const destY = fit.offsetY + fit.contentH - scaledH;

  const canvas = await sharp({
    create: {
      width: screenW,
      height: screenH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([{ input: resized, top: Math.round(destY), left: Math.round(destX) }])
    .png()
    .toBuffer();

  return clipToRoundedScreen(canvas, screenW, screenH, Math.round(fit.radius));
}
