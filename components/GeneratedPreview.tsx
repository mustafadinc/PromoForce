"use client";

import type { RefObject } from "react";

type GeneratedPreviewProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  generatedImageUrl: string;
  prompt: string;
};

export function GeneratedPreview({ canvasRef, generatedImageUrl, prompt }: GeneratedPreviewProps) {
  const handleDownload = () => {
    if (!generatedImageUrl) return;

    const link = document.createElement("a");
    link.href = generatedImageUrl;
    link.download = "instagram-promo-image.png";
    link.click();
  };

  return (
    <section className="preview-panel">
      <div className="preview-toolbar">
        <div>
          <p className="eyebrow">Instagram post preview</p>
          <h2>Premium launch creative</h2>
        </div>
        <button className="secondary-action" type="button" disabled={!generatedImageUrl} onClick={handleDownload}>
          Download
        </button>
      </div>

      <div className="canvas-stage" aria-live="polite">
        <canvas ref={canvasRef} width={1080} height={1080} />
        {!generatedImageUrl ? (
          <div className="empty-state">
            <span>1080 x 1080</span>
            <p>Your generated Instagram promo image will appear here.</p>
          </div>
        ) : null}
      </div>

      <details className="prompt-box">
        <summary>Generated API prompt</summary>
        <pre>{prompt}</pre>
      </details>
    </section>
  );
}
