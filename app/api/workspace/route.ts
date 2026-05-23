import { NextResponse } from "next/server";
import { requireSession, requireWorkspace } from "@/lib/auth-server";
import { listAppsForWorkspace, listWorkspacesForUser } from "@/lib/db/services/workspaceService";

export async function GET() {
  try {
    const user = await requireSession();
    const workspaces = await listWorkspacesForUser(user.id);
    const workspace = workspaces[0];
    if (!workspace) {
      return NextResponse.json({ workspace: null, apps: [] });
    }
    const apps = await listAppsForWorkspace(workspace.id);
    return NextResponse.json({ workspace, apps });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load workspace";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const workspace = await requireWorkspace(user.id);
    const body = await request.json();
    const { createApp } = await import("@/lib/db/services/workspaceService");
    const app = await createApp(workspace.id, body.profile);
    return NextResponse.json({ app });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create app";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}
