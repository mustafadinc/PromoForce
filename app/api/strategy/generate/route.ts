import { NextResponse } from "next/server";
import { generateMultiLocaleStrategyBriefs } from "@/lib/agents/strategyAgent";
import { buildScreenshotIntelligenceContext } from "@/lib/prepareScreenshotIntelligence";
import {
  extractScreenshotsByLocale,
  parseAppProfile,
  validateAppProfile,
  validateLocaleScreenshotsForApi,
} from "@/lib/parseCampaignForm";
import type { LocaleCode } from "@/lib/locales";
import type { LocaleScreenshotsMap } from "@/lib/localeScreenshots";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const profile = parseAppProfile(formData);
    const locales = profile.locales?.length ? profile.locales : (["en"] as LocaleCode[]);
    const screenshotsByLocale = extractScreenshotsByLocale(formData, locales);

    const profileError = validateAppProfile(profile);
    if (profileError) {
      return NextResponse.json({ error: profileError }, { status: 400 });
    }

    const screenshotError = validateLocaleScreenshotsForApi(locales, screenshotsByLocale);
    if (screenshotError) {
      return NextResponse.json({ error: screenshotError }, { status: 400 });
    }

    const localeContexts: Partial<
      Record<
        LocaleCode,
        Awaited<ReturnType<typeof buildScreenshotIntelligenceContext>>
      >
    > = {};

    for (const locale of locales) {
      const files = screenshotsByLocale[locale]?.map((s) => s.file) ?? [];
      if (files.length) {
        localeContexts[locale] = await buildScreenshotIntelligenceContext(profile, files, locale);
      }
    }

    const result = await generateMultiLocaleStrategyBriefs(profile, localeContexts);

    return NextResponse.json({
      strategy: result.strategy,
      strategies: result.strategies,
      primaryLocale: result.primaryLocale,
      screenshotIntelligence: result.screenshotIntelligence,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Strategy generation failed.",
      },
      { status: 500 },
    );
  }
}
