import sharp from "sharp";
import { compositeMarketingSlide } from "@/lib/compositeMarketingSlide";
import type { VisualTemplateInput } from "@/lib/visualTemplates/registry";

export async function renderFeatureSpotlight(input: VisualTemplateInput): Promise<Buffer> {
  const { width, height } = input;
  const zoomW = Math.round(width * 1.15);
  const zoomH = Math.round(height * 1.15);

  const composite = await compositeMarketingSlide({
    ...input,
    width: zoomW,
    height: zoomH,
    layoutStyle: "lifestyle_focus",
    showAppBranding: false,
  });

  const cropLeft = Math.round((zoomW - width) / 2);
  const cropTop = Math.round((zoomH - height) * 0.35);

  return sharp(composite)
    .extract({ left: cropLeft, top: cropTop, width, height })
    .png()
    .toBuffer();
}
