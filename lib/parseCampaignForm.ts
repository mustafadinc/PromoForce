import { MAX_SCREENSHOTS, type AppProfile, type LocaleCode, type SocialProofInput } from "@/lib/campaignTypes";
import { parseLocalesInput } from "@/lib/locales";
import type { LocaleScreenshotsMap } from "@/lib/localeScreenshots";

const maxUploadSize = Number(process.env.MAX_UPLOAD_SIZE_MB || 10) * 1024 * 1024;
const acceptedImageTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

function isAcceptedImageFile(file: File) {
  if (file.type && acceptedImageTypes.has(file.type)) {
    return true;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp";
}

function parseSocialProof(formData: FormData): SocialProofInput | undefined {
  const reviewQuotesRaw = String(formData.get("reviewQuotes") || "").trim();
  const ratingRaw = String(formData.get("rating") || "").trim();
  const downloadCount = String(formData.get("downloadCount") || "").trim();
  const awardsRaw = String(formData.get("awards") || "").trim();

  const reviewQuotes = reviewQuotesRaw
    ? reviewQuotesRaw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];
  const awards = awardsRaw
    ? awardsRaw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];
  const rating = ratingRaw ? Number.parseFloat(ratingRaw) : undefined;

  if (!reviewQuotes.length && !downloadCount && !awards.length && !rating) {
    return undefined;
  }

  return {
    reviewQuotes: reviewQuotes.length ? reviewQuotes : undefined,
    rating: Number.isFinite(rating) ? rating : undefined,
    downloadCount: downloadCount || undefined,
    awards: awards.length ? awards : undefined,
  };
}

export function parseAppProfile(formData: FormData): AppProfile {
  const localesRaw = formData.get("locales");
  return {
    appName: String(formData.get("appName") || "").trim(),
    category: String(formData.get("category") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    targetAudience: String(formData.get("targetAudience") || "").trim(),
    appTitle: String(formData.get("appTitle") || "").trim() || undefined,
    appSubtitle: String(formData.get("appSubtitle") || "").trim() || undefined,
    keywords: String(formData.get("keywords") || "").trim() || undefined,
    locales: parseLocalesInput(localesRaw),
    socialProof: parseSocialProof(formData),
  };
}

export function parseLocaleFromForm(formData: FormData) {
  const locale = String(formData.get("locale") || "").trim();
  return locale || undefined;
}

export function extractScreenshots(formData: FormData): File[] {
  const entries = formData.getAll("screenshots");
  return entries.filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

export function extractScreenshotsByLocale(
  formData: FormData,
  locales: LocaleCode[],
): LocaleScreenshotsMap {
  const map: LocaleScreenshotsMap = {};

  for (const locale of locales) {
    const files = formData
      .getAll(`screenshots_${locale}`)
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (files.length) {
      map[locale] = files.map((file, index) => ({
        file,
        previewUrl: "",
        index,
      }));
    }
  }

  if (Object.keys(map).length === 0) {
    const legacy = extractScreenshots(formData);
    if (legacy.length && locales[0]) {
      map[locales[0]] = legacy.map((file, index) => ({ file, previewUrl: "", index }));
    }
  }

  return map;
}

export function validateLocaleScreenshotsForApi(
  locales: LocaleCode[],
  map: LocaleScreenshotsMap,
) {
  if (!locales.length) {
    return "Select at least one language.";
  }

  for (const locale of locales) {
    const files = map[locale]?.map((s) => s.file) ?? [];
    const err = validateScreenshots(files);
    if (err) {
      return `${locale}: ${err}`;
    }
  }

  return "";
}

/** Prefer single slide attachment; fall back to indexed multi-upload for legacy callers. */
export function extractSlideScreenshot(formData: FormData, screenshotIndex: number | null): File | null {
  const single = formData.get("screenshot");
  if (single instanceof File && single.size > 0) return single;

  const all = extractScreenshots(formData);
  if (screenshotIndex !== null && screenshotIndex >= 0 && all[screenshotIndex]) {
    return all[screenshotIndex]!;
  }
  return all[0] ?? null;
}

export function validateAppProfile(profile: AppProfile) {
  if (!profile.appName || !profile.category || !profile.description) {
    return "App name, category, and description are required.";
  }

  return "";
}

export function validateScreenshots(screenshots: File[]) {
  if (screenshots.length === 0) {
    return "Upload at least one app screenshot.";
  }

  if (screenshots.length > MAX_SCREENSHOTS) {
    return `You can upload up to ${MAX_SCREENSHOTS} screenshots.`;
  }

  for (const screenshot of screenshots) {
    if (!isAcceptedImageFile(screenshot)) {
      return "Unsupported image type. Please upload PNG, JPG, JPEG, or WebP.";
    }

    if (screenshot.size > maxUploadSize) {
      return `Each screenshot must be under ${process.env.MAX_UPLOAD_SIZE_MB || 10} MB.`;
    }
  }

  return "";
}
