import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { socialAccounts } from "@/lib/db/schema";
import { exchangeXCode } from "@/lib/publishers/x";

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
    const x = await exchangeXCode(code);
    const db = getDb();
    const expiresAt = x.expiresIn ? new Date(Date.now() + x.expiresIn * 1000) : null;

    await db.insert(socialAccounts).values({
      workspaceId,
      platform: "twitter",
      handle: x.handle ?? x.userId ?? "x",
      externalAccountId: x.userId,
      accessToken: x.accessToken,
      refreshToken: x.refreshToken,
      tokenExpiresAt: expiresAt,
      metadata: { userId: x.userId },
    });

    return NextResponse.redirect(new URL("/settings?connected=twitter", url.origin));
  } catch (err) {
    const message = err instanceof Error ? err.message : "X OAuth failed";
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(message)}`, url.origin));
  }
}
