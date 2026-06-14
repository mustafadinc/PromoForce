"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { CopyToast } from "@/components/CopyToast";
import { ExportStatusStrip } from "@/components/ExportStatusStrip";
import { LiveSlideEditor } from "@/components/LiveSlideEditor";
import { StoreSlideExportCard } from "@/components/StoreSlideExportCard";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";
import type {
  AppProfile,
  GeneratedSlide,
  SlideEditorState,
  StoreSlideRegenerateMode,
  StoreSlideRegenerateOptions,
  StrategyBrief,
} from "@/lib/campaignTypes";
import { STORE_SLIDE_COUNT } from "@/lib/campaignTypes";
import { APP_STORE_EXPORT_PRESETS, type AppStoreExportPreset } from "@/lib/appStoreImageSizes";
import { APP_STORE_EXPORT_HEIGHT, APP_STORE_EXPORT_WIDTH } from "@/lib/appStoreImageSizes";
import { lintAppStoreSet } from "@/lib/appStoreExportLintClient";
import { downloadAppStoreZip } from "@/lib/exportAppStoreZip";
import { scoreGeneratedSlides } from "@/lib/readabilityScore";
import type { SetCoherenceAudit } from "@/lib/agents/setCoherenceAgent";

type StoreSetGalleryProps = {
  slides: GeneratedSlide[];
  strategy?: StrategyBrief | null;
  appProfile?: AppProfile | null;
  screenshotPreviews?: Array<{ index: number; previewUrl: string }>;
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
  onUpdateSlideFromEditor?: (
    slideNumber: number,
    update: {
      dataUrl: string;
      editorState: SlideEditorState;
      headline: string;
      subheadline: string;
    },
  ) => void;
  onRevertSlideToOriginal?: (slideNumber: number) => void;
};

export function StoreSetGallery({
  slides,
  strategy = null,
  appProfile = null,
  screenshotPreviews = [],
  progressLabel,
  partialPreviewUrl,
  regeneratingSlideNumber = null,
  isGenerating,
  onRestart,
  onCancel,
  onRegenerateSlide,
  onSelectVariant,
  onUpdateSlideFromEditor,
  onRevertSlideToOriginal,
}: StoreSetGalleryProps) {
  const [exportPreset, setExportPreset] = useState<AppStoreExportPreset>("iphone_67");
  const [lintMessage, setLintMessage] = useState<string | null>(null);
  const [isLinting, setIsLinting] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [coherenceAudit, setCoherenceAudit] = useState<SetCoherenceAudit | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [editingSlideNumber, setEditingSlideNumber] = useState<number | null>(null);
  const { copyMessage, copyText, clearCopyMessage } = useCopyFeedback();

  const readability = useMemo(
    () => (slides.length ? scoreGeneratedSlides(slides) : null),
    [slides],
  );

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

  const editingSlide = editingSlideNumber
    ? slides.find((slide) => slide.slideNumber === editingSlideNumber) ?? null
    : null;
  const editingSlidePlan =
    editingSlide && strategy
      ? strategy.slides.find((slide) => slide.slideNumber === editingSlide.slideNumber) ?? null
      : null;
  const editingScreenshotUrl =
    editingSlidePlan?.screenshotIndex !== null && editingSlidePlan?.screenshotIndex !== undefined
      ? screenshotPreviews.find((shot) => shot.index === editingSlidePlan.screenshotIndex)?.previewUrl ?? null
      : null;
  const editingBackgroundUrl = editingSlide?.backgroundDataUrl ?? editingSlide?.dataUrl ?? "";

  const downloadAll = () => {
    slides.forEach((slide, index) => {
      window.setTimeout(() => downloadSlide(slide), index * 250);
    });
  };

  const runCoherenceAudit = async () => {
    if (!strategy) return;
    setIsAuditing(true);
    setAuditError(null);
    try {
      const response = await fetch("/api/strategy/audit-set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy }),
      });
      const payload = (await response.json()) as { audit?: SetCoherenceAudit; error?: string };
      if (!response.ok || !payload.audit) {
        throw new Error(payload.error || "Audit failed.");
      }
      setCoherenceAudit(payload.audit);
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : "Audit failed.");
    } finally {
      setIsAuditing(false);
    }
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
        {readability ? (
          <p className="pf-readability-summary">
            Copy readability: <strong>{readability.overallScore}/100</strong>
            {readability.issues.length
              ? ` · ${readability.issues.length} issue${readability.issues.length === 1 ? "" : "s"}`
              : " · headlines look tight"}
          </p>
        ) : null}
      </div>

      {strategy && !isGenerating && slides.length > 0 ? (
        <div className="pf-coherence-audit-panel">
          <div className="pf-coherence-audit-header">
            <span>Set coherence audit</span>
            <button
              type="button"
              className="secondary-action compact-action"
              onClick={() => void runCoherenceAudit()}
              disabled={isAuditing}
            >
              {isAuditing ? "Auditing…" : coherenceAudit ? "Re-run audit" : "Run AI audit"}
            </button>
          </div>
          {auditError ? <p className="error-message">{auditError}</p> : null}
          {coherenceAudit ? (
            <div className="pf-coherence-audit-body">
              <p>
                Overall <strong>{coherenceAudit.overallScore}/100</strong> · Narrative{" "}
                {coherenceAudit.narrativeCohesion} · Copy {coherenceAudit.copyUniqueness}
              </p>
              {coherenceAudit.issues.length ? (
                <ul className="pf-coherence-issues">
                  {coherenceAudit.issues.map((issue, index) => (
                    <li key={`${issue.message}-${index}`}>
                      {issue.slideNumber ? `Slide ${issue.slideNumber}: ` : ""}
                      {issue.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pf-coherence-ok">No major coherence issues flagged.</p>
              )}
            </div>
          ) : (
            <p className="pf-coherence-hint">Check whether headlines tell one conversion story before upload.</p>
          )}
        </div>
      ) : null}

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
            onOpenLiveEditor={
              onUpdateSlideFromEditor && strategy ? (slide) => setEditingSlideNumber(slide.slideNumber) : undefined
            }
          />
        ))}
      </div>

      {editingSlide && editingSlidePlan && strategy && onUpdateSlideFromEditor ? (
        <LiveSlideEditor
          slide={editingSlide}
          slidePlan={editingSlidePlan}
          strategy={strategy}
          appProfile={appProfile}
          screenshotUrl={editingScreenshotUrl}
          backgroundUrl={editingBackgroundUrl}
          sourceDataUrl={editingSlide.sourceDataUrl ?? editingSlide.dataUrl}
          onClose={() => setEditingSlideNumber(null)}
          onRevertToOriginal={
            onRevertSlideToOriginal
              ? () => {
                  onRevertSlideToOriginal(editingSlide.slideNumber);
                  setEditingSlideNumber(null);
                }
              : undefined
          }
          onSave={(update) => {
            onUpdateSlideFromEditor(editingSlide.slideNumber, update);
            setEditingSlideNumber(null);
          }}
        />
      ) : null}

      <CopyToast message={copyMessage} onDismiss={clearCopyMessage} />
    </section>
  );
}
