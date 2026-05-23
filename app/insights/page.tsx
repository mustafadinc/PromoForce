"use client";

import { useState } from "react";
import { SiteChrome } from "@/components/SiteChrome";

export default function InsightsPage() {
  const [campaignId, setCampaignId] = useState("");
  const [insights, setInsights] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!campaignId.trim()) return;
    setError(null);
    const res = await fetch(`/api/insights/${campaignId.trim()}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load");
      return;
    }
    setInsights(data.insights);
  };

  return (
    <SiteChrome>
    <main className="insights-shell">
      <h1>Campaign insights</h1>
      <p>Paste a campaign ID from your database to view AI performance analysis.</p>

      <div className="insights-form">
        <input
          type="text"
          placeholder="Campaign UUID"
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
        />
        <button type="button" className="settings-btn" onClick={load}>
          Load insights
        </button>
      </div>

      {error ? <p className="settings-error">{error}</p> : null}

      {insights ? (
        <pre className="insights-json">{JSON.stringify(insights, null, 2)}</pre>
      ) : null}
    </main>
    </SiteChrome>
  );}
