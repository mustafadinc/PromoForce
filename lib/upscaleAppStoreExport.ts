import sharp from "sharp";
import {
  APP_STORE_EXPORT_HEIGHT,
  APP_STORE_EXPORT_WIDTH,
} from "@/lib/appStoreImageSizes";

/** Uniform upscale to App Store upload size — same aspect (~0.46), no stretch. */
export async function upscaleToAppStoreExport(input: Buffer): Promise<Buffer> {
  const meta = await sharp(input).metadata();
  if (meta.width === APP_STORE_EXPORT_WIDTH && meta.height === APP_STORE_EXPORT_HEIGHT) {
    return input;
  }

  return sharp(input)
    .resize(APP_STORE_EXPORT_WIDTH, APP_STORE_EXPORT_HEIGHT, {
      kernel: sharp.kernel.lanczos3,
      fit: "fill",
    })
    .png({ compressionLevel: 6, adaptiveFiltering: true })
    .toBuffer();
}
