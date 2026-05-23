import { NextResponse } from "next/server";
import { requireSession, requireWorkspace } from "@/lib/auth-server";
import { createApp, upsertBrandMemory } from "@/lib/db/services/workspaceService";
import type { AppProfile, BrandMemory } from "@/lib/campaignTypes";

type LocalMigrationPayload = {
  apps?: Array<{ profile: AppProfile; brandMemory?: BrandMemory | null }>;
  performance?: Array<{ appName: string; records: unknown[] }>;
};

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const workspace = await requireWorkspace(user.id);
    const body = (await request.json()) as LocalMigrationPayload;
    const created = [];

    for (const item of body.apps ?? []) {
      const app = await createApp(workspace.id, item.profile);
      if (item.brandMemory) {
        await upsertBrandMemory(app.id, item.brandMemory);
      }
      created.push(app);
    }

    return NextResponse.json({ migrated: created.length, apps: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Migration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
