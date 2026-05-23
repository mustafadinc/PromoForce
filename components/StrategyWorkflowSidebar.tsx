"use client";

import { ImageIcon, Layout, Plus, Sliders } from "lucide-react";
import type { AppProfile } from "@/lib/campaignTypes";
import type { WorkflowTab } from "@/components/PromoForceNav";
import { useAccentTheme } from "@/components/ThemeProvider";

type StrategyWorkflowSidebarProps = {
  mode: "strategy" | "export";
  strategyTitle: string;
  phaseLabel: string;
  sidebarCopy: string;
  appProfile: AppProfile | null;
  screenshotCount: number;
  hasEdits?: boolean;
  errorMessage?: string;
  screenshotPreviews: Array<{ index: number; previewUrl: string }>;
  onNewCampaign: () => void;
  onNavigate: (tab: WorkflowTab) => void;
};

export function StrategyWorkflowSidebar({
  mode,
  strategyTitle,
  phaseLabel,
  sidebarCopy,
  appProfile,
  screenshotCount,
  hasEdits,
  errorMessage,
  screenshotPreviews,
  onNewCampaign,
  onNavigate,
}: StrategyWorkflowSidebarProps) {
  const { theme } = useAccentTheme();

  return (
    <aside className="pf-workflow-sidebar">
      <div className="pf-workflow-sidebar-top">
        <div className="pf-workspace-card">
          <div className="pf-workspace-avatar">{appProfile?.appName?.slice(0, 1) || "P"}</div>
          <div>
            <h4 className="pf-workspace-name">{appProfile?.appName || "New campaign"}</h4>
            <span className="pf-workspace-plan">Workspace</span>
          </div>
        </div>

        <button type="button" className="pf-new-campaign-btn" onClick={onNewCampaign}>
          <Plus aria-hidden="true" />
          <span>Start a New Campaign</span>
        </button>

        <div className="pf-workflow-nav">
          <button
            type="button"
            className={`pf-workflow-nav-item ${mode === "strategy" ? "is-active" : ""}`}
            onClick={() => onNavigate("strategy")}
          >
            <Layout aria-hidden="true" />
            <span>Overview</span>
          </button>
          <button
            type="button"
            className={`pf-workflow-nav-item ${mode === "export" ? "is-active" : ""}`}
            onClick={() => onNavigate("export")}
          >
            <ImageIcon aria-hidden="true" />
            <span>Generated Assets</span>
          </button>
          <button type="button" className="pf-workflow-nav-item" onClick={() => onNavigate("setup")}>
            <Sliders aria-hidden="true" />
            <span>Studio Setup</span>
          </button>
        </div>

        <div className="pf-audit-card">
          <div className="pf-audit-title">Active campaign</div>
          <dl className="pf-audit-list">
            <div>
              <dt>Phase</dt>
              <dd>{phaseLabel}</dd>
            </div>
            <div>
              <dt>Focus</dt>
              <dd>{strategyTitle}</dd>
            </div>
            <div>
              <dt>Screenshots</dt>
              <dd>{screenshotCount}</dd>
            </div>
            <div>
              <dt>Theme</dt>
              <dd className="pf-audit-theme" data-theme={theme}>
                {theme}
              </dd>
            </div>
          </dl>
        </div>

        <p className="sidebar-copy">{sidebarCopy}</p>
        {hasEdits ? <p className="edit-indicator">You have edits to the AI plan.</p> : null}

        {screenshotPreviews.length ? (
          <div className="uploaded-screens-strip pf-sidebar-screens">
            <span className="uploaded-screens-label">Uploaded screens ({screenshotPreviews.length})</span>
            <div className="pf-compact-screens-row pf-sidebar-screens-row">
              {screenshotPreviews.map((preview) => (
                <figure
                  key={preview.index}
                  className="pf-compact-screen-thumb pf-sidebar-screen-thumb"
                  title={`Screen ${preview.index + 1}`}
                  style={{
                    width: 44,
                    height: 44,
                    minWidth: 44,
                    maxWidth: 44,
                    minHeight: 44,
                    maxHeight: 44,
                    backgroundImage: `url("${preview.previewUrl}")`,
                  }}
                >
                  <span className="pf-compact-screen-num">{preview.index + 1}</span>
                </figure>
              ))}
            </div>
          </div>
        ) : null}

        {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
      </div>

      <div className="pf-workflow-sidebar-footer">PromoForce Engine</div>
    </aside>
  );
}
