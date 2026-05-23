import type { BrandMemory } from "@/lib/campaignTypes";

const STORAGE_PREFIX = "promoforce-brand-";

export function loadBrandMemory(appName: string): BrandMemory | null {
  if (typeof window === "undefined" || !appName) return null;

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${appName.toLowerCase()}`);
    return raw ? (JSON.parse(raw) as BrandMemory) : null;
  } catch {
    return null;
  }
}

export function saveBrandMemory(memory: BrandMemory) {
  if (typeof window === "undefined" || !memory.appName) return;

  localStorage.setItem(`${STORAGE_PREFIX}${memory.appName.toLowerCase()}`, JSON.stringify(memory));
}

export function formatBrandMemoryForPrompt(memory: BrandMemory | null) {
  if (!memory) return "";

  const lines = [
    "Brand memory from previous campaigns:",
    `- Visual theme: ${memory.visualTheme}`,
    `- Brand voice: ${memory.brandVoice}`,
  ];

  if (memory.recentPosts.length) {
    lines.push("- Recent posts:");
    memory.recentPosts.slice(-8).forEach((post) => {
      lines.push(
        `  Day ${post.day} (${post.platform}): "${post.headline}" / "${post.hook}" / screenshot: ${post.usedScreenshot ? "yes" : "no"}`,
      );
    });
  }

  return lines.join("\n");
}

export function formatSessionBrandMemory(
  entries: Array<{ day: number; platform: string; headline: string; hook: string; usedScreenshot: boolean }>,
) {
  if (!entries.length) return "";

  return [
    "Posts already generated in this calendar (stay visually and tonally consistent):",
    ...entries.map(
      (entry) =>
        `- Day ${entry.day} (${entry.platform}): "${entry.headline}" — ${entry.hook} [screenshot: ${entry.usedScreenshot ? "yes" : "no"}]`,
    ),
  ].join("\n");
}
