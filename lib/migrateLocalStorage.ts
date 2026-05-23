"use client";

import type { BrandMemory } from "@/lib/campaignTypes";
import { loadBrandMemory } from "@/lib/brandMemory";
import { loadPerformanceRecords } from "@/lib/performanceMemory";
import { loadWorkspaceApps } from "@/lib/workspace";

export async function migrateLocalStorageToServer() {
  const apps = loadWorkspaceApps();
  if (!apps.length) return { migrated: 0 };

  const payload = {
    apps: apps.map((entry) => ({
      profile: entry.profile,
      brandMemory: loadBrandMemory(entry.profile.appName),
    })),
    performance: apps.map((entry) => ({
      appName: entry.profile.appName,
      records: loadPerformanceRecords(entry.profile.appName),
    })),
  };

  const response = await fetch("/api/migrate-local", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Migration failed");
  }

  return response.json();
}

export function hasLocalDataToMigrate() {
  return loadWorkspaceApps().length > 0;
}
