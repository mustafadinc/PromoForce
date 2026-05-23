import {
  APP_STORE_EXPORT_HEIGHT,
  APP_STORE_EXPORT_WIDTH,
  APP_STORE_EXPORT_PRESETS,
  type AppStoreExportPreset,
} from "@/lib/appStoreImageSizes";

export type AppStoreLintIssue = {
  level: "error" | "warn";
  code: string;
  message: string;
};

export type AppStoreLintResult = {
  ok: boolean;
  issues: AppStoreLintIssue[];
};

export async function lintAppStoreSlidePng(
  pngBuffer: Buffer,
  preset: AppStoreExportPreset = "iphone_67",
): Promise<AppStoreLintResult> {
  const issues: AppStoreLintIssue[] = [];
  const target = APP_STORE_EXPORT_PRESETS[preset];

  const meta = await import("sharp").then((m) => m.default(pngBuffer).metadata());

  if (meta.width !== target.width || meta.height !== target.height) {
    issues.push({
      level: "error",
      code: "dimensions",
      message: `Expected ${target.width}×${target.height} (${preset}), got ${meta.width}×${meta.height}.`,
    });
  }

  const bytes = pngBuffer.length;
  if (bytes > 8 * 1024 * 1024) {
    issues.push({
      level: "warn",
      code: "file_size",
      message: `PNG is ${(bytes / (1024 * 1024)).toFixed(1)} MB — App Store Connect may prefer under 8 MB.`,
    });
  }

  const aspect = (meta.width || 1) / (meta.height || 1);
  const targetAspect = target.width / target.height;
  if (Math.abs(aspect - targetAspect) > 0.02) {
    issues.push({
      level: "error",
      code: "aspect",
      message: `Aspect ratio ${aspect.toFixed(3)} does not match App Store ${targetAspect.toFixed(3)}.`,
    });
  }

  return {
    ok: !issues.some((i) => i.level === "error"),
    issues,
  };
}

export function getDefaultExportPreset(): AppStoreExportPreset {
  return "iphone_67";
}

export { APP_STORE_EXPORT_WIDTH, APP_STORE_EXPORT_HEIGHT };
