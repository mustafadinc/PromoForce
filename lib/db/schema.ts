import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<AdapterAccount["type"]>().notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [uniqueIndex("verification_tokens_identifier_token").on(table.identifier, table.token)],
);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  plan: varchar("plan", { length: 20 }).default("free").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const apps = pgTable("apps", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  profile: jsonb("profile").notNull(),
  screenshotsMeta: jsonb("screenshots_meta").default([]),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const brandMemories = pgTable("brand_memories", {
  id: uuid("id").primaryKey().defaultRandom(),
  appId: uuid("app_id")
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" })
    .unique(),
  visualTheme: text("visual_theme").notNull(),
  brandVoice: text("brand_voice").notNull(),
  palette: jsonb("palette"),
  toneOfVoice: jsonb("tone_of_voice"),
  visualMood: jsonb("visual_mood"),
  recentPosts: jsonb("recent_posts").default([]),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const socialAccounts = pgTable("social_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 32 }).notNull(),
  handle: varchar("handle", { length: 120 }),
  externalAccountId: text("external_account_id"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at", { mode: "date" }),
  metadata: jsonb("metadata"),
  connectedAt: timestamp("connected_at", { mode: "date" }).defaultNow().notNull(),
});

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  appId: uuid("app_id")
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 32 }).notNull(),
  duration: integer("duration"),
  startDate: varchar("start_date", { length: 10 }),
  strategy: jsonb("strategy").notNull(),
  status: varchar("status", { length: 24 }).default("draft").notNull(),
  phases: jsonb("phases"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  day: integer("day").notNull(),
  phaseId: varchar("phase_id", { length: 64 }),
  platform: varchar("platform", { length: 32 }).notNull(),
  format: varchar("format", { length: 24 }).default("single").notNull(),
  role: varchar("role", { length: 32 }).notNull(),
  visualTemplate: varchar("visual_template", { length: 48 }),
  videoTemplate: varchar("video_template", { length: 48 }),
  copy: jsonb("copy").notNull(),
  plan: jsonb("plan").notNull(),
  scheduledAt: timestamp("scheduled_at", { mode: "date" }),
  status: varchar("status", { length: 24 }).default("pending").notNull(),
  socialAccountId: uuid("social_account_id").references(() => socialAccounts.id),
  externalPostId: text("external_post_id"),
  publishedAt: timestamp("published_at", { mode: "date" }),
  publishError: text("publish_error"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const postAssets = pgTable("post_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 16 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  r2Key: text("r2_key").notNull(),
  mimeType: varchar("mime_type", { length: 64 }).default("image/png").notNull(),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const postStats = pgTable("post_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  recordedAt: timestamp("recorded_at", { mode: "date" }).defaultNow().notNull(),
  metrics: jsonb("metrics").notNull(),
});

export const performanceRecords = pgTable("performance_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  appId: uuid("app_id")
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" }),
  postId: uuid("post_id").references(() => posts.id, { onDelete: "set null" }),
  platform: varchar("platform", { length: 32 }).notNull(),
  hook: text("hook"),
  rating: varchar("rating", { length: 16 }).notNull(),
  usedScreenshot: boolean("used_screenshot").default(false),
  variantId: varchar("variant_id", { length: 4 }),
  hashtags: jsonb("hashtags"),
  format: varchar("format", { length: 24 }),
  recordedAt: timestamp("recorded_at", { mode: "date" }).defaultNow().notNull(),
});

export const campaignInsights = pgTable("campaign_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  computedAt: timestamp("computed_at", { mode: "date" }).defaultNow().notNull(),
  insights: jsonb("insights").notNull(),
});

export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type App = typeof apps.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type PostAsset = typeof postAssets.$inferSelect;
export type SocialAccount = typeof socialAccounts.$inferSelect;
