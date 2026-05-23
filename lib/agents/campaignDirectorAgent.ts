import type { AppProfile, CalendarDuration, CampaignPhase } from "@/lib/campaignTypes";

export type DirectorPlan = {
  positioning: string;
  primaryMessage: string;
  targetAudience: string;
  visualTheme: string;
  brandVoice: string;
  contentPillars: string[];
  phases: CampaignPhase[];
};

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY required");
  return key;
}

export async function runCampaignDirectorAgent(
  profile: AppProfile,
  duration: CalendarDuration,
  performanceContext: string,
  brandMemoryContext: string,
): Promise<DirectorPlan> {
  const chatModel = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAIKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: chatModel,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a senior mobile app marketing director. Design a dynamic social campaign arc — NOT a fixed template. Choose 3-6 phases based on what this app needs. Return JSON only.",
        },
        {
          role: "user",
          content: [
            `App: ${profile.appName} | ${profile.category}`,
            `Description: ${profile.description}`,
            `Audience: ${profile.targetAudience || "mobile users"}`,
            `Calendar duration: ${duration} days`,
            brandMemoryContext,
            performanceContext,
            "",
            "Return JSON: positioning, primaryMessage, targetAudience, visualTheme, brandVoice, contentPillars (array), phases (array).",
            "Each phase: id (snake_case), name, goal, dayStart, dayEnd, narrativeFocus.",
            "Phases must cover days 1-" + duration + " with no gaps. Phase count and lengths should fit THIS app (launch app vs mature app vs tool vs game).",
            "Examples: pre_launch_tease, launch_week, education, social_proof, retention_cta — but invent what fits.",
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const result = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("Director agent returned empty");

  const raw = JSON.parse(content) as Partial<DirectorPlan>;
  return normalizeDirectorPlan(raw, profile, duration);
}

function normalizeDirectorPlan(
  raw: Partial<DirectorPlan>,
  profile: AppProfile,
  duration: CalendarDuration,
): DirectorPlan {
  const fallbackPhases: CampaignPhase[] =
    duration === 7
      ? [
          { id: "launch", name: "Launch", goal: "Announce", dayStart: 1, dayEnd: 3, narrativeFocus: "Hero + problem/solution" },
          { id: "value", name: "Value", goal: "Educate", dayStart: 4, dayEnd: 5, narrativeFocus: "Features + tips" },
          { id: "cta", name: "CTA", goal: "Convert", dayStart: 6, dayEnd: 7, narrativeFocus: "Download push" },
        ]
      : [
          { id: "tease", name: "Pre-launch", goal: "Build curiosity", dayStart: 1, dayEnd: 5, narrativeFocus: "Tease + founder story" },
          { id: "launch", name: "Launch week", goal: "Downloads", dayStart: 6, dayEnd: 12, narrativeFocus: "Hero demos + proof" },
          { id: "education", name: "Education", goal: "Retention", dayStart: 13, dayEnd: 22, narrativeFocus: "Tips + use cases" },
          { id: "community", name: "Community", goal: "Engage", dayStart: 23, dayEnd: 30, narrativeFocus: "UGC + CTA" },
        ];

  const phases =
    Array.isArray(raw.phases) && raw.phases.length
      ? raw.phases.map((p, i) => ({
          id: String(p.id || `phase_${i + 1}`).trim(),
          name: String(p.name || `Phase ${i + 1}`).trim(),
          goal: String(p.goal || "").trim(),
          dayStart: typeof p.dayStart === "number" ? p.dayStart : 1,
          dayEnd: typeof p.dayEnd === "number" ? p.dayEnd : duration,
          narrativeFocus: String(p.narrativeFocus || "").trim(),
        }))
      : fallbackPhases;

  return {
    positioning: String(raw.positioning || `${profile.appName} — ${profile.description}`).trim(),
    primaryMessage: String(raw.primaryMessage || profile.description).trim(),
    targetAudience: String(raw.targetAudience || profile.targetAudience || "Mobile app users").trim(),
    visualTheme: String(raw.visualTheme || "Premium dark cinematic with brand accent glow").trim(),
    brandVoice: String(raw.brandVoice || "Confident, friendly, founder-led").trim(),
    contentPillars: Array.isArray(raw.contentPillars)
      ? raw.contentPillars.map((p) => String(p).trim()).filter(Boolean).slice(0, 6)
      : ["Product value", "Feature education", "Community", "Launch momentum"],
    phases,
  };
}
