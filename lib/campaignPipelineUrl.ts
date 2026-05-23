import type { CampaignType } from "@/lib/campaignTypes";

export type PipelinePhase = "setup" | "strategy" | "export";

export type CampaignStep = "setup" | "strategy" | "gallery";

export function stepToPhase(step: CampaignStep): PipelinePhase {
  return step === "gallery" ? "export" : step;
}

export function phaseToStep(phase: PipelinePhase): CampaignStep {
  return phase === "export" ? "gallery" : phase;
}

export function readPhaseFromLocation(search: string): PipelinePhase | null {
  const phase = new URLSearchParams(search).get("phase");
  if (phase === "setup" || phase === "strategy" || phase === "export") return phase;
  return null;
}

export function readCampaignTypeFromLocation(search: string): CampaignType | null {
  const raw = new URLSearchParams(search).get("campaign");
  if (raw === "app_store" || raw === "social_launch" || raw === "marketing_autopilot") {
    return raw;
  }
  return null;
}

export function buildCampaignPipelineUrl(phase: PipelinePhase, campaignType?: CampaignType): string {
  const params = new URLSearchParams();
  if (phase !== "setup") params.set("phase", phase);
  if (campaignType) params.set("campaign", campaignType);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export function replaceCampaignPipelineUrl(phase: PipelinePhase, campaignType?: CampaignType) {
  if (typeof window === "undefined") return;
  const next = buildCampaignPipelineUrl(phase, campaignType);
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === next) return;
  window.history.replaceState(window.history.state, "", next);
}
