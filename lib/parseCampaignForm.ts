import { MAX_SCREENSHOTS, type AppProfile } from "@/lib/campaignTypes";

const maxUploadSize = Number(process.env.MAX_UPLOAD_SIZE_MB || 10) * 1024 * 1024;
const acceptedImageTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

function isAcceptedImageFile(file: File) {
  if (file.type && acceptedImageTypes.has(file.type)) {
    return true;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp";
}

export function parseAppProfile(formData: FormData): AppProfile {
  return {
    appName: String(formData.get("appName") || "").trim(),
    category: String(formData.get("category") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    targetAudience: String(formData.get("targetAudience") || "").trim(),
  };
}

export function extractScreenshots(formData: FormData): File[] {
  const entries = formData.getAll("screenshots");
  return entries.filter((entry): entry is File => entry instanceof File && entry.size > 0);
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
