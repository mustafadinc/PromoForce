export async function persistCampaignAsset(
  campaignId: string,
  day: number,
  dataUrl: string,
  options?: { kind?: string; sortOrder?: number; mimeType?: string },
): Promise<string | null> {
  try {
    const res = await fetch(`/api/campaigns/${campaignId}/posts/${day}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataUrl,
        kind: options?.kind ?? "image",
        sortOrder: options?.sortOrder ?? 0,
        mimeType: options?.mimeType,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { postId?: string };
    return data.postId ?? null;
  } catch {
    return null;
  }
}

export async function scheduleCampaignPost(
  campaignId: string,
  day: number,
  scheduledAt: string,
): Promise<boolean> {
  try {
    const res = await fetch(`/api/campaigns/${campaignId}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day, scheduledAt }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
