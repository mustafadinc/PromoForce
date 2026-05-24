import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { renderProgrammaticVideo } from "@/lib/video/renderProgrammaticVideo";
import { videoTemplateDurations } from "@/lib/video/videoConfig";
import { uploadToR2, buildAssetKey } from "@/lib/storage/r2";
import type { VideoTemplateId } from "@/lib/campaignTypes";

function parseBase64Buffer(value: string): Buffer {
  return Buffer.from(value.replace(/^data:[^;]+;base64,/, ""), "base64");
}

function parseSegmentLabels(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const stillBase64 = String(formData.get("stillBase64") || "");
    const stillsBase64Raw = String(formData.get("stillsBase64") || "");
    const headline = String(formData.get("headline") || "");
    const segmentLabels = parseSegmentLabels(String(formData.get("segmentLabels") || ""));
    const template = (String(formData.get("template") || "mood_teaser") as VideoTemplateId) || "mood_teaser";
    const width = Number(formData.get("width")) || 1080;
    const height = Number(formData.get("height")) || 1920;
    const postId = String(formData.get("postId") || randomId());

    let stillBuffers: Buffer[] = [];
    if (stillsBase64Raw) {
      try {
        const parsed = JSON.parse(stillsBase64Raw) as unknown;
        if (Array.isArray(parsed)) {
          stillBuffers = parsed.map((item) => parseBase64Buffer(String(item))).filter((buf) => buf.length > 0);
        }
      } catch {
        // fall through to single still
      }
    }

    if (!stillBuffers.length && stillBase64) {
      stillBuffers = [parseBase64Buffer(stillBase64)];
    }

    if (!stillBuffers.length) {
      return NextResponse.json({ error: "stillBase64 or stillsBase64 is required" }, { status: 400 });
    }

    const durationSec = videoTemplateDurations[template] ?? 6;

    const mp4 = await renderProgrammaticVideo({
      template,
      stillBuffer: stillBuffers[0],
      stillBuffers: stillBuffers.length >= 2 ? stillBuffers : undefined,
      headline,
      segmentLabels,
      width,
      height,
      durationSec,
    });

    let videoUrl: string | null = null;
    let r2Key: string | null = null;

    if (process.env.R2_BUCKET_NAME && isDatabaseConfigured()) {
      try {
        const { requireSession, requireWorkspace } = await import("@/lib/auth-server");
        const user = await requireSession();
        const workspace = await requireWorkspace(user.id);
        r2Key = buildAssetKey(workspace.id, postId, `${template}.mp4`);
        const uploaded = await uploadToR2(r2Key, mp4, "video/mp4");
        videoUrl = uploaded.url;
      } catch {
        // R2 upload is optional — local dataUrl is always returned for preview/download.
      }
    }

    const dataUrl = `data:video/mp4;base64,${mp4.toString("base64")}`;

    return NextResponse.json({
      dataUrl,
      videoUrl,
      r2Key,
      template,
      durationSec,
      segmentCount: stillBuffers.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Video generation failed" },
      { status: 500 },
    );
  }
}

function randomId() {
  return `vid_${Date.now()}`;
}
