"use client";

import { Sparkles } from "lucide-react";
import { UploadedScreenMockupRow } from "@/components/UploadedScreenMockupRow";
import type { AppProfile, CampaignType, LocaleCode, LocaleScreenshotsMap, UploadedScreenshot } from "@/lib/campaignTypes";
import { campaignTypeOptions } from "@/lib/campaignTypes";
import { getLocaleDefinition } from "@/lib/locales";

export type SetupDraft = {
  campaignType: CampaignType;
  profile: AppProfile;
  screenshots: UploadedScreenshot[];
  screenshotsByLocale?: LocaleScreenshotsMap;
  selectedLocales?: LocaleCode[];
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
  const base = [
    { label: "App name", done: Boolean(draft.profile.appName.trim()) },
    { label: "Category", done: Boolean(draft.profile.category.trim()) },
    { label: "Description", done: Boolean(draft.profile.description.trim()) },
  ];

  if (draft.campaignType === "app_store" && draft.selectedLocales?.length) {
    return [
      ...base,
      ...draft.selectedLocales.map((locale) => ({
        label: `Screenshots (${getLocaleDefinition(locale).label})`,
        done: (draft.screenshotsByLocale?.[locale]?.length ?? 0) > 0,
      })),
    ];
  }

  return [...base, { label: "Screenshots", done: draft.screenshots.length > 0 }];
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
  const isAppStore = draft.campaignType === "app_store";
  const localeEntries =
    isAppStore && draft.selectedLocales?.length
      ? draft.selectedLocales
          .map((locale) => ({
            locale,
            shots: draft.screenshotsByLocale?.[locale] ?? [],
          }))
          .filter((entry) => entry.shots.length > 0)
      : [];
  const hasScreens = isAppStore ? localeEntries.length > 0 : draft.screenshots.length > 0;
  const totalScreens = isAppStore
    ? localeEntries.reduce((sum, entry) => sum + entry.shots.length, 0)
    : draft.screenshots.length;

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
                {totalScreens} screen{totalScreens === 1 ? "" : "s"}
                {isAppStore && localeEntries.length > 1
                  ? ` across ${localeEntries.length} languages`
                  : ""}{" "}
                — check each mockup before generating strategy.
              </p>
            </div>
          </div>
          <div className="pf-setup-preview-main pf-setup-preview-main-gallery">
            {isAppStore ? (
              localeEntries.map(({ locale, shots }) => (
                <div key={locale} className="pf-setup-locale-preview">
                  <h3 className="pf-setup-locale-preview-title">
                    {getLocaleDefinition(locale).label}
                  </h3>
                  <UploadedScreenMockupRow screenshots={shots} />
                </div>
              ))
            ) : (
              <UploadedScreenMockupRow screenshots={draft.screenshots} />
            )}
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
