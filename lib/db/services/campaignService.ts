import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { buildAssetKey, uploadDataUrlToR2 } from "@/lib/storage/r2";
import { campaigns, postAssets, posts } from "@/lib/db/schema";
import type { AutopilotStrategyBrief, CalendarPostPlan } from "@/lib/campaignTypes";

export async function createCampaign(
  appId: string,
  type: string,
  strategy: AutopilotStrategyBrief,
) {
  const db = getDb();
  const [campaign] = await db
    .insert(campaigns)
    .values({
      appId,
      type,
      duration: strategy.duration,
      startDate: strategy.startDate,
      strategy,
      phases: (strategy as AutopilotStrategyBrief & { phases?: unknown }).phases ?? null,
      status: "active",
    })
    .returning();

  if (!campaign) throw new Error("Failed to create campaign");

  const postRows = strategy.posts.map((post) => calendarPostToDbRow(campaign.id, post));
  const insertedPosts = postRows.length ? await db.insert(posts).values(postRows).returning() : [];

  const postIdsByDay = Object.fromEntries(insertedPosts.map((p) => [p.day, p.id]));

  return { campaign, postIdsByDay };
}

function calendarPostToDbRow(campaignId: string, post: CalendarPostPlan & { phaseId?: string; format?: string; visualTemplate?: string; videoTemplate?: string }) {
  const format = post.format ?? "single";
  return {
    campaignId,
    day: post.day,
    phaseId: post.phaseId ?? null,
    platform: post.platform,
    format,
    role: post.role,
    visualTemplate: post.visualTemplate ?? null,
    videoTemplate: post.videoTemplate ?? null,
    copy: {
      hook: post.hook,
      caption: post.caption,
      hashtags: post.hashtags,
      copyVariants: post.copyVariants,
      selectedVariantId: post.selectedVariantId,
    },
    plan: post,
    scheduledAt: post.scheduledAt ? new Date(post.scheduledAt) : null,
    status: "pending",
  };
}

export async function getCampaignWithPosts(campaignId: string) {
  const db = getDb();
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  if (!campaign) return null;
  const campaignPosts = await db.select().from(posts).where(eq(posts.campaignId, campaignId));
  return { campaign, posts: campaignPosts };
}

export async function updatePostStatus(
  postId: string,
  status: string,
  extra?: { externalPostId?: string; publishedAt?: Date; publishError?: string },
) {
  const db = getDb();
  await db
    .update(posts)
    .set({
      status,
      externalPostId: extra?.externalPostId,
      publishedAt: extra?.publishedAt,
      publishError: extra?.publishError,
    })
    .where(eq(posts.id, postId));
}

export async function attachPostAsset(
  postId: string,
  asset: { kind: string; sortOrder: number; r2Key: string; mimeType: string; width?: number; height?: number },
) {
  const db = getDb();
  const [row] = await db.insert(postAssets).values({ postId, ...asset }).returning();
  return row;
}

export async function getPostsDueForPublish(before: Date) {
  const db = getDb();
  const all = await db.select().from(posts);
  return all.filter(
    (p) =>
      (p.status === "scheduled" || p.status === "pending") &&
      p.scheduledAt &&
      new Date(p.scheduledAt) <= before &&
      !p.externalPostId,
  );
}

export async function schedulePost(postId: string, scheduledAt: Date) {
  const db = getDb();
  await db
    .update(posts)
    .set({ scheduledAt, status: "scheduled" })
    .where(eq(posts.id, postId));
}

export async function getPostForCampaignDay(campaignId: string, day: number) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.campaignId, campaignId), eq(posts.day, day)))
    .limit(1);
  return row ?? null;
}

export async function listPostIdsByDay(campaignId: string) {
  const db = getDb();
  const rows = await db.select({ id: posts.id, day: posts.day }).from(posts).where(eq(posts.campaignId, campaignId));
  return Object.fromEntries(rows.map((r) => [r.day, r.id]));
}

export async function persistPostAssetFromDataUrl(
  workspaceId: string,
  postId: string,
  dataUrl: string,
  asset: {
    kind: string;
    sortOrder: number;
    mimeType?: string;
    width?: number;
    height?: number;
    filename?: string;
  },
) {
  const ext = asset.mimeType?.includes("video") ? "mp4" : "png";
  const key = buildAssetKey(workspaceId, postId, asset.filename ?? `asset-${asset.sortOrder}.${ext}`);
  await uploadDataUrlToR2(key, dataUrl);
  return attachPostAsset(postId, {
    kind: asset.kind,
    sortOrder: asset.sortOrder,
    r2Key: key,
    mimeType: asset.mimeType ?? (ext === "mp4" ? "video/mp4" : "image/png"),
    width: asset.width,
    height: asset.height,
  });
}
