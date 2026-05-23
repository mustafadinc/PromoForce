import { NextResponse } from "next/server";
import { requireSession, requireWorkspace } from "@/lib/auth-server";
import { getXOAuthUrl } from "@/lib/publishers/x";

export async function GET() {
  try {
    const user = await requireSession();
    const workspace = await requireWorkspace(user.id);
    const state = Buffer.from(JSON.stringify({ workspaceId: workspace.id })).toString("base64url");
    const url = getXOAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OAuth failed" },
      { status: 500 },
    );
  }
}
