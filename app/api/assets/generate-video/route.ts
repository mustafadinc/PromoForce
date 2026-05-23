import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { renderProgrammaticVideo, videoTemplateDurations } from "@/lib/video/renderProgrammaticVideo";
import { uploadToR2, buildAssetKey } from "@/lib/storage/r2";
import type { VideoTemplateId } from "@/lib/campaignTypes";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const stillBase64 = String(formData.get("stillBase64") || "");
    const headline = String(formData.get("headline") || "");
    const template = (String(formData.get("template") || "mood_teaser") as VideoTemplateId) || "mood_teaser";
    const width = Number(formData.get("width")) || 1080;
    const height = Number(formData.get("height")) || 1920;
    const postId = String(formData.get("postId") || randomId());

    if (!stillBase64) {
      return NextResponse.json({ error: "stillBase64 is required" }, { status: 400 });
    }

    const stillBuffer = Buffer.from(stillBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
    const durationSec = videoTemplateDurations[template] ?? 6;

    const mp4 = await renderProgrammaticVideo({
      template,
      stillBuffer,
      headline,
      width,
      height,
      durationSec,
    });

    let videoUrl: string | null = null;
    let r2Key: string | null = null;

    if (process.env.R2_BUCKET_NAME && isDatabaseConfigured()) {
      const { requireSession, requireWorkspace } = await import("@/lib/auth-server");
      const user = await requireSession();
      const workspace = await requireWorkspace(user.id);
      r2Key = buildAssetKey(workspace.id, postId, `${template}.mp4`);
      const uploaded = await uploadToR2(r2Key, mp4, "video/mp4");
      videoUrl = uploaded.url;
    }

    const dataUrl = `data:video/mp4;base64,${mp4.toString("base64")}`;

    return NextResponse.json({
      dataUrl,
      videoUrl,
      r2Key,
      template,
      durationSec,
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
