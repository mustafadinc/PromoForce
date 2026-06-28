import sharp from "sharp";
import { compositeMarketingSlide } from "@/lib/compositeMarketingSlide";
import type { VisualTemplateInput } from "@/lib/visualTemplates/registry";

export async function renderAnnotatedScreenshot(input: VisualTemplateInput): Promise<Buffer> {
  const composite = await compositeMarketingSlide({
    background: input.background,
    screenshot: input.screenshot,
    headline: input.headline,
    subheadline: input.subheadline,
    width: input.width,
    height: input.height,
    accentColor: input.accentColor,
    layoutStyle: "lifestyle_focus",
    showAppBranding: false,
    locale: input.locale,
    fontFamily: input.fontFamily,
  });

  const scale = input.width / 1024;
  const arrowSvg = Buffer.from(`
<svg width="${input.width}" height="${input.height}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${Math.round(input.width * 0.72)}" cy="${Math.round(input.height * 0.55)}" r="${Math.round(28 * scale)}" fill="none" stroke="#45d6b5" stroke-width="4" opacity="0.9"/>
  <path d="M ${Math.round(input.width * 0.72)} ${Math.round(input.height * 0.55 - 50 * scale)} L ${Math.round(input.width * 0.72)} ${Math.round(input.height * 0.55 + 20 * scale)}" stroke="#45d6b5" stroke-width="4" fill="none"/>
  <polygon points="${Math.round(input.width * 0.72 - 10 * scale)},${Math.round(input.height * 0.55 + 15 * scale)} ${Math.round(input.width * 0.72 + 10 * scale)},${Math.round(input.height * 0.55 + 15 * scale)} ${Math.round(input.width * 0.72)},${Math.round(input.height * 0.55 + 35 * scale)}" fill="#45d6b5"/>
</svg>`);

  const overlay = await sharp(arrowSvg).png().toBuffer();
  return sharp(composite).composite([{ input: overlay, top: 0, left: 0 }]).png().toBuffer();
}
