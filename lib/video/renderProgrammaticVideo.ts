import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { VideoTemplateId } from "@/lib/campaignTypes";
import ffmpeg from "fluent-ffmpeg";
import { resolveFfmpegPath } from "@/lib/video/resolveFfmpegPath";
import { renderRemotionVideo } from "@/lib/video/renderRemotionVideo";
import { DEFAULT_VIDEO_FPS, videoTemplateDurations } from "@/lib/video/videoConfig";

export type VideoRenderInput = {
  template: VideoTemplateId;
  stillBuffer: Buffer;
  stillBuffers?: Buffer[];
  headline: string;
  segmentLabels?: string[];
  width: number;
  height: number;
  fps?: number;
  durationSec?: number;
  /** Skip Remotion and use ffmpeg frame pipeline (tests / fallback). */
  forceFfmpeg?: boolean;
};

type MotionPreset = {
  zoomStart: number;
  zoomEnd: number;
  panX: number;
  panY: number;
};

const motionPresets: MotionPreset[] = [
  { zoomStart: 1, zoomEnd: 1.14, panX: 0.35, panY: 0.2 },
  { zoomStart: 1.12, zoomEnd: 1, panX: 0.15, panY: 0.45 },
  { zoomStart: 1, zoomEnd: 1.1, panX: 0.55, panY: 0.25 },
  { zoomStart: 1.08, zoomEnd: 1, panX: 0.25, panY: 0.5 },
];

const CROSSFADE_FRAMES = 10;

async function generateKenBurnsFramesForStill(
  still: Buffer,
  width: number,
  height: number,
  frameCount: number,
  motion: MotionPreset,
): Promise<Buffer[]> {
  const maxScale = 1.18;
  const base = await sharp(still)
    .resize(Math.ceil(width * maxScale), Math.ceil(height * maxScale), {
      fit: "cover",
      position: "centre",
    })
    .png()
    .toBuffer();

  const meta = await sharp(base).metadata();
  const baseW = meta.width ?? width;
  const baseH = meta.height ?? height;
  const frames: Buffer[] = [];

  for (let i = 0; i < frameCount; i++) {
    const t = i / Math.max(frameCount - 1, 1);
    const zoom = motion.zoomStart + t * (motion.zoomEnd - motion.zoomStart);
    const cropW = Math.min(baseW, Math.max(1, Math.round(width / zoom)));
    const cropH = Math.min(baseH, Math.max(1, Math.round(height / zoom)));
    const maxLeft = Math.max(0, baseW - cropW);
    const maxTop = Math.max(0, baseH - cropH);
    const left = Math.max(0, Math.min(Math.round(maxLeft * motion.panX * (0.5 + t * 0.5)), maxLeft));
    const top = Math.max(0, Math.min(Math.round(maxTop * motion.panY * (0.5 + t * 0.5)), maxTop));

    const frame = await sharp(base)
      .extract({ left, top, width: cropW, height: cropH })
      .resize(width, height, { fit: "fill" })
      .png()
      .toBuffer();

    frames.push(frame);
  }

  return frames;
}

function escapeSvgText(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function overlayLabel(frame: Buffer, label: string, width: number, height: number): Promise<Buffer> {
  const trimmed = label.trim().slice(0, 64);
  if (!trimmed) return frame;

  const safe = escapeSvgText(trimmed);
  const svg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.72)"/>
        </linearGradient>
      </defs>
      <rect x="0" y="${height - Math.round(height * 0.22)}" width="${width}" height="${Math.round(height * 0.22)}" fill="url(#g)"/>
      <text x="48" y="${height - 72}" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(width * 0.048)}" font-weight="700">${safe}</text>
    </svg>`,
  );

  return sharp(frame).composite([{ input: svg, top: 0, left: 0 }]).png().toBuffer();
}

async function blendFrames(a: Buffer, b: Buffer, alpha: number): Promise<Buffer> {
  const weightB = Math.max(0, Math.min(1, alpha));
  const weightA = 1 - weightB;

  const { data: da, info } = await sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data: db } = await sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const out = Buffer.alloc(da.length);

  for (let i = 0; i < da.length; i += channels) {
    out[i] = Math.round(da[i] * weightA + db[i] * weightB);
    out[i + 1] = Math.round(da[i + 1] * weightA + db[i + 1] * weightB);
    out[i + 2] = Math.round(da[i + 2] * weightA + db[i + 2] * weightB);
    if (channels === 4) {
      out[i + 3] = Math.round(da[i + 3] * weightA + db[i + 3] * weightB);
    }
  }

  return sharp(out, { raw: { width: info.width, height: info.height, channels } }).png().toBuffer();
}

async function generateScreenshotReelFrames(
  stills: Buffer[],
  labels: string[],
  width: number,
  height: number,
  frameCount: number,
): Promise<Buffer[]> {
  const segmentCount = stills.length;
  const crossfade = CROSSFADE_FRAMES;
  const segmentFrames = Math.max(24, Math.floor((frameCount + crossfade * (segmentCount - 1)) / segmentCount));
  const labeledSegments: Buffer[][] = [];

  for (let seg = 0; seg < segmentCount; seg++) {
    const motion = motionPresets[seg % motionPresets.length];
    const segFrames = await generateKenBurnsFramesForStill(stills[seg], width, height, segmentFrames, motion);
    const label = labels[seg] || labels[0] || "";
    labeledSegments.push(await Promise.all(segFrames.map((frame) => overlayLabel(frame, label, width, height))));
  }

  const allFrames: Buffer[] = [];

  for (let seg = 0; seg < segmentCount; seg++) {
    const segment = labeledSegments[seg];

    if (seg === 0) {
      const holdEnd = segment.length - crossfade;
      for (let i = 0; i < holdEnd; i++) {
        allFrames.push(segment[i]);
      }

      if (segmentCount === 1) {
        for (let i = holdEnd; i < segment.length; i++) {
          allFrames.push(segment[i]);
        }
        continue;
      }

      const nextSegment = labeledSegments[seg + 1];
      for (let f = 0; f < crossfade; f++) {
        const alpha = (f + 1) / crossfade;
        allFrames.push(await blendFrames(segment[holdEnd + f] ?? segment.at(-1)!, nextSegment[f] ?? nextSegment[0], alpha));
      }
      continue;
    }

    const startIndex = crossfade;
    const endIndex = seg === segmentCount - 1 ? segment.length : segment.length - crossfade;

    for (let i = startIndex; i < endIndex; i++) {
      allFrames.push(segment[i]);
    }

    if (seg < segmentCount - 1) {
      const nextSegment = labeledSegments[seg + 1];
      for (let f = 0; f < crossfade; f++) {
        const alpha = (f + 1) / crossfade;
        allFrames.push(
          await blendFrames(segment[endIndex + f] ?? segment.at(-1)!, nextSegment[f] ?? nextSegment[0], alpha),
        );
      }
    } else {
      for (let i = endIndex; i < segment.length; i++) {
        allFrames.push(segment[i]);
      }
    }
  }

  while (allFrames.length < frameCount) {
    allFrames.push(allFrames[allFrames.length - 1]);
  }

  return allFrames.slice(0, frameCount);
}

async function writeFramesToDir(frames: Buffer[], outDir: string) {
  for (let i = 0; i < frames.length; i++) {
    await writeFile(join(outDir, `frame_${String(i).padStart(4, "0")}.png`), frames[i]);
  }
}

async function encodeFramesToMp4(frameDir: string, fps: number, outputPath: string) {
  ffmpeg.setFfmpegPath(resolveFfmpegPath());

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

async function renderFfmpegVideo(input: VideoRenderInput): Promise<Buffer> {
  const fps = input.fps ?? DEFAULT_VIDEO_FPS;
  const durationSec = input.durationSec ?? (input.template === "logo_reveal" ? 3 : 6);
  const frameCount = fps * durationSec;
  const workId = randomUUID();
  const workDir = join(tmpdir(), `pf-video-${workId}`);
  const frameDir = join(workDir, "frames");
  const outputPath = join(workDir, "out.mp4");

  await mkdir(frameDir, { recursive: true });

  try {
    const stills =
      input.template === "screenshot_reel" && input.stillBuffers && input.stillBuffers.length >= 2
        ? input.stillBuffers.slice(0, 4)
        : [input.stillBuffer];

    const labels =
      input.segmentLabels && input.segmentLabels.length >= stills.length
        ? input.segmentLabels.slice(0, stills.length)
        : stills.map(() => input.headline);

    const frames =
      stills.length >= 2 && input.template === "screenshot_reel"
        ? await generateScreenshotReelFrames(stills, labels, input.width, input.height, frameCount)
        : await generateKenBurnsFramesForStill(
            stills[0],
            input.width,
            input.height,
            frameCount,
            motionPresets[0],
          );

    await writeFramesToDir(frames, frameDir);
    await encodeFramesToMp4(frameDir, fps, outputPath);
    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function renderProgrammaticVideo(input: VideoRenderInput): Promise<Buffer> {
  if (!input.forceFfmpeg && process.env.VIDEO_RENDER_ENGINE !== "ffmpeg") {
    try {
      return await renderRemotionVideo(input);
    } catch (error) {
      console.warn("[video] Remotion render failed, falling back to ffmpeg:", error);
    }
  }

  return renderFfmpegVideo(input);
}
