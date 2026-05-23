import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { computeCampaignInsights } from "@/lib/insights/computePerformance";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { campaignInsights } from "@/lib/db/schema";

export async function GET(
  _request: Request,
  context: { params: Promise<{ campaignId: string }> },
) {
  try {
    await requireSession();
    const { campaignId } = await context.params;
    const db = getDb();

    const cached = await db
      .select()
      .from(campaignInsights)
      .where(eq(campaignInsights.campaignId, campaignId))
      .orderBy(desc(campaignInsights.computedAt))
      .limit(1);

    if (cached[0]) {
      return NextResponse.json({ insights: cached[0].insights, cached: true });
    }

    const insights = await computeCampaignInsights(campaignId);
    return NextResponse.json({ insights, cached: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load insights" },
      { status: 500 },
    );
  }
}
