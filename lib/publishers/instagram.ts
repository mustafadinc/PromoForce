import type { PublishPayload, PublishResult } from "@/lib/publishers/types";

type InstagramAccountMeta = {
  igUserId: string;
  pageAccessToken: string;
};

export async function publishToInstagram(
  account: InstagramAccountMeta,
  payload: PublishPayload,
  format: "single" | "carousel" | "story" | "reels",
): Promise<PublishResult> {
  const token = account.pageAccessToken;
  const igUserId = account.igUserId;

  if (format === "carousel" && payload.mediaUrls.length > 1) {
    const children: string[] = [];
    for (const url of payload.mediaUrls) {
      const container = await createMediaContainer(igUserId, token, url, false);
      children.push(container.id);
    }
    const carousel = await graphPost(igUserId, "media", token, {
      media_type: "CAROUSEL",
      children: children.join(","),
      caption: buildCaption(payload),
    });
    const published = await publishContainer(igUserId, token, carousel.id);
    return { externalPostId: published.id, platform: "instagram" };
  }

  const isVideo =
    format === "reels" || Boolean(payload.mimeTypes?.[0]?.startsWith("video/"));
  const mediaUrl = payload.mediaUrls[0];
  if (!mediaUrl) throw new Error("Instagram publish requires media URL");

  const container = await createMediaContainer(
    igUserId,
    token,
    mediaUrl,
    isVideo,
    format === "story",
  );
  const published = await publishContainer(igUserId, token, container.id);
  return { externalPostId: published.id, platform: "instagram" };
}

function buildCaption(payload: PublishPayload) {
  const tags = payload.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
  return [payload.caption, tags].filter(Boolean).join("\n\n");
}

async function graphPost(
  igUserId: string,
  edge: string,
  token: string,
  params: Record<string, string>,
) {
  const body = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/${edge}`, {
    method: "POST",
    body,
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { id: string };
}

async function createMediaContainer(
  igUserId: string,
  token: string,
  mediaUrl: string,
  isVideo: boolean,
  isStory = false,
) {
  const params: Record<string, string> = {
    access_token: token,
  };
  if (isVideo) {
    params.media_type = isStory ? "STORIES" : "REELS";
    params.video_url = mediaUrl;
  } else {
    params.image_url = mediaUrl;
    if (isStory) params.media_type = "STORIES";
  }
  const res = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
    method: "POST",
    body: new URLSearchParams(params),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { id: string };
}

async function publishContainer(igUserId: string, token: string, creationId: string) {
  return graphPost(igUserId, "media_publish", token, { creation_id: creationId });
}

export function getMetaOAuthUrl(state: string) {
  const clientId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;
  if (!clientId || !redirectUri) throw new Error("Meta OAuth not configured");

  const scopes = [
    "instagram_basic",
    "instagram_content_publish",
    "pages_show_list",
    "pages_read_engagement",
  ].join(",");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: "code",
    state,
  });

  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}

export async function exchangeMetaCode(code: string) {
  const clientId = process.env.META_APP_ID!;
  const clientSecret = process.env.META_APP_SECRET!;
  const redirectUri = process.env.META_REDIRECT_URI!;

  const tokenRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    })}`,
  );
  if (!tokenRes.ok) throw new Error(await tokenRes.text());
  const tokenData = (await tokenRes.json()) as { access_token: string };

  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${tokenData.access_token}`,
  );
  if (!pagesRes.ok) throw new Error(await pagesRes.text());
  const pages = (await pagesRes.json()) as { data: Array<{ id: string; access_token: string }> };
  const page = pages.data[0];
  if (!page) throw new Error("No Facebook Page connected. Link a Page to your Instagram Business account.");

  const igRes = await fetch(
    `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
  );
  if (!igRes.ok) throw new Error(await igRes.text());
  const igData = (await igRes.json()) as { instagram_business_account?: { id: string } };
  const igUserId = igData.instagram_business_account?.id;
  if (!igUserId) throw new Error("No Instagram Business account linked to this Page.");

  return {
    pageAccessToken: page.access_token,
    igUserId,
    pageId: page.id,
  };
}
