import sharp from "sharp";

export type StrategyImageInput = {
  index: number;
  mimeType: string;
  base64: string;
};

const MAX_STRATEGY_IMAGE_EDGE = 512;
const MAX_STRATEGY_VISION_IMAGES = 4;
const STRATEGY_JPEG_QUALITY = 72;

export async function fileToStrategyImage(file: File, index: number): Promise<StrategyImageInput> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const optimized = await sharp(buffer)
    .rotate()
    .resize(MAX_STRATEGY_IMAGE_EDGE, MAX_STRATEGY_IMAGE_EDGE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: STRATEGY_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return {
    index,
    mimeType: "image/jpeg",
    base64: optimized.toString("base64"),
  };
}

export async function prepareStrategyImages(files: File[]): Promise<StrategyImageInput[]> {
  const capped = files.slice(0, MAX_STRATEGY_VISION_IMAGES);
  return Promise.all(capped.map((file, index) => fileToStrategyImage(file, index)));
}

export function getStrategyVisionImageCap() {
  return MAX_STRATEGY_VISION_IMAGES;
}

const MAX_ANALYSIS_IMAGE_EDGE = 768;

/** Higher-res images for dedicated screenshot intelligence pass (all uploads, up to MAX_SCREENSHOTS). */
export async function fileToAnalysisImage(file: File, index: number): Promise<StrategyImageInput> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const optimized = await sharp(buffer)
    .rotate()
    .resize(MAX_ANALYSIS_IMAGE_EDGE, MAX_ANALYSIS_IMAGE_EDGE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();

  return {
    index,
    mimeType: "image/jpeg",
    base64: optimized.toString("base64"),
  };
}

export async function prepareAnalysisImages(files: File[]): Promise<StrategyImageInput[]> {
  const { MAX_SCREENSHOTS } = await import("@/lib/campaignTypes");
  return Promise.all(files.slice(0, MAX_SCREENSHOTS).map((file, index) => fileToAnalysisImage(file, index)));
}
