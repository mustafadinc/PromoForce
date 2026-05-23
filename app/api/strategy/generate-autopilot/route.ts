import { NextResponse } from "next/server";
import type { BrandMemory } from "@/lib/campaignTypes";
import { generateAutopilotStrategyBrief } from "@/lib/agents/autopilotStrategyAgent";
import { prepareStrategyImages } from "@/lib/strategyImageUtils";
import { extractScreenshots, parseAppProfile, validateAppProfile, validateScreenshots } from "@/lib/parseCampaignForm";

function parseDuration(value: FormDataEntryValue | null) {
  const duration = Number(value);
  return duration === 30 ? 30 : 7;
}

function parseStartDate(value: FormDataEntryValue | null) {
  const date = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  return new Date().toISOString().slice(0, 10);
}

function parseBrandMemory(formData: FormData): BrandMemory | null {
  const raw = String(formData.get("brandMemory") || "").trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw) as BrandMemory;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const profile = parseAppProfile(formData);
    const screenshots = extractScreenshots(formData);
    const duration = parseDuration(formData.get("duration"));
    const startDate = parseStartDate(formData.get("startDate"));
    const brandMemory = parseBrandMemory(formData);

    const profileError = validateAppProfile(profile);
    if (profileError) {
      return NextResponse.json({ error: profileError }, { status: 400 });
    }

    const screenshotError = validateScreenshots(screenshots);
    if (screenshotError) {
      return NextResponse.json({ error: screenshotError }, { status: 400 });
    }

    const images = await prepareStrategyImages(screenshots);
    const performanceContext = String(formData.get("performanceContext") || "");
    const strategy = await generateAutopilotStrategyBrief(
      profile,
      images,
      duration,
      startDate,
      brandMemory,
      performanceContext,
    );

    return NextResponse.json({ strategy });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Autopilot strategy generation failed.",
      },
      { status: 500 },
    );
  }
}
