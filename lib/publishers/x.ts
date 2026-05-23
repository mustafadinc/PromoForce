import type { PublishPayload, PublishResult } from "@/lib/publishers/types";

export function getXOAuthUrl(state: string) {
  const clientId = process.env.X_CLIENT_ID;
  const redirectUri = process.env.X_REDIRECT_URI;
  if (!clientId || !redirectUri) throw new Error("X OAuth not configured");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: "challenge",
    code_challenge_method: "plain",
  });

  return `https://twitter.com/i/oauth2/authorize?${params}`;
}

export async function exchangeXCode(code: string) {
  const clientId = process.env.X_CLIENT_ID!;
  const clientSecret = process.env.X_CLIENT_SECRET!;
  const redirectUri = process.env.X_REDIRECT_URI!;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: "challenge",
    }),
  });

  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const meRes = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const me = meRes.ok ? ((await meRes.json()) as { data?: { username?: string; id?: string } }) : null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    handle: me?.data?.username,
    userId: me?.data?.id,
  };
}

export async function publishToX(
  accessToken: string,
  payload: PublishPayload,
): Promise<PublishResult> {
  const text = buildTweetText(payload);
  let mediaIds: string[] = [];

  if (payload.mediaBuffers?.length) {
    for (const buffer of payload.mediaBuffers.slice(0, 4)) {
      const mediaId = await uploadXMedia(accessToken, buffer);
      mediaIds.push(mediaId);
    }
  }

  const body: Record<string, unknown> = { text };
  if (mediaIds.length) {
    body.media = { media_ids: mediaIds };
  }

  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(await res.text());
  const result = (await res.json()) as { data: { id: string } };
  return {
    externalPostId: result.data.id,
    platform: "twitter",
    permalink: `https://twitter.com/i/web/status/${result.data.id}`,
  };
}

function buildTweetText(payload: PublishPayload) {
  const tags = payload.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
  const combined = [payload.caption, tags].filter(Boolean).join(" ");
  return combined.slice(0, 280);
}

async function uploadXMedia(accessToken: string, buffer: Buffer): Promise<string> {
  const initRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      command: "INIT",
      total_bytes: String(buffer.length),
      media_type: "image/png",
    }),
  });
  if (!initRes.ok) throw new Error(await initRes.text());
  const init = (await initRes.json()) as { media_id_string: string };

  await fetch("https://upload.twitter.com/1.1/media/upload.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      command: "APPEND",
      media_id: init.media_id_string,
      segment_index: "0",
      media_data: buffer.toString("base64"),
    }),
  });

  await fetch("https://upload.twitter.com/1.1/media/upload.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      command: "FINALIZE",
      media_id: init.media_id_string,
    }),
  });

  return init.media_id_string;
}
