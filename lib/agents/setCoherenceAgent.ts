import type { StrategyBrief } from "@/lib/campaignTypes";
import { lintStrategyNarrative } from "@/lib/narrativeLint";
import { getBeatForSlide, storeSlideBeatMeta } from "@/lib/storeSetAsoFramework";

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
  const narrativeLint = lintStrategyNarrative(strategy);

  const issues: SetCoherenceIssue[] = [
    ...narrativeLint.issues.map((issue) => ({
      slideNumber: issue.slideNumber,
      severity: issue.severity,
      message: issue.message,
    })),
  ];

  if (duplicates.length && !issues.some((i) => i.message.includes("Duplicate headlines"))) {
    issues.push({ severity: "warning", message: "Duplicate headlines detected across slides." });
  }

  for (const slide of strategy.slides) {
    const expected = getBeatForSlide(slide.slideNumber);
    if (slide.asoBeat !== expected) {
      issues.push({
        slideNumber: slide.slideNumber,
        severity: "error",
        message: `Beat out of order: slide ${slide.slideNumber} should be ${expected}.`,
      });
    }
  }

  const hook = strategy.slides.find((s) => s.slideNumber === 1);
  if (hook && /\b(start|download|get started)\b/i.test(hook.headline)) {
    issues.push({
      slideNumber: 1,
      severity: "error",
      message: "Hook slide uses CTA language instead of problem/desire.",
    });
  }

  const scorePenalty = issues.filter((i) => i.severity === "error").length * 8 +
    issues.filter((i) => i.severity === "warning").length * 4;

  return {
    overallScore: Math.max(55, 92 - scorePenalty),
    narrativeCohesion: Math.max(50, 88 - scorePenalty),
    copyUniqueness: duplicates.length ? 65 : 90,
    arcCompleteness: strategy.narrativeArc ? 85 : 70,
    strengths: strategy.narrativeArc ? ["Clear narrative arc defined."] : [],
    issues,
    suggestions: issues.length
      ? ["Fix narrative issues before generating — especially hook→problem→CTA flow."]
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
        `Slide ${slide.slideNumber} (beat: ${slide.asoBeat}, ${beat.label}):`,
        `  Headline: ${slide.headline}`,
        `  Subheadline: ${slide.subheadline}`,
        `  keywordTheme: ${slide.keywordTheme || "(none)"}`,
        `  Conversion goal: ${slide.conversionGoal || beat.conversionGoal}`,
      ].join("\n");
    })
    .join("\n\n");

  const slide1 = strategy.slides.find((s) => s.slideNumber === 1);
  const slide2 = strategy.slides.find((s) => s.slideNumber === 2);
  const slide5 = strategy.slides.find((s) => s.slideNumber === 5);

  const prompt = [
    "Audit this 5-slide App Store screenshot strategy for narrative coherence and conversion flow.",
    "",
    `Positioning: ${strategy.positioning}`,
    `Primary message: ${strategy.primaryMessage}`,
    `Narrative arc: ${strategy.narrativeArc}`,
    strategy.locale ? `Target locale: ${strategy.locale}` : "",
    "",
    slideSummary,
    "",
    "Cross-slide checks:",
    `- Slide 1 hook "${slide1?.headline || ""}" must connect to slide 2 "${slide2?.headline || ""}" (pain → relief).`,
    `- Slide 5 CTA "${slide5?.headline || ""}" must recap benefits and align with primary message.`,
    "",
    "Return JSON:",
    "{ overallScore (0-100), narrativeCohesion (0-100), copyUniqueness (0-100), arcCompleteness (0-100), strengths[], issues[{ slideNumber?, severity, message }], suggestions[] }",
    "Score harshly if headlines repeat, beats are wrong, hook is a CTA, slide 1-2 don't connect, or slide 5 doesn't recap.",
  ]
    .filter(Boolean)
    .join("\n");

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

    const aiIssues = Array.isArray(raw.issues)
      ? raw.issues.map((issue) => ({
          slideNumber: typeof issue.slideNumber === "number" ? issue.slideNumber : undefined,
          severity: issue.severity === "error" ? ("error" as const) : ("warning" as const),
          message: String(issue.message || ""),
        }))
      : [];

    const localLint = lintStrategyNarrative(strategy);
    const mergedIssues = [
      ...localLint.issues.map((i) => ({
        slideNumber: i.slideNumber,
        severity: i.severity,
        message: i.message,
      })),
      ...aiIssues.filter((ai) => !localLint.issues.some((l) => l.message === ai.message)),
    ];

    return {
      overallScore: typeof raw.overallScore === "number" ? raw.overallScore : 80,
      narrativeCohesion: typeof raw.narrativeCohesion === "number" ? raw.narrativeCohesion : 80,
      copyUniqueness: typeof raw.copyUniqueness === "number" ? raw.copyUniqueness : 80,
      arcCompleteness: typeof raw.arcCompleteness === "number" ? raw.arcCompleteness : 80,
      strengths: Array.isArray(raw.strengths) ? raw.strengths.map(String) : [],
      issues: mergedIssues,
      suggestions: Array.isArray(raw.suggestions) ? raw.suggestions.map(String) : [],
    };
  } catch {
    return buildFallbackAudit(strategy);
  }
}

export async function auditSetCoherenceClient(strategy: StrategyBrief): Promise<SetCoherenceAudit> {
  const response = await fetch("/api/strategy/audit-set", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ strategy }),
  });
  const payload = (await response.json()) as { audit?: SetCoherenceAudit; error?: string };
  if (!response.ok || !payload.audit) {
    throw new Error(payload.error || "Set audit failed.");
  }
  return payload.audit;
}
