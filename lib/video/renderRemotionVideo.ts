import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { VideoTemplateId } from "@/lib/campaignTypes";
import type { VideoRenderInput } from "@/lib/video/renderProgrammaticVideo";
import { DEFAULT_VIDEO_FPS, videoTemplateDurations } from "@/lib/video/videoConfig";

const COMPOSITION_IDS: Record<VideoTemplateId, string> = {
  mood_teaser: "MoodTeaser",
  logo_reveal: "LogoReveal",
  kinetic_headline: "KineticHeadline",
  screenshot_reel: "ScreenshotReel",
  countdown_teaser: "CountdownTeaser",
};

let cachedServeUrl: string | null = null;
let bundlePromise: Promise<string> | null = null;

async function getRemotionServeUrl() {
  if (cachedServeUrl) return cachedServeUrl;

  if (!bundlePromise) {
    const entryPoint = path.join(process.cwd(), "remotion", "index.ts");
    bundlePromise = bundle({
      entryPoint,
      onProgress: () => undefined,
    }).then((serveUrl) => {
      cachedServeUrl = serveUrl;
      return serveUrl;
    });
  }

  return bundlePromise;
}

function bufferToDataUrl(buffer: Buffer): string {
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

function buildRemotionInputProps(input: VideoRenderInput) {
  const stills =
    input.stillBuffers && input.stillBuffers.length > 0 ? input.stillBuffers : [input.stillBuffer];
  const imageDataUrls = stills.map((buffer) => bufferToDataUrl(buffer));
  const labels =
    input.segmentLabels && input.segmentLabels.length >= stills.length
      ? input.segmentLabels.slice(0, stills.length)
      : stills.map(() => input.headline);

  switch (input.template) {
    case "screenshot_reel":
      return {
        images: imageDataUrls,
        labels,
        headline: input.headline,
      };
    case "logo_reveal":
      return {
        imageSrc: imageDataUrls[0],
        headline: input.headline,
      };
    case "kinetic_headline":
      return {
        headline: input.headline,
        accentColor: "#45d6b5",
      };
    case "countdown_teaser":
      return {
        headline: input.headline,
        targetLabel: "Launch",
      };
    case "mood_teaser":
    default:
      return {
        imageSrc: imageDataUrls[0],
        headline: input.headline,
      };
  }
}

export async function renderRemotionVideo(input: VideoRenderInput): Promise<Buffer> {
  const serveUrl = await getRemotionServeUrl();
  const compositionId = COMPOSITION_IDS[input.template];
  const inputProps = buildRemotionInputProps(input);
  const fps = input.fps ?? DEFAULT_VIDEO_FPS;

  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    inputProps,
  });

  const durationInFrames =
    input.template === "screenshot_reel"
      ? composition.durationInFrames
      : Math.round(fps * (input.durationSec ?? videoTemplateDurations[input.template] ?? 6));

  const workId = randomUUID();
  const workDir = join(tmpdir(), `pf-remotion-${workId}`);
  const outputPath = join(workDir, "out.mp4");

  await mkdir(workDir, { recursive: true });

  try {
    await renderMedia({
      serveUrl,
      composition: {
        ...composition,
        width: input.width,
        height: input.height,
        durationInFrames,
        fps,
      },
      codec: "h264",
      outputLocation: outputPath,
      inputProps,
      chromiumOptions: {
        disableWebSecurity: true,
      },
    });

    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export function clearRemotionBundleCache() {
  cachedServeUrl = null;
  bundlePromise = null;
}
