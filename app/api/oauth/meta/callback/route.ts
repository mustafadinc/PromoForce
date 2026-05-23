import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { socialAccounts } from "@/lib/db/schema";
import { exchangeMetaCode } from "@/lib/publishers/instagram";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(error || "oauth_denied")}`, url.origin));
  }

  try {
    const { workspaceId } = JSON.parse(Buffer.from(state, "base64url").toString()) as { workspaceId: string };
    const meta = await exchangeMetaCode(code);
    const db = getDb();

    await db.insert(socialAccounts).values({
      workspaceId,
      platform: "instagram",
      handle: meta.igUserId,
      externalAccountId: meta.igUserId,
      accessToken: meta.pageAccessToken,
      metadata: { pageId: meta.pageId, igUserId: meta.igUserId },
    });

    return NextResponse.redirect(new URL("/settings?connected=instagram", url.origin));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Meta OAuth failed";
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(message)}`, url.origin));
  }
}
