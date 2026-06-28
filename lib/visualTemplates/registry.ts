import type { VisualTemplateId } from "@/lib/campaignTypes";
import { compositeMarketingSlide } from "@/lib/compositeMarketingSlide";
import { renderQuoteCard } from "@/lib/visualTemplates/quoteCard";
import { renderStatCard } from "@/lib/visualTemplates/statCard";
import { renderComparisonSplit } from "@/lib/visualTemplates/comparisonSplit";
import { renderAnnotatedScreenshot } from "@/lib/visualTemplates/annotatedScreenshot";
import { renderFeatureSpotlight } from "@/lib/visualTemplates/featureSpotlight";

export type VisualTemplateInput = {
  background: Buffer;
  screenshot?: Buffer | null;
  headline: string;
  subheadline: string;
  accentColor?: string;
  width: number;
  height: number;
  statValue?: string;
  statLabel?: string;
  quoteAttribution?: string;
  beforeLabel?: string;
  afterLabel?: string;
  locale?: import("@/lib/locales").LocaleCode;
  fontFamily?: string;
};

export async function renderVisualTemplate(
  templateId: VisualTemplateId | undefined,
  input: VisualTemplateInput,
): Promise<Buffer> {
  const id = templateId ?? "hero_mockup";

  switch (id) {
    case "quote_card":
      return renderQuoteCard(input);
    case "stat_card":
      return renderStatCard(input);
    case "comparison_split":
      return renderComparisonSplit(input);
    case "annotated_screenshot":
      return renderAnnotatedScreenshot(input);
    case "feature_spotlight":
      return renderFeatureSpotlight(input);
    case "hero_mockup":
    default:
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
        locale: input.locale,
        fontFamily: input.fontFamily,
      });
  }
}

export const visualTemplateLabels: Record<VisualTemplateId, string> = {
  hero_mockup: "Hero mockup",
  quote_card: "Quote card",
  stat_card: "Stat highlight",
  comparison_split: "Before / After",
  annotated_screenshot: "Annotated screen",
  feature_spotlight: "Feature spotlight",
};
