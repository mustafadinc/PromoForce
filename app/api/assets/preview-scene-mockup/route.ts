import { NextResponse } from "next/server";
import sharp from "sharp";
import { getSceneMockupAsset, normalizeMockupAssetId } from "@/lib/assetMockup";
import { loadSceneDeviceOverlayBuffer, renderSceneMockupLayer } from "@/lib/renderAssetDevice";

export const runtime = "nodejs";

type PreviewBody = {
  mockupAssetId?: string;
  screenshotDataUrl?: string;
  width?: number;
};

async function screenshotFromBody(body: PreviewBody): Promise<Buffer | null> {
  const raw = body.screenshotDataUrl;
  if (!raw || typeof raw !== "string") return null;
  const base64 = raw.includes(",") ? raw.split(",")[1] : raw;
  if (!base64) return null;
  return Buffer.from(base64, "base64");
}

async function previewBackgroundBuffer(width: number, height: number): Promise<Buffer> {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="20%" y2="100%">
      <stop offset="0%" stop-color="#1e2838"/>
      <stop offset="45%" stop-color="#121820"/>
      <stop offset="100%" stop-color="#182830"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PreviewBody;
    const asset = getSceneMockupAsset(normalizeMockupAssetId(body.mockupAssetId));
    if (!asset) {
      return NextResponse.json({ error: "Not a scene mockup asset." }, { status: 400 });
    }

    const screenshot = await screenshotFromBody(body);
    if (!screenshot) {
      return NextResponse.json({ error: "screenshotDataUrl is required." }, { status: 400 });
    }

    const width = Math.max(240, Math.min(960, Math.round(body.width ?? 480)));
    const height = Math.round((width * asset.height) / asset.width);
    const previewBg = await previewBackgroundBuffer(width, height);
    const png = await renderSceneMockupLayer(previewBg, screenshot, asset, width, height);

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Device frame only on preview background — while screenshot loads. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const asset = getSceneMockupAsset(normalizeMockupAssetId(searchParams.get("mockupAssetId")));
  if (!asset) {
    return NextResponse.json({ error: "Not a scene mockup asset." }, { status: 400 });
  }

  const width = Math.max(240, Math.min(960, Number(searchParams.get("width")) || 480));
  const height = Math.round((width * asset.height) / asset.width);
  const previewBg = await previewBackgroundBuffer(width, height);
  const deviceOverlay = await loadSceneDeviceOverlayBuffer(asset, width, height);

  const png = await sharp(previewBg)
    .composite([{ input: deviceOverlay, top: 0, left: 0 }])
    .png()
    .toBuffer();

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
