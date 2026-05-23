import type { PerformanceRating, PerformanceRecord } from "@/lib/campaignTypes";

const STORAGE_KEY = "promoforce-performance";

export function loadPerformanceRecords(appName?: string): PerformanceRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const records = raw ? (JSON.parse(raw) as PerformanceRecord[]) : [];
    return appName
      ? records.filter((record) => record.appName.toLowerCase() === appName.toLowerCase())
      : records;
  } catch {
    return [];
  }
}

export function savePerformanceRecord(record: PerformanceRecord) {
  if (typeof window === "undefined") return;

  const records = loadPerformanceRecords();
  const next = [record, ...records.filter((item) => item.id !== record.id)].slice(0, 100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function formatPerformanceForPrompt(appName: string) {
  const records = loadPerformanceRecords(appName);
  if (!records.length) return "";

  const high = records.filter((record) => record.rating === "high").slice(0, 5);
  const low = records.filter((record) => record.rating === "low").slice(0, 3);

  const lines = ["Performance feedback from previous posts:"];

  if (high.length) {
    lines.push("- High performers (do more like this):");
    high.forEach((record) => {
      lines.push(
        `  ${record.platform} variant ${record.variantId}: "${record.hook}" (screenshot: ${record.usedScreenshot ? "yes" : "no"})`,
      );
    });
  }

  if (low.length) {
    lines.push("- Low performers (avoid similar patterns):");
    low.forEach((record) => {
      lines.push(`  ${record.platform}: "${record.hook}"`);
    });
  }

  return lines.join("\n");
}

export function createPerformanceRecord(input: {
  appName: string;
  platform: string;
  hook: string;
  rating: PerformanceRating;
  usedScreenshot: boolean;
  variantId: "A" | "B";
  itemId: string;
}): PerformanceRecord {
  return {
    id: input.itemId,
    appName: input.appName,
    platform: input.platform,
    hook: input.hook,
    rating: input.rating,
    usedScreenshot: input.usedScreenshot,
    variantId: input.variantId,
    recordedAt: new Date().toISOString(),
  };
}
