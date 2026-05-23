import type { CarouselSlidePlan, VisualTemplateId } from "@/lib/campaignTypes";
import { renderVisualTemplate, type VisualTemplateInput } from "@/lib/visualTemplates/registry";

export type CarouselSlideResult = {
  slideIndex: number;
  buffer: Buffer;
};

export async function generateCarouselSlides(
  slides: CarouselSlidePlan[],
  baseInput: Omit<VisualTemplateInput, "headline" | "subheadline"> & {
    defaultHeadline: string;
    defaultSubheadline: string;
  },
): Promise<CarouselSlideResult[]> {
  const results: CarouselSlideResult[] = [];

  for (const slide of slides) {
    const buffer = await renderVisualTemplate(slide.visualTemplate as VisualTemplateId, {
      ...baseInput,
      headline: slide.headline || baseInput.defaultHeadline,
      subheadline: slide.subheadline || baseInput.defaultSubheadline,
    });
    results.push({ slideIndex: slide.slideIndex, buffer });
  }

  return results;
}

export function buildDefaultCarouselSlides(
  headline: string,
  subheadline: string,
  count = 4,
): CarouselSlidePlan[] {
  const templates: VisualTemplateId[] = ["hero_mockup", "feature_spotlight", "stat_card", "quote_card"];
  return Array.from({ length: count }, (_, i) => ({
    slideIndex: i + 1,
    headline: i === 0 ? headline : i === count - 1 ? "Download now" : `Step ${i}`,
    subheadline: i === 0 ? subheadline : "",
    visualTemplate: templates[i % templates.length],
  }));
}
