import { NextResponse } from "next/server";
import { auditSetCoherence } from "@/lib/agents/setCoherenceAgent";
import type { StrategyBrief } from "@/lib/campaignTypes";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { strategy?: StrategyBrief };
    if (!body.strategy?.slides?.length) {
      return NextResponse.json({ error: "strategy with slides is required." }, { status: 400 });
    }

    const audit = await auditSetCoherence(body.strategy);
    return NextResponse.json({ audit });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Set audit failed." },
      { status: 500 },
    );
  }
}
