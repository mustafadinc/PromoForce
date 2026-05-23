import sharp from "sharp";
import { APP_STORE_EXPORT_PRESETS, type AppStoreExportPreset } from "@/lib/appStoreImageSizes";

/** Server-only resize for API export routes. */
export async function resizeToExportPreset(input: Buffer, preset: AppStoreExportPreset): Promise<Buffer> {
  const { width, height } = APP_STORE_EXPORT_PRESETS[preset];
  return sharp(input)
    .resize(width, height, { kernel: sharp.kernel.lanczos3, fit: "fill" })
    .png({ compressionLevel: 6, adaptiveFiltering: true })
    .toBuffer();
}
