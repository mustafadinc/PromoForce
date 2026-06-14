import type { LocaleCode, UploadedScreenshot } from "@/lib/campaignTypes";
import { getLocaleDefinition } from "@/lib/locales";

export type LocaleScreenshotsMap = Partial<Record<LocaleCode, UploadedScreenshot[]>>;

export function getScreenshotsForLocale(
  map: LocaleScreenshotsMap,
  locale: LocaleCode,
  fallback: UploadedScreenshot[] = [],
): UploadedScreenshot[] {
  return map[locale]?.length ? map[locale]! : fallback;
}

export function flattenLocaleScreenshots(map: LocaleScreenshotsMap): UploadedScreenshot[] {
  const first = Object.values(map).find((shots) => shots && shots.length > 0);
  return first ?? [];
}

export function validateLocaleScreenshots(
  locales: LocaleCode[],
  map: LocaleScreenshotsMap,
): string {
  for (const locale of locales) {
    const shots = map[locale];
    if (!shots?.length) {
      const label = getLocaleDefinition(locale).label;
      return `Upload at least one app screenshot for ${label}.`;
    }
  }
  return "";
}

export function appendLocaleScreenshotsToFormData(
  formData: FormData,
  map: LocaleScreenshotsMap,
  locales: LocaleCode[],
) {
  for (const locale of locales) {
    const shots = map[locale] ?? [];
    for (const shot of shots) {
      formData.append(`screenshots_${locale}`, shot.file);
    }
  }
}

export function normalizeLocaleScreenshotsMap(
  map: LocaleScreenshotsMap,
  locales: LocaleCode[],
): LocaleScreenshotsMap {
  const out: LocaleScreenshotsMap = {};
  for (const locale of locales) {
    const shots = (map[locale] ?? []).map((item, index) => ({ ...item, index }));
    if (shots.length) out[locale] = shots;
  }
  return out;
}
