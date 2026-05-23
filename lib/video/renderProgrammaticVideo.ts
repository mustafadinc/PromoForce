import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { VideoTemplateId } from "@/lib/campaignTypes";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export type VideoRenderInput = {
  template: VideoTemplateId;
  stillBuffer: Buffer;
  headline: string;
  width: number;
  height: number;
  fps?: number;
  durationSec?: number;
};

async function generateKenBurnsFrames(
  still: Buffer,
  width: number,
  height: number,
  frameCount: number,
  outDir: string,
) {
  const meta = await sharp(still).metadata();
  const srcW = meta.width ?? width;
  const srcH = meta.height ?? height;

  for (let i = 0; i < frameCount; i++) {
    const t = i / Math.max(frameCount - 1, 1);
    const scale = 1 + t * 0.12;
    const zoomW = Math.round(srcW * scale);
    const zoomH = Math.round(srcH * scale);
    const left = Math.round((zoomW - width) * t * 0.5);
    const top = Math.round((zoomH - height) * t * 0.3);

    const frame = await sharp(still)
      .resize(zoomW, zoomH, { fit: "cover" })
      .extract({
        left: Math.min(left, Math.max(0, zoomW - width)),
        top: Math.min(top, Math.max(0, zoomH - height)),
        width: Math.min(width, zoomW),
        height: Math.min(height, zoomH),
      })
      .png()
      .toBuffer();

    await writeFile(join(outDir, `frame_${String(i).padStart(4, "0")}.png`), frame);
  }
}

async function encodeFramesToMp4(frameDir: string, fps: number, outputPath: string) {
  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(join(frameDir, "frame_%04d.png"))
      .inputFPS(fps)
      .outputOptions(["-pix_fmt yuv420p", "-movflags +faststart"])
      .on("end", () => resolve())
      .on("error", reject)
      .save(outputPath);
  });
}

export async function renderProgrammaticVideo(input: VideoRenderInput): Promise<Buffer> {
  const fps = input.fps ?? 24;
  const durationSec = input.durationSec ?? (input.template === "logo_reveal" ? 3 : 6);
  const frameCount = fps * durationSec;
  const workId = randomUUID();
  const workDir = join(tmpdir(), `pf-video-${workId}`);
  const frameDir = join(workDir, "frames");
  const outputPath = join(workDir, "out.mp4");

  await mkdir(frameDir, { recursive: true });

  try {
    await generateKenBurnsFrames(input.stillBuffer, input.width, input.height, frameCount, frameDir);
    await encodeFramesToMp4(frameDir, fps, outputPath);

    const { readFile } = await import("node:fs/promises");
    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export const videoTemplateDurations: Record<VideoTemplateId, number> = {
  logo_reveal: 3,
  mood_teaser: 6,
  screenshot_reel: 8,
  kinetic_headline: 5,
  countdown_teaser: 4,
};
