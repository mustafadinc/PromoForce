"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Sparkles } from "lucide-react";
import type { AppProfile } from "@/lib/campaignTypes";
import { ACCENT_THEMES, DESIGN_ASSETS } from "@/lib/designAssets";
import { DEFAULT_USAGE_STATUS, getUsageStatus, setUsagePlan } from "@/lib/usageLimits";
import { deleteWorkspaceApp, loadWorkspaceApps, saveWorkspaceApp } from "@/lib/workspace";
import type { SavedAppWorkspace } from "@/lib/campaignTypes";
import { useAccentTheme } from "@/components/ThemeProvider";

export type WorkflowTab = "setup" | "strategy" | "export";

type PromoForceNavProps = {
  currentProfile: AppProfile | null;
  activeTab: WorkflowTab;
  canAccessStrategy: boolean;
  canAccessExport: boolean;
  onTabChange: (tab: WorkflowTab) => void;
  onLoadApp: (profile: AppProfile) => void;
  userEmail?: string | null;
};

const NAV_TABS: Array<{ id: WorkflowTab; label: string }> = [
  { id: "setup", label: "Setup" },
  { id: "strategy", label: "Strategy Review" },
  { id: "export", label: "Export Set" },
];

export function PromoForceNav({
  currentProfile,
  activeTab,
  canAccessStrategy,
  canAccessExport,
  onTabChange,
  onLoadApp,
  userEmail,
}: PromoForceNavProps) {
  const { theme, setTheme } = useAccentTheme();
  const [apps, setApps] = useState<SavedAppWorkspace[]>([]);
  const [usage, setUsage] = useState(DEFAULT_USAGE_STATUS);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showSavedDropdown, setShowSavedDropdown] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    setApps(loadWorkspaceApps());
    setUsage(getUsageStatus());
    setIsHydrated(true);
  }, []);

  const refresh = () => {
    setApps(loadWorkspaceApps());
    setUsage(getUsageStatus());
  };

  const handleSaveApp = () => {
    if (!currentProfile?.appName) return;
    saveWorkspaceApp(currentProfile);
    refresh();
  };

  const handleLoadApp = (id: string) => {
    const app = loadWorkspaceApps().find((entry) => entry.id === id);
    if (!app) return;
    onLoadApp(app.profile);
    setShowSavedDropdown(false);
  };

  const tabEnabled = (tab: WorkflowTab) => {
    if (tab === "setup") return true;
    if (tab === "strategy") return canAccessStrategy;
    return canAccessExport;
  };

  return (
    <>
      <nav className="pf-nav" aria-label="PromoForce navigation">
        <div className="pf-nav-left">
          <button type="button" className="pf-logo" onClick={() => onTabChange("setup")}>
            <Sparkles className="pf-logo-icon" aria-hidden="true" />
            <span>PromoForce</span>
          </button>

          <div className="pf-nav-tabs">
            {NAV_TABS.map((tab) => {
              const enabled = tabEnabled(tab.id);
              const tabDisabled = isHydrated && !enabled;
              return (
                <button
                  key={tab.id}
                  type="button"
                  disabled={tabDisabled}
                  aria-disabled={!enabled}
                  onClick={() => enabled && onTabChange(tab.id)}
                  className={`pf-nav-tab ${activeTab === tab.id ? "is-active" : ""} ${tabDisabled ? "is-disabled" : ""}`}
                >
                  {activeTab === tab.id ? (
                    <motion.span layoutId="pf-active-tab" className="pf-nav-tab-ring" aria-hidden="true" />
                  ) : null}
                  <span className="pf-nav-tab-label">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pf-nav-right">
          <div className="pf-theme-picker" aria-label="Accent theme">
            <span className="pf-theme-label">Theme</span>
            {ACCENT_THEMES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                aria-label={entry.label}
                aria-pressed={theme === entry.id}
                onClick={() => setTheme(entry.id)}
                className={`pf-theme-dot ${theme === entry.id ? "is-active" : ""}`}
                style={{ backgroundColor: entry.color }}
              />
            ))}
          </div>

          <span className="pf-usage-pill">
            {isHydrated ? `${usage.planLabel}: ${usage.used}/${usage.limit} today` : "Loading usage..."}
          </span>

          <div className="pf-saved-wrap">
            <button
              type="button"
              className="pf-saved-trigger"
              onClick={() => setShowSavedDropdown((open) => !open)}
            >
              <span>Load Saved ({apps.length})</span>
              <ChevronDown className="pf-saved-chevron" aria-hidden="true" />
            </button>

            <AnimatePresence>
              {showSavedDropdown ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="pf-saved-dropdown"
                >
                  <div className="pf-saved-dropdown-title">Recent apps</div>
                  {apps.length ? (
                    apps.map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        className="pf-saved-item"
                        onClick={() => handleLoadApp(app.id)}
                      >
                        <span className="pf-saved-item-name">{app.profile.appName}</span>
                        <span className="pf-saved-item-meta">{app.profile.category}</span>
                      </button>
                    ))
                  ) : (
                    <p className="pf-saved-empty">No saved apps yet</p>
                  )}
                  <div className="pf-saved-actions">
                    <button
                      type="button"
                      className="pf-saved-action"
                      onClick={handleSaveApp}
                      disabled={isHydrated ? !currentProfile?.appName : false}
                    >
                      Save current app
                    </button>
                    {apps[0] ? (
                      <button
                        type="button"
                        className="pf-saved-action pf-saved-action-danger"
                        onClick={() => {
                          const id = apps[0]?.id;
                          if (id && confirm(`Delete workspace app "${apps[0].profile.appName}"?`)) {
                            deleteWorkspaceApp(id);
                            refresh();
                          }
                        }}
                      >
                        Delete latest
                      </button>
                    ) : null}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {isHydrated && usage.plan === "free" ? (
            <button type="button" className="pf-upgrade-btn" onClick={() => setShowUpgrade(true)}>
              Upgrade
            </button>
          ) : (
            <span className="pf-pro-badge">Pro Active</span>
          )}

          <Link href="/insights" className="pf-nav-link">
            Insights
          </Link>
          <Link href="/pricing" className="pf-nav-link">
            Pricing
          </Link>

          {userEmail ? (
            <div className="pf-user-chip" title={userEmail}>
              {userEmail.slice(0, 1).toUpperCase()}
            </div>
          ) : (
            <Link href="/login" className="pf-nav-link">
              Sign in
            </Link>
          )}

          <div className="pf-avatar" aria-hidden="true">
            <img src={DESIGN_ASSETS.userAvatar} alt="" />
          </div>
        </div>
      </nav>

      {isHydrated && usage.remaining <= 3 && usage.plan === "free" ? (
        <p className="pf-usage-warning">{usage.remaining} generations left today on Free plan.</p>
      ) : null}

      {showUpgrade ? (
        <div className="upgrade-modal-backdrop" onClick={() => setShowUpgrade(false)}>
          <div className="upgrade-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Upgrade to Pro</h2>
            <p>Pro unlocks 500 daily AI generations, priority batch runs, and team workspace (coming soon).</p>
            <ul>
              <li>500 generations / day</li>
              <li>30-day autopilot calendars</li>
              <li>Performance-informed AI strategies</li>
            </ul>
            <div className="toolbar-actions">
              <button className="secondary-action compact-action" type="button" onClick={() => setShowUpgrade(false)}>
                Not now
              </button>
              <button
                className="primary-action compact-action"
                type="button"
                onClick={() => {
                  setUsagePlan("pro");
                  refresh();
                  setShowUpgrade(false);
                }}
              >
                Enable Pro (demo)
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
