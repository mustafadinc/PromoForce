"use client";

import { Sparkles } from "lucide-react";
import { UploadedScreenMockupRow } from "@/components/UploadedScreenMockupRow";
import type { AppProfile, CampaignType, UploadedScreenshot } from "@/lib/campaignTypes";
import { campaignTypeOptions } from "@/lib/campaignTypes";

export type SetupDraft = {
  campaignType: CampaignType;
  profile: AppProfile;
  screenshots: UploadedScreenshot[];
  autopilotConfig?: { duration: 7 | 30; startDate: string };
};

type SetupPreviewPanelProps = {
  draft: SetupDraft | null;
  isPlanning?: boolean;
};

const workflowSteps = [
  { title: "Setup", detail: "App info & screenshots" },
  { title: "Strategy", detail: "AI drafts the plan — you edit" },
  { title: "Generate", detail: "Create assets & export" },
];

function readinessChecks(draft: SetupDraft) {
  return [
    { label: "App name", done: Boolean(draft.profile.appName.trim()) },
    { label: "Category", done: Boolean(draft.profile.category.trim()) },
    { label: "Description", done: Boolean(draft.profile.description.trim()) },
    { label: "Screenshots", done: draft.screenshots.length > 0 },
  ];
}

function SetupReadinessBar({
  checks,
  allReady,
}: {
  checks: ReturnType<typeof readinessChecks>;
  allReady: boolean;
}) {
  return (
    <header className="pf-setup-preview-toolbar">
      <ul className="pf-setup-preview-checklist pf-setup-preview-checklist-inline">
        {checks.map((check) => (
          <li key={check.label} className={check.done ? "is-done" : ""}>
            <span className="pf-setup-check-dot" aria-hidden="true" />
            {check.label}
          </li>
        ))}
      </ul>
      {allReady ? (
        <span className="pf-setup-ready-hint">Ready — generate strategy on the left</span>
      ) : (
        <span className="pf-setup-ready-hint pf-setup-ready-hint-muted">Complete the form on the left</span>
      )}
    </header>
  );
}

export function SetupPreviewPanel({ draft, isPlanning }: SetupPreviewPanelProps) {
  if (!draft) {
    return null;
  }

  const campaignMeta = campaignTypeOptions.find((option) => option.value === draft.campaignType);
  const checks = readinessChecks(draft);
  const readyCount = checks.filter((check) => check.done).length;
  const allReady = readyCount === checks.length;
  const hasScreens = draft.screenshots.length > 0;

  return (
    <section className="pf-setup-preview">
      <SetupReadinessBar checks={checks} allReady={allReady} />

      {isPlanning ? (
        <div className="pf-setup-preview-main pf-setup-preview-main-solo">
          <div className="pf-setup-preview-planning">
            <Sparkles className="pf-setup-preview-planning-icon" aria-hidden="true" />
            <p>AI is building your campaign strategy…</p>
          </div>
        </div>
      ) : hasScreens ? (
        <>
          <div className="pf-setup-preview-header pf-setup-preview-header-compact">
            <div>
              <h2 className="pf-setup-preview-title">Uploaded screens</h2>
              <p className="pf-setup-preview-subtitle">
                {draft.screenshots.length} screen{draft.screenshots.length === 1 ? "" : "s"} — check each
                mockup before generating strategy.
              </p>
            </div>
          </div>
          <div className="pf-setup-preview-main pf-setup-preview-main-gallery">
            <UploadedScreenMockupRow screenshots={draft.screenshots} />
          </div>
        </>
      ) : (
        <div className="pf-setup-preview-main pf-setup-preview-main-solo">
          <div className="pf-setup-next-steps">
            <span className="pf-setup-preview-eyebrow">{campaignMeta?.label}</span>
            <h2 className="pf-setup-preview-title">Next: generate your strategy</h2>
            <p className="pf-setup-next-steps-lead">
              Nothing is created yet. Fill in the form, then click{" "}
              <strong>Generate Campaign Strategy</strong> — AI will draft a plan you can edit before
              any images are made.
            </p>
            <ol className="pf-setup-workflow-steps">
              {workflowSteps.map((step, index) => (
                <li key={step.title} className={index === 0 ? "is-current" : ""}>
                  <span className="pf-setup-workflow-num">{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <span>{step.detail}</span>
                  </div>
                </li>
              ))}
            </ol>
            <p className="pf-setup-next-steps-note">{campaignMeta?.description}</p>
          </div>
        </div>
      )}
    </section>
  );
}
