import { NextResponse } from "next/server";

import {
  getAppStoreGenerationSize,
  isAppStorePortraitAspect,
  parseImageSize,
} from "@/lib/appStoreImageSizes";
import { normalizeMockupAssetId, type MockupAssetId } from "@/lib/assetMockup";
import { compositeMockupOnlySlide } from "@/lib/compositeMarketingSlide";
import type { MockupPose } from "@/lib/mockupPose";
import { normalizeMockupPose } from "@/lib/mockupPose";
import { upscaleToAppStoreExport } from "@/lib/upscaleAppStoreExport";

export const runtime = "nodejs";

type ExportMockupOnlyBody = {
  screenshotDataUrl?: string;
  mockupAssetId?: MockupAssetId;
  mockupPose?: MockupPose;
  mockupColor?: string;
  slideNumber?: number;
  phoneHeightRatio?: number;
  width?: number;
  height?: number;
};

function screenshotFromDataUrl(raw: string): Buffer | null {
  if (!raw) return null;
  const base64 = raw.includes(",") ? raw.split(",")[1] : raw;
  if (!base64) return null;
  return Buffer.from(base64, "base64");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExportMockupOnlyBody;
    const screenshot = screenshotFromDataUrl(String(body.screenshotDataUrl || ""));
    if (!screenshot) {
      return NextResponse.json({ error: "screenshotDataUrl is required." }, { status: 400 });
    }

    const fallback = parseImageSize(getAppStoreGenerationSize());
    const width = Math.max(320, Math.min(2048, Math.round(body.width ?? fallback.width)));
    const height = Math.max(640, Math.min(4096, Math.round(body.height ?? fallback.height)));
    const slideNumber = body.slideNumber ?? 1;
    const mockupAssetId = normalizeMockupAssetId(body.mockupAssetId);
    const mockupPose = normalizeMockupPose(body.mockupPose, slideNumber);

    let png = await compositeMockupOnlySlide({
      screenshot,
      width,
      height,
      mockupColor: body.mockupColor,
      mockupPose,
      mockupAssetId,
      slideNumber,
      phoneHeightRatio: body.phoneHeightRatio,
    });

    if (isAppStorePortraitAspect(width, height)) {
      png = await upscaleToAppStoreExport(png);
    }

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="mockup-${slideNumber}.png"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mockup export failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
