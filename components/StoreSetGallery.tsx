"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { CopyToast } from "@/components/CopyToast";
import { ExportStatusStrip } from "@/components/ExportStatusStrip";
import { StoreSlideExportCard } from "@/components/StoreSlideExportCard";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";
import type { GeneratedSlide, StoreSlideRegenerateMode, StoreSlideRegenerateOptions } from "@/lib/campaignTypes";
import { STORE_SLIDE_COUNT } from "@/lib/campaignTypes";
import { APP_STORE_EXPORT_PRESETS, type AppStoreExportPreset } from "@/lib/appStoreImageSizes";
import { APP_STORE_EXPORT_HEIGHT, APP_STORE_EXPORT_WIDTH } from "@/lib/appStoreImageSizes";
import { lintAppStoreSet } from "@/lib/appStoreExportLintClient";
import { downloadAppStoreZip } from "@/lib/exportAppStoreZip";

type StoreSetGalleryProps = {
  slides: GeneratedSlide[];
  progressLabel: string;
  partialPreviewUrl?: string;
  regeneratingSlideNumber?: number | null;
  isGenerating: boolean;
  onRestart: () => void;
  onCancel?: () => void;
  onRegenerateSlide?: (
    slideNumber: number,
    mode?: StoreSlideRegenerateMode,
    options?: StoreSlideRegenerateOptions,
  ) => void;
  onSelectVariant?: (slideNumber: number, variantId: string) => void;
};

export function StoreSetGallery({
  slides,
  progressLabel,
  partialPreviewUrl,
  regeneratingSlideNumber = null,
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
  const { copyMessage, copyText, clearCopyMessage } = useCopyFeedback();

  const exportLabel = `${APP_STORE_EXPORT_WIDTH}×${APP_STORE_EXPORT_HEIGHT}`;
  const aspectRatio = `${APP_STORE_EXPORT_WIDTH} / ${APP_STORE_EXPORT_HEIGHT}`;

  useEffect(() => {
    if (!slides.length || isGenerating) {
      setLintMessage(null);
      return;
    }

    let cancelled = false;
    setIsLinting(true);
    void lintAppStoreSet(slides, exportPreset)
      .then((result) => {
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
      })
      .finally(() => {
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
      void copyText("ZIP bundle downloaded", "Downloaded campaign ZIP");
    } finally {
      setIsZipping(false);
    }
  };

  const displaySlides =
    isGenerating && slides.length === 0
      ? Array.from({ length: 5 }, (_, index) => ({
          slideNumber: index + 1,
          role: index === 0 ? ("hero" as const) : index === 4 ? ("cta" as const) : ("feature" as const),
          headline: progressLabel || "Generating...",
          subheadline: "",
          dataUrl: index === 0 && partialPreviewUrl ? partialPreviewUrl : "",
          prompt: "",
        }))
      : slides;

  const expectedSlides = STORE_SLIDE_COUNT;
  const isPartialSet = !isGenerating && slides.length > 0 && slides.length < expectedSlides;

  return (
    <section className="preview-panel gallery-panel pf-gallery-panel">
      <ExportStatusStrip
        isGenerating={isGenerating}
        progressLabel={progressLabel}
        complete={!isGenerating && slides.length > 0}
        completeTitle={isPartialSet ? "Export incomplete" : "Export complete"}
        completeMessage={
          isPartialSet
            ? `${slides.length} of ${expectedSlides} App Store slides generated at ${exportLabel}. Retry from Strategy or regenerate missing slides.`
            : `${slides.length} App Store slides ready at ${exportLabel}.`
        }
      />

      <div className="pf-export-header">
        <div className="pf-export-header-actions">
          {isGenerating ? (
            <button className="secondary-action cancel-action compact-action" type="button" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
          <button className="secondary-action compact-action" type="button" onClick={onRestart} disabled={isGenerating}>
            New Campaign
          </button>
          <button
            className="secondary-action compact-action"
            type="button"
            onClick={downloadAll}
            disabled={isGenerating || slides.length === 0}
          >
            Download All
          </button>
          <label className="export-preset-field">
            <span>Device preset</span>
            <select
              value={exportPreset}
              onChange={(e) => setExportPreset(e.target.value as AppStoreExportPreset)}
              disabled={isGenerating || slides.length === 0}
            >
              {Object.values(APP_STORE_EXPORT_PRESETS).map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="export-zip-btn pf-export-zip-btn"
            type="button"
            onClick={() => void handleZipExport()}
            disabled={isZipping || isGenerating || slides.length === 0}
          >
            <Download aria-hidden="true" />
            <span>{isZipping ? "Building ZIP…" : "Download Package (ZIP)"}</span>
          </button>
        </div>
        {lintMessage ? (
          <p className={`export-lint-message pf-export-lint ${isLinting ? "is-pending" : ""}`}>{lintMessage}</p>
        ) : null}
      </div>

      {slides.length > 1 && !isGenerating ? (
        <div className="showcase-strip pf-cohesion-strip">
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

      {isGenerating && partialPreviewUrl && slides.length > 0 && regeneratingSlideNumber === null ? (
        <div className="generation-preview pf-stream-preview">
          <div className="generation-preview-frame" style={{ aspectRatio }}>
            <img src={partialPreviewUrl} alt="Live slide preview" className="generation-preview-image" />
          </div>
          <p className="generation-preview-caption">{progressLabel}</p>
        </div>
      ) : null}

      <div className="pf-export-grid">
        {displaySlides.map((slide) => (
          <StoreSlideExportCard
            key={`${slide.slideNumber}-${"renderVersion" in slide ? slide.renderVersion ?? 0 : 0}`}
            slide={slide}
            aspectRatio={aspectRatio}
            isGenerating={isGenerating}
            isRegenerating={regeneratingSlideNumber === slide.slideNumber}
            isStreaming={isGenerating && !slide.dataUrl && slide.slideNumber === 1}
            onDownload={downloadSlide}
            onCopyHeadline={(text) => void copyText(text, "Headline copied")}
            onRegenerateSlide={onRegenerateSlide}
            onSelectVariant={onSelectVariant}
          />
        ))}
      </div>

      <CopyToast message={copyMessage} onDismiss={clearCopyMessage} />
    </section>
  );
}
