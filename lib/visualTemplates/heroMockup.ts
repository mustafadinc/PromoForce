import { compositeMarketingSlide } from "@/lib/compositeMarketingSlide";
import type { VisualTemplateInput } from "@/lib/visualTemplates/registry";

/** Hero mockup — phone + headline on branded background (default social template). */
export async function renderHeroMockup(input: VisualTemplateInput): Promise<Buffer> {
  return compositeMarketingSlide({
    background: input.background,
    screenshot: input.screenshot,
    headline: input.headline,
    subheadline: input.subheadline,
    width: input.width,
    height: input.height,
    accentColor: input.accentColor,
    layoutStyle: "hero_branded",
    showAppBranding: true,
  });
}
