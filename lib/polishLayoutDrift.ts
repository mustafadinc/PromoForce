import sharp from "sharp";

/**
 * Headline band only — polish is allowed to change device/mockup below this region.
 * Mean pixel delta above this threshold suggests headline moved or was hallucinated.
 */
const HEADLINE_BAND_RATIO = 0.34;
const HEADLINE_MEAN_DELTA_THRESHOLD = 42;

async function extractHeadlineBandGrayscale(buffer: Buffer, compareWidth: number, compareHeight: number) {
  const bandHeight = Math.max(32, Math.round(compareHeight * HEADLINE_BAND_RATIO));
  return sharp(buffer)
    .resize(compareWidth, compareHeight, { fit: "fill" })
    .extract({ left: 0, top: 0, width: compareWidth, height: bandHeight })
    .greyscale()
    .raw()
    .toBuffer();
}

/**
 * Reject polish when the headline region diverges too much from the scaffold.
 */
export async function rejectPolishIfLayoutDrift(
  scaffoldPng: Buffer,
  polishedPng: Buffer,
): Promise<{ accepted: Buffer; rejected: boolean; meanDelta: number }> {
  const compareWidth = 128;
  const compareHeight = 256;

  const [before, after] = await Promise.all([
    extractHeadlineBandGrayscale(scaffoldPng, compareWidth, compareHeight),
    extractHeadlineBandGrayscale(polishedPng, compareWidth, compareHeight),
  ]);

  if (before.length !== after.length || before.length === 0) {
    return { accepted: scaffoldPng, rejected: true, meanDelta: 255 };
  }

  let sum = 0;
  for (let i = 0; i < before.length; i += 1) {
    sum += Math.abs(before[i] - after[i]);
  }
  const meanDelta = sum / before.length;

  if (meanDelta > HEADLINE_MEAN_DELTA_THRESHOLD) {
    return { accepted: scaffoldPng, rejected: true, meanDelta };
  }

  return { accepted: polishedPng, rejected: false, meanDelta };
}
