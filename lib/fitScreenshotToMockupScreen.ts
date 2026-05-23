import sharp from "sharp";

import { fitScreenshotToMockupScreen } from "@/lib/mockupScreenFitServer";

export async function resizeScreenshotToScreenWidth(
  screenshot: Buffer,
  screenW: number,
  screenH: number,
): Promise<Buffer> {
  const trimmed = await trimVerticalScreenshotMargins(screenshot);
  return fitScreenshotToMockupScreen(trimmed, screenW, screenH);
}

export async function trimVerticalScreenshotMargins(buffer: Buffer): Promise<Buffer> {
  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) return buffer;

    const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height } = info;

    let top = 0;
    let bottom = height - 1;

    const isDark = (i: number) => {
      const a = data[i + 3];
      if (a < 16) return true;
      return data[i] <= 12 && data[i + 1] <= 12 && data[i + 2] <= 12;
    };

    const rowMostlyDark = (y: number) => {
      let dark = 0;
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (isDark(i)) dark++;
      }
      return dark / width >= 0.992;
    };

    while (top < bottom && rowMostlyDark(top)) top++;
    while (bottom > top && rowMostlyDark(bottom)) bottom--;

    const trimmedH = bottom - top + 1;
    const removedH = height - trimmedH;
    const maxTrim = Math.round(height * 0.14);

    if (removedH < 6 || removedH > maxTrim || trimmedH < height * 0.82) {
      return buffer;
    }

    return sharp(buffer)
      .extract({ left: 0, top, width, height: trimmedH })
      .png()
      .toBuffer();
  } catch {
    return buffer;
  }
}
