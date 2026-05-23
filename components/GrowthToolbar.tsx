"use client";

import { useEffect, useState } from "react";
import type { AppProfile } from "@/lib/campaignTypes";
import { DEFAULT_USAGE_STATUS, getUsageStatus, setUsagePlan } from "@/lib/usageLimits";
import { deleteWorkspaceApp, loadWorkspaceApps, saveWorkspaceApp } from "@/lib/workspace";
import type { SavedAppWorkspace } from "@/lib/campaignTypes";

type GrowthToolbarProps = {
  currentProfile: AppProfile | null;
  onLoadApp: (profile: AppProfile) => void;
};

export function GrowthToolbar({ currentProfile, onLoadApp }: GrowthToolbarProps) {
  const [apps, setApps] = useState<SavedAppWorkspace[]>([]);
  const [usage, setUsage] = useState(DEFAULT_USAGE_STATUS);
  const [isHydrated, setIsHydrated] = useState(false);
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
  };

  const handleDeleteApp = (id: string) => {
    deleteWorkspaceApp(id);
    refresh();
  };

  return (
    <>
      <header className="growth-toolbar">
        <div className="growth-toolbar-left">
          <strong>PromoForce</strong>
          <span className="usage-pill">
            {isHydrated
              ? `${usage.planLabel}: ${usage.used}/${usage.limit} generations today`
              : "Loading usage..."}
          </span>        </div>
        <div className="growth-toolbar-right">
          <label className="workspace-select-wrap">
            <span>Workspace</span>
            <select
              defaultValue=""
              onChange={(event) => {
                if (event.target.value) handleLoadApp(event.target.value);
                event.target.value = "";
              }}
            >
              <option value="">Load saved app...</option>
              {apps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.profile.appName}
                </option>
              ))}
            </select>
          </label>
          <button className="secondary-action compact-action" type="button" onClick={handleSaveApp} disabled={!currentProfile?.appName}>
            Save App
          </button>
          {apps.length ? (
            <button
              className="secondary-action compact-action"
              type="button"
              onClick={() => {
                const id = apps[0]?.id;
                if (id && confirm(`Delete workspace app "${apps[0].profile.appName}"?`)) {
                  handleDeleteApp(id);
                }
              }}
            >
              Manage
            </button>
          ) : null}
          {isHydrated && usage.plan === "free" ? (
            <button className="primary-action compact-action" type="button" onClick={() => setShowUpgrade(true)}>
              Upgrade
            </button>
          ) : null}
        </div>
      </header>

      {isHydrated && usage.remaining <= 3 && usage.plan === "free" ? (
        <p className="usage-warning">{usage.remaining} generations left today on Free plan.</p>
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
