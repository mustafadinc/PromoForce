import { styleOptions, type PromoFormValues, type StyleName } from "@/lib/types";

const maxUploadSize = Number(process.env.MAX_UPLOAD_SIZE_MB || 10) * 1024 * 1024;
const acceptedImageTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

export function parsePromoFormData(formData: FormData): PromoFormValues {
  const styleValue = String(formData.get("style") || "Minimal SaaS");
  const style: StyleName = styleOptions.includes(styleValue as StyleName)
    ? (styleValue as StyleName)
    : "Minimal SaaS";

  return {
    appName: String(formData.get("appName") || "").trim(),
    category: String(formData.get("category") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    targetAudience: String(formData.get("targetAudience") || "").trim(),
    style,
  };
}

export function validatePromoInput(values: PromoFormValues, screenshot: File | null) {
  if (!values.appName || !values.category || !values.description) {
    return "App name, category, and description are required.";
  }

  if (!screenshot) {
    return "Screenshot is required.";
  }

  if (!acceptedImageTypes.has(screenshot.type)) {
    return "Unsupported image type. Please upload PNG, JPG, JPEG, or WebP.";
  }

  if (screenshot.size > maxUploadSize) {
    return `Screenshot is too large. Maximum size is ${process.env.MAX_UPLOAD_SIZE_MB || 10} MB.`;
  }

  return "";
}
