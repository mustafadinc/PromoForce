"use client";

import { useEffect, useState } from "react";
import type { GeneratedSlide, StoreSlideRegenerateMode } from "@/lib/campaignTypes";
import { APP_STORE_EXPORT_PRESETS, type AppStoreExportPreset } from "@/lib/appStoreImageSizes";
import { APP_STORE_EXPORT_HEIGHT, APP_STORE_EXPORT_WIDTH } from "@/lib/appStoreImageSizes";
import { lintAppStoreSet } from "@/lib/appStoreExportLintClient";
import { downloadAppStoreZip } from "@/lib/exportAppStoreZip";

type StoreSetGalleryProps = {
  slides: GeneratedSlide[];
  progressLabel: string;
  partialPreviewUrl?: string;
  isGenerating: boolean;
  onRestart: () => void;
  onCancel?: () => void;
  onRegenerateSlide?: (slideNumber: number, mode?: StoreSlideRegenerateMode) => void;
  onSelectVariant?: (slideNumber: number, variantId: string) => void;
};

export function StoreSetGallery({
  slides,
  progressLabel,
  partialPreviewUrl,
  isGenerating,
  onRestart,
  onCancel,
  onRegenerateSlide,
  onSelectVariant,
}: StoreSetGalleryProps) {
  const [exportPreset, setExportPreset] = useState<AppStoreExportPreset>("iphone_67");
  const [lintMessage, setLintMessage] = useState<string | null>(null);
  const [isLinting, setIsLinting] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const exportLabel = `${APP_STORE_EXPORT_WIDTH}×${APP_STORE_EXPORT_HEIGHT}`;
  const aspectRatio = `${APP_STORE_EXPORT_WIDTH} / ${APP_STORE_EXPORT_HEIGHT}`;

  useEffect(() => {
    if (!slides.length || isGenerating) {
      setLintMessage(null);
      return;
    }

    let cancelled = false;
    setIsLinting(true);
    void lintAppStoreSet(slides, exportPreset).then((result) => {
      if (cancelled) return;
      if (!result.issues.length) {
        setLintMessage("Pre-upload lint: all slides passed.");
        return;
      }
      const errors = result.issues.filter((i) => i.level === "error");
      const warns = result.issues.filter((i) => i.level === "warn");
      setLintMessage(
        [
          errors.length ? `${errors.length} error(s)` : null,
          warns.length ? `${warns.length} warning(s)` : null,
          result.ok ? "OK for export with notes." : "Fix errors before App Store Connect upload.",
        ]
          .filter(Boolean)
          .join(" · "),
      );
    }).finally(() => {
      if (!cancelled) setIsLinting(false);
    });

    return () => {
      cancelled = true;
    };
  }, [slides, exportPreset, isGenerating]);

  const downloadSlide = (slide: GeneratedSlide) => {
    const link = document.createElement("a");
    link.href = slide.dataUrl;
    link.download = `app-store-slide-${slide.slideNumber}-${APP_STORE_EXPORT_WIDTH}x${APP_STORE_EXPORT_HEIGHT}.png`;
    link.click();
  };

  const downloadAll = () => {
    slides.forEach((slide, index) => {
      window.setTimeout(() => downloadSlide(slide), index * 250);
    });
  };

  const handleZipExport = async () => {
    if (!slides.length) return;
    setIsZipping(true);
    try {
      await downloadAppStoreZip(slides, exportPreset);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <section className="preview-panel gallery-panel">
      <div className="preview-toolbar">
        <div>
          <p className="eyebrow">App Store Pack</p>
          <h2>{isGenerating ? progressLabel : `Your 5-Slide Set (${exportLabel})`}</h2>
        </div>
        <div className="toolbar-actions">
          {isGenerating ? (
            <button className="secondary-action cancel-action" type="button" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
          <button className="secondary-action" type="button" onClick={onRestart} disabled={isGenerating}>
            New Campaign
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={downloadAll}
            disabled={isGenerating || slides.length === 0}
          >
            Download All
          </button>
        </div>
      </div>

      {slides.length > 0 && !isGenerating ? (
        <div className="export-controls">
          <div className="export-controls-main">
            <label className="export-preset-field">
              <span>Export size</span>
              <select
                value={exportPreset}
                onChange={(e) => setExportPreset(e.target.value as AppStoreExportPreset)}
              >
                {Object.values(APP_STORE_EXPORT_PRESETS).map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="export-zip-btn"
              type="button"
              onClick={() => void handleZipExport()}
              disabled={isZipping}
            >
              {isZipping ? "Building ZIP…" : "Download ZIP bundle"}
            </button>
          </div>
          {lintMessage ? (
            <p className={`export-lint-message ${isLinting ? "is-pending" : ""}`}>{lintMessage}</p>
          ) : null}
        </div>
      ) : null}

      {slides.length > 1 && !isGenerating ? (
        <div className="showcase-strip" aria-label="Set preview">
          <p className="showcase-label">Set cohesion preview</p>
          <div className="showcase-thumbs">
            {slides.map((slide) => (
              <div key={slide.slideNumber} className="showcase-thumb" style={{ aspectRatio }}>
                <img src={slide.dataUrl} alt={`Slide ${slide.slideNumber}`} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isGenerating ? (
        <div className="generation-preview">
          <div className="generation-preview-frame" style={{ aspectRatio }}>
            {partialPreviewUrl ? (
              <img src={partialPreviewUrl} alt="Live slide preview" className="generation-preview-image" />
            ) : (
              <div className="generation-preview-placeholder">
                <span className="generation-banner-spinner" aria-hidden="true" />
                <p>{progressLabel || "Generating slide…"}</p>
                <p className="generation-preview-hint">
                  First preview appears when the background finishes (often 30–90s).
                </p>
              </div>
            )}
          </div>
          <p className="generation-preview-caption">{progressLabel}</p>
        </div>
      ) : null}

      <div className="store-gallery">
        {slides.map((slide) => (
          <article key={slide.slideNumber} className="store-slide-card">
            <div className="store-slide-frame" style={{ aspectRatio }}>
              <img src={slide.dataUrl} alt={`${slide.headline} app store slide`} />
            </div>
            <div className="store-slide-copy">
              <div className="slide-plan-header">
                <span className="slide-badge">Slide {slide.slideNumber}</span>
                <span className="role-badge">{slide.role}</span>
              </div>
              <h3>{slide.headline}</h3>
              <p>{slide.subheadline}</p>

              {slide.variants && slide.variants.length > 1 ? (
                <div className="variant-picker">
                  <span>Pick best variant</span>
                  <div className="variant-picker-row">
                    {slide.variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        className={
                          slide.selectedVariantId === variant.id
                            ? "variant-thumb active"
                            : "variant-thumb"
                        }
                        onClick={() => onSelectVariant?.(slide.slideNumber, variant.id)}
                        disabled={isGenerating}
                      >
                        <img src={variant.dataUrl} alt={variant.id} />
                        <span>{variant.id}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="store-slide-actions">
                <button
                  className="slide-action slide-action-download"
                  type="button"
                  onClick={() => downloadSlide(slide)}
                >
                  Download PNG
                </button>
                {onRegenerateSlide ? (
                  <div className="slide-action-refine">
                    <span className="slide-action-refine-label">Refine slide</span>
                    <div className="slide-action-grid">
                      <button
                        className="slide-action slide-action-composite"
                        type="button"
                        onClick={() => onRegenerateSlide(slide.slideNumber, "composite")}
                        disabled={isGenerating || !slide.backgroundDataUrl}
                        title={
                          slide.backgroundDataUrl
                            ? "Reuse background — refresh text & mockup (no AI cost)"
                            : "Run a full generate first to save a background"
                        }
                      >
                        Composite only
                      </button>
                      <button
                        className="slide-action slide-action-background"
                        type="button"
                        onClick={() => onRegenerateSlide(slide.slideNumber, "background")}
                        disabled={isGenerating}
                        title="New AI background, same headline + screenshot"
                      >
                        New background
                      </button>
                      <button
                        className="slide-action slide-action-full"
                        type="button"
                        onClick={() => onRegenerateSlide(slide.slideNumber, "full")}
                        disabled={isGenerating}
                        title="Regenerate background, composite, and polish"
                      >
                        Full regen
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
