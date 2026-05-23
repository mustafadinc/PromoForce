"use client";

import { useState } from "react";

type ShareButtonProps = {
  postId?: string;
  dataUrl?: string;
  caption?: string;
  className?: string;
};

export function ShareButton({ postId, dataUrl, caption, className = "" }: ShareButtonProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const shareNow = async (platforms: string[]) => {
    if (!postId) {
      setStatus("Save campaign to database first to enable direct publish.");
      return;
    }

    setBusy(true);
    setStatus("Publishing…");

    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, platforms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publish failed");

      const ok = (data.results as Array<{ platform: string; externalPostId?: string; error?: string }>).filter(
        (r) => r.externalPostId,
      );
      const fail = (data.results as Array<{ error?: string; platform: string }>).filter((r) => r.error);

      if (ok.length) {
        setStatus(`Published to ${ok.map((r) => r.platform).join(", ")}`);
      } else if (fail.length) {
        setStatus(fail.map((f) => f.error).join(" · "));
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  };

  const copyCaption = async () => {
    if (!caption) return;
    await navigator.clipboard.writeText(caption);
    setStatus("Caption copied");
  };

  const downloadImage = () => {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "promoforce-post.png";
    link.click();
  };

  return (
    <div className={`share-actions ${className}`}>
      <button type="button" className="slide-action slide-action-primary" disabled={busy} onClick={() => shareNow(["all"])}>
        Share to connected accounts
      </button>
      <button type="button" className="slide-action" disabled={busy} onClick={() => shareNow(["instagram_feed"])}>
        Instagram
      </button>
      <button type="button" className="slide-action" disabled={busy} onClick={() => shareNow(["twitter"])}>
        X / Twitter
      </button>
      {dataUrl ? (
        <button type="button" className="slide-action" onClick={downloadImage}>
          Download
        </button>
      ) : null}
      {caption ? (
        <button type="button" className="slide-action" onClick={copyCaption}>
          Copy caption
        </button>
      ) : null}
      {status ? <p className="share-status">{status}</p> : null}
    </div>
  );
}
