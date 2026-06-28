"use client";



import { useEffect, useState } from "react";

import { Copy, Download, Image, Smartphone, Sparkles } from "lucide-react";

import { MockupPoseControls } from "@/components/MockupPoseControls";
import { MockupAssetSelector } from "@/components/MockupAssetSelector";
import type { GeneratedSlide, MockupAssetId, MockupPose, StoreSlideRegenerateMode, StoreSlideRegenerateOptions } from "@/lib/campaignTypes";
import { getBeatForSlide, storeSlideBeatMeta } from "@/lib/storeSetAsoFramework";

import {

  DEFAULT_MOCKUP_FRAME_COLOR,

  MOCKUP_FRAME_PRESETS,

  normalizeMockupFrameColor,

  presetSwatchColor,

  type MockupFrameColor,

} from "@/lib/mockupFrameColors";
import { normalizeMockupPose } from "@/lib/mockupPose";
import {
  DEFAULT_MOCKUP_ASSET_ID,
  isUnknownMockupAssetId,
  normalizeMockupAssetId,
} from "@/lib/assetMockup";



type StoreSlideExportCardProps = {

  slide: GeneratedSlide;

  aspectRatio: string;

  isGenerating: boolean;

  isRegenerating?: boolean;

  isStreaming?: boolean;

  onDownload: (slide: GeneratedSlide) => void;

  onDownloadMockupOnly?: (slide: GeneratedSlide) => void | Promise<void>;

  canDownloadMockupOnly?: boolean;

  onCopyHeadline: (text: string) => void;

  onRegenerateSlide?: (

    slideNumber: number,

    mode?: StoreSlideRegenerateMode,

    options?: StoreSlideRegenerateOptions,

  ) => void;

  onSelectVariant?: (slideNumber: number, variantId: string) => void;

  onOpenLiveEditor?: (slide: GeneratedSlide) => void;

  hasMockup?: boolean;

  slideCount?: number;

  onDownloadBackgroundOnly?: (slide: GeneratedSlide) => void;

};



export function StoreSlideExportCard({

  slide,

  aspectRatio,

  isGenerating,

  isRegenerating = false,

  isStreaming = false,

  onDownload,

  onDownloadMockupOnly,

  onDownloadBackgroundOnly,

  canDownloadMockupOnly: _canDownloadMockupOnly = false,

  onCopyHeadline,

  onRegenerateSlide,

  onSelectVariant,

  onOpenLiveEditor,

  hasMockup: propsHasMockup,

  slideCount = 5,

}: StoreSlideExportCardProps) {

  const beat = slide.asoBeat ?? getBeatForSlide(slide.slideNumber, slideCount);
  const slideLabel = storeSlideBeatMeta[beat].label;

  const [mockupColor, setMockupColor] = useState<MockupFrameColor>(

    normalizeMockupFrameColor(slide.mockupColor ?? DEFAULT_MOCKUP_FRAME_COLOR),

  );

  const [mockupPose, setMockupPose] = useState<MockupPose>(() =>
    normalizeMockupPose(slide.mockupPose, slide.slideNumber),
  );
  const [mockupAssetId, setMockupAssetId] = useState<MockupAssetId>(() =>
    normalizeMockupAssetId(slide.mockupAssetId ?? DEFAULT_MOCKUP_ASSET_ID),
  );

  const hasMockup = propsHasMockup ?? true;
  const showMockupControls = hasMockup;
  const hasLegacySceneMockup = isUnknownMockupAssetId(slide.mockupAssetId);
  const canDownloadMockupOnly = Boolean(hasMockup && !hasLegacySceneMockup);
  const canComposite = Boolean(slide.backgroundDataUrl) && hasMockup && !hasLegacySceneMockup;
  const canLiveEdit = Boolean(onOpenLiveEditor && slide.backgroundDataUrl && hasMockup);



  useEffect(() => {

    setMockupColor(normalizeMockupFrameColor(slide.mockupColor ?? DEFAULT_MOCKUP_FRAME_COLOR));

  }, [slide.mockupColor, slide.slideNumber]);

  useEffect(() => {
    setMockupPose(normalizeMockupPose(slide.mockupPose, slide.slideNumber));
  }, [slide.mockupPose, slide.slideNumber]);

  useEffect(() => {
    setMockupAssetId(normalizeMockupAssetId(slide.mockupAssetId ?? DEFAULT_MOCKUP_ASSET_ID));
  }, [slide.mockupAssetId, slide.slideNumber]);



  const customHex = mockupColor.startsWith("#") ? mockupColor : null;



  return (

    <article className={`pf-export-slide-card glass-panel ${isStreaming || isRegenerating ? "is-streaming" : ""}`}>

      <div className="pf-export-slide-frame" style={{ aspectRatio }}>

        {slide.dataUrl ? (

          <img
            key={slide.renderVersion ?? slide.slideNumber}
            src={slide.dataUrl}
            alt={`${slide.headline} app store slide`}
          />

        ) : (

          <div className="pf-export-slide-placeholder">

            <Sparkles aria-hidden="true" />

            <span>Dynamic layout</span>

          </div>

        )}



        <div className="pf-export-slide-hover">

          <button type="button" className="pf-export-hover-btn" onClick={() => onCopyHeadline(slide.headline)} title="Copy headline">

            <Copy aria-hidden="true" />

          </button>

          <button type="button" className="pf-export-hover-btn" onClick={() => onDownload(slide)} title="Download full slide PNG">

            <Download aria-hidden="true" />

          </button>

          {canDownloadMockupOnly && onDownloadMockupOnly ? (
            <button
              type="button"
              className="pf-export-hover-btn"
              onClick={() => void onDownloadMockupOnly(slide)}
              title="Download mockup only (transparent PNG)"
            >
              <Smartphone aria-hidden="true" />
            </button>
          ) : null}

          {slide.backgroundDataUrl && onDownloadBackgroundOnly ? (
            <button
              type="button"
              className="pf-export-hover-btn"
              onClick={() => void onDownloadBackgroundOnly(slide)}
              title="Download background only (PNG)"
            >
              <Image aria-hidden="true" />
            </button>
          ) : null}

          <span className="pf-export-hover-label">Quick actions</span>

        </div>

      </div>



      <div className="pf-export-slide-meta">

        <span className="pf-export-slide-index">

          {String(slide.slideNumber).padStart(2, "0")} · {slideLabel}

        </span>

        <span className="slide-badge">Slide {slide.slideNumber}</span>

        <span className="role-badge">{slide.role}</span>

      </div>



      <p className="pf-export-slide-headline">{slide.headline}</p>

      <p className="pf-export-slide-sub">{slide.subheadline}</p>



      {slide.variants && slide.variants.length > 1 ? (

        <div className="variant-picker">

          <span className="field-label">Pick best variant</span>

          <div className="variant-picker-row">

            {slide.variants.map((variant) => (

              <button

                key={variant.id}

                type="button"

                className={slide.selectedVariantId === variant.id ? "variant-thumb active" : "variant-thumb"}

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

        <button className="slide-action slide-action-download" type="button" onClick={() => onDownload(slide)}>

          Download slide

        </button>

        {canDownloadMockupOnly && onDownloadMockupOnly ? (
          <button
            className="slide-action slide-action-mockup-only"
            type="button"
            onClick={() => void onDownloadMockupOnly(slide)}
          >
            Download mockup only
          </button>
        ) : null}

        {slide.backgroundDataUrl && onDownloadBackgroundOnly ? (
          <button
            className="slide-action slide-action-background-only"
            type="button"
            onClick={() => void onDownloadBackgroundOnly(slide)}
          >
            Download background
          </button>
        ) : null}

        {canLiveEdit ? (
          <button
            className="slide-action slide-action-live-edit"
            type="button"
            disabled={isGenerating}
            onClick={() => onOpenLiveEditor?.(slide)}
          >
            Edit live
          </button>
        ) : null}

        {onRegenerateSlide ? (

          <div className="slide-action-refine">

            <span className="slide-action-refine-label">Refine slide</span>

            <div className="slide-action-composite-block">

              <span className="field-label">Mockup color</span>

              <div className="mockup-color-row" role="group" aria-label="Mockup frame color">

                {MOCKUP_FRAME_PRESETS.map((preset) => {

                  const selected = mockupColor === preset.id;

                  return (

                    <button

                      key={preset.id}

                      type="button"

                      className={selected ? "mockup-color-swatch active" : "mockup-color-swatch"}

                      style={{ background: preset.color }}

                      title={preset.label}

                      aria-label={preset.label}

                      aria-pressed={selected}

                      disabled={isGenerating}

                      onClick={() => setMockupColor(preset.id)}

                    />

                  );

                })}

                <label className="mockup-color-custom" title="Custom color">

                  <span className="sr-only">Custom mockup color</span>

                  <input

                    type="color"

                    value={customHex ?? presetSwatchColor(mockupColor)}

                    disabled={isGenerating}

                    onChange={(event) => setMockupColor(event.target.value.toLowerCase())}

                  />

                </label>

              </div>

              {showMockupControls ? (
                <>
                  <span className="field-label">Mockup layout</span>
                  <MockupPoseControls
                    pose={mockupPose}
                    disabled={isGenerating}
                    compact
                    onChange={setMockupPose}
                  />
                </>
              ) : null}

              <MockupAssetSelector
                value={mockupAssetId}
                disabled={isGenerating}
                onChange={setMockupAssetId}
              />

              <button

                className="slide-action slide-action-composite"

                type="button"

                onClick={() =>
                  onRegenerateSlide(slide.slideNumber, "composite", {
                    mockupColor,
                    mockupPose,
                    mockupAssetId,
                  })
                }

                disabled={isGenerating || !canComposite}

              >

                Composite only

              </button>

            </div>

            <div className="slide-action-grid">

              <button

                className="slide-action slide-action-background"

                type="button"

                onClick={() =>
                  onRegenerateSlide(slide.slideNumber, "background", {
                    mockupColor,
                    mockupPose,
                    mockupAssetId,
                  })
                }

                disabled={isGenerating}

              >

                New background

              </button>

              <button

                className="slide-action slide-action-full"

                type="button"

                onClick={() => onRegenerateSlide(slide.slideNumber, "full")}

                disabled={isGenerating}

              >

                Full regen

              </button>

            </div>

          </div>

        ) : null}

      </div>

    </article>

  );

}
