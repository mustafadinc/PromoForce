import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { apps, brandMemories, performanceRecords, workspaces } from "@/lib/db/schema";
import type { AppProfile, BrandMemory, PerformanceRecord } from "@/lib/campaignTypes";

export async function listWorkspacesForUser(userId: string) {
  const db = getDb();
  return db.select().from(workspaces).where(eq(workspaces.ownerId, userId));
}

export async function listAppsForWorkspace(workspaceId: string) {
  const db = getDb();
  return db.select().from(apps).where(eq(apps.workspaceId, workspaceId));
}

export async function createApp(workspaceId: string, profile: AppProfile) {
  const db = getDb();
  const [app] = await db
    .insert(apps)
    .values({ workspaceId, profile, screenshotsMeta: [] })
    .returning();
  return app;
}

export async function getBrandMemoryForApp(appId: string) {
  const db = getDb();
  const rows = await db.select().from(brandMemories).where(eq(brandMemories.appId, appId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertBrandMemory(appId: string, memory: BrandMemory) {
  const db = getDb();
  const existing = await getBrandMemoryForApp(appId);
  const values = {
    appId,
    visualTheme: memory.visualTheme,
    brandVoice: memory.brandVoice,
    recentPosts: memory.recentPosts,
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(brandMemories).set(values).where(eq(brandMemories.appId, appId));
  } else {
    await db.insert(brandMemories).values(values);
  }
}

export async function savePerformanceRecordDb(
  appId: string,
  record: PerformanceRecord & { format?: string; hashtags?: string[] },
) {
  const db = getDb();
  await db.insert(performanceRecords).values({
    appId,
    platform: record.platform,
    hook: record.hook,
    rating: record.rating,
    usedScreenshot: record.usedScreenshot,
    variantId: record.variantId,
    hashtags: record.hashtags ?? [],
    format: record.format,
  });
}

export async function loadPerformanceRecordsDb(appId: string) {
  const db = getDb();
  return db.select().from(performanceRecords).where(eq(performanceRecords.appId, appId));
}
