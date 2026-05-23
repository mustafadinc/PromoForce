import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { socialAccounts } from "@/lib/db/schema";

export async function refreshXTokenIfNeeded(accountId: string): Promise<string | null> {
  const db = getDb();
  const [account] = await db.select().from(socialAccounts).where(eq(socialAccounts.id, accountId)).limit(1);
  if (!account?.refreshToken) return account?.accessToken ?? null;

  const expiresAt = account.tokenExpiresAt ? new Date(account.tokenExpiresAt).getTime() : 0;
  if (expiresAt > Date.now() + 60_000) {
    return account.accessToken;
  }

  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  if (!clientId || !clientSecret) return account.accessToken;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: account.refreshToken,
    client_id: clientId,
  });

  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body,
  });

  if (!res.ok) return account.accessToken;

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  await db
    .update(socialAccounts)
    .set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? account.refreshToken,
      tokenExpiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : account.tokenExpiresAt,
    })
    .where(eq(socialAccounts.id, accountId));

  return data.access_token;
}
