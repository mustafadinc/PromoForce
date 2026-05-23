/** Native generation — App Store iPhone 6.7" aspect, API-safe (multiples of 16). */
export const APP_STORE_GENERATION_SIZE = "1280x2784" as const;
export const APP_STORE_GENERATION_WIDTH = 1280;
export const APP_STORE_GENERATION_HEIGHT = 2784;

/** Final export — Apple App Store Connect exact upload size. */
export const APP_STORE_EXPORT_WIDTH = 1290;
export const APP_STORE_EXPORT_HEIGHT = 2796;

export type AppStoreGenerationSize = typeof APP_STORE_GENERATION_SIZE;

export function getAppStoreGenerationSize(): AppStoreGenerationSize {
  const raw = process.env.APP_STORE_GENERATION_SIZE?.trim();
  if (raw && /^\d+x\d+$/.test(raw)) {
    return raw as AppStoreGenerationSize;
  }
  return APP_STORE_GENERATION_SIZE;
}

export function parseImageSize(size: string): { width: number; height: number } {
  const [width, height] = size.split("x").map(Number);
  if (!width || !height) {
    return { width: APP_STORE_GENERATION_WIDTH, height: APP_STORE_GENERATION_HEIGHT };
  }
  return { width, height };
}

export function isAppStorePortraitAspect(width: number, height: number) {
  return height > width && height / width >= 2.05;
}

export function formatExportLabel() {
  return `${APP_STORE_EXPORT_WIDTH}×${APP_STORE_EXPORT_HEIGHT}`;
}

export function formatGenerationLabel() {
  return `${APP_STORE_GENERATION_WIDTH}×${APP_STORE_GENERATION_HEIGHT}`;
}

/** App Store Connect upload sizes (SKILL.md dimension table). */
export const APP_STORE_EXPORT_PRESETS = {
  iphone_67: {
    id: "iphone_67" as const,
    label: "iPhone 6.7\" (1290×2796)",
    width: 1290,
    height: 2796,
  },
  iphone_65_alt: {
    id: "iphone_65_alt" as const,
    label: "iPhone 6.5\" (1242×2688)",
    width: 1242,
    height: 2688,
  },
  iphone_69: {
    id: "iphone_69" as const,
    label: "iPhone 6.9\" (1320×2868)",
    width: 1320,
    height: 2868,
  },
} as const;

export type AppStoreExportPreset = keyof typeof APP_STORE_EXPORT_PRESETS;
