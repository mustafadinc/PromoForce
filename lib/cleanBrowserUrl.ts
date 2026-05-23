const FORM_QUERY_KEYS = [
  "campaignType",
  "appName",
  "category",
  "description",
  "targetAudience",
  "screenshots",
  "duration",
  "startDate",
  "brandMemory",
  "performanceContext",
] as const;

/** Remove setup form fields accidentally leaked into the address bar (GET form fallback). */
export function stripFormQueryParamsFromUrl() {
  if (typeof window === "undefined") return false;

  const url = new URL(window.location.href);
  let changed = false;

  for (const key of FORM_QUERY_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }

  if (!changed) return false;

  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
  return true;
}
