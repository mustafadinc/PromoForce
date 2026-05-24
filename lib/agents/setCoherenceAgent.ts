import type { StrategyBrief } from "@/lib/campaignTypes";
import { storeSlideBeatMeta } from "@/lib/storeSetAsoFramework";

export type SetCoherenceIssue = {
  slideNumber?: number;
  severity: "warning" | "error";
  message: string;
};

export type SetCoherenceAudit = {
  overallScore: number;
  narrativeCohesion: number;
  copyUniqueness: number;
  arcCompleteness: number;
  strengths: string[];
  issues: SetCoherenceIssue[];
  suggestions: string[];
};

function getOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for set coherence audit.");
  }
  return apiKey;
}

function buildFallbackAudit(strategy: StrategyBrief): SetCoherenceAudit {
  const headlines = strategy.slides.map((s) => s.headline.trim().toLowerCase());
  const duplicates = headlines.filter((h, i) => h && headlines.indexOf(h) !== i);
  const issues: SetCoherenceIssue[] = duplicates.length
    ? [{ severity: "warning", message: "Duplicate headlines detected across slides." }]
    : [];

  return {
    overallScore: duplicates.length ? 72 : 85,
    narrativeCohesion: duplicates.length ? 70 : 88,
    copyUniqueness: duplicates.length ? 65 : 90,
    arcCompleteness: strategy.narrativeArc ? 85 : 70,
    strengths: strategy.narrativeArc ? ["Clear narrative arc defined."] : [],
    issues,
    suggestions: issues.length
      ? ["Rewrite duplicate headlines so each slide advances the story."]
      : ["Set looks coherent — generate and review visual cohesion in export."],
  };
}

export async function auditSetCoherence(strategy: StrategyBrief): Promise<SetCoherenceAudit> {
  const apiKey = getOpenAIKey();
  const chatModel = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

  const slideSummary = strategy.slides
    .map((slide) => {
      const beat = storeSlideBeatMeta[slide.asoBeat];
      return [
        `Slide ${slide.slideNumber} (${beat.label}):`,
        `  Headline: ${slide.headline}`,
        `  Subheadline: ${slide.subheadline}`,
        `  Conversion goal: ${slide.conversionGoal || beat.conversionGoal}`,
      ].join("\n");
    })
    .join("\n\n");

  const prompt = [
    "Audit this 5-slide App Store screenshot strategy for narrative coherence.",
    "",
    `Positioning: ${strategy.positioning}`,
    `Primary message: ${strategy.primaryMessage}`,
    `Narrative arc: ${strategy.narrativeArc}`,
    "",
    slideSummary,
    "",
    "Return JSON:",
    "{ overallScore (0-100), narrativeCohesion (0-100), copyUniqueness (0-100), arcCompleteness (0-100), strengths[], issues[{ slideNumber?, severity, message }], suggestions[] }",
    "Score harshly if headlines repeat, beats are out of order, or the story does not flow Hook→Problem→Feature→Proof→CTA.",
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: chatModel,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an ASO conversion strategist. Audit screenshot set briefs for story cohesion, not visual design.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      return buildFallbackAudit(strategy);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = JSON.parse(payload.choices?.[0]?.message?.content || "{}") as Partial<SetCoherenceAudit>;

    return {
      overallScore: typeof raw.overallScore === "number" ? raw.overallScore : 80,
      narrativeCohesion: typeof raw.narrativeCohesion === "number" ? raw.narrativeCohesion : 80,
      copyUniqueness: typeof raw.copyUniqueness === "number" ? raw.copyUniqueness : 80,
      arcCompleteness: typeof raw.arcCompleteness === "number" ? raw.arcCompleteness : 80,
      strengths: Array.isArray(raw.strengths) ? raw.strengths.map(String) : [],
      issues: Array.isArray(raw.issues)
        ? raw.issues.map((issue) => ({
            slideNumber: typeof issue.slideNumber === "number" ? issue.slideNumber : undefined,
            severity: issue.severity === "error" ? "error" : "warning",
            message: String(issue.message || ""),
          }))
        : [],
      suggestions: Array.isArray(raw.suggestions) ? raw.suggestions.map(String) : [],
    };
  } catch {
    return buildFallbackAudit(strategy);
  }
}
