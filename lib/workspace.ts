import type { AppProfile, SavedAppWorkspace } from "@/lib/campaignTypes";

const STORAGE_KEY = "promoforce-workspace";

export function loadWorkspaceApps(): SavedAppWorkspace[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedAppWorkspace[]) : [];
  } catch {
    return [];
  }
}

export function saveWorkspaceApp(profile: AppProfile): SavedAppWorkspace {
  const apps = loadWorkspaceApps();
  const existing = apps.find((app) => app.profile.appName.toLowerCase() === profile.appName.toLowerCase());
  const entry: SavedAppWorkspace = existing || {
    id: crypto.randomUUID(),
    profile,
    savedAt: new Date().toISOString(),
  };

  entry.profile = profile;
  entry.savedAt = new Date().toISOString();

  const next = [entry, ...apps.filter((app) => app.id !== entry.id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 20)));
  return entry;
}

export function deleteWorkspaceApp(id: string) {
  if (typeof window === "undefined") return;

  const next = loadWorkspaceApps().filter((app) => app.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getWorkspaceApp(id: string) {
  return loadWorkspaceApps().find((app) => app.id === id) || null;
}
