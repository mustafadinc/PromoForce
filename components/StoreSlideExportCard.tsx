"use client";



import { useEffect, useState } from "react";

import { Copy, Download, Sparkles } from "lucide-react";

import type { GeneratedSlide, StoreSlideRegenerateMode, StoreSlideRegenerateOptions } from "@/lib/campaignTypes";

import {

  DEFAULT_MOCKUP_FRAME_COLOR,

  MOCKUP_FRAME_PRESETS,

  normalizeMockupFrameColor,

  presetSwatchColor,

  type MockupFrameColor,

} from "@/lib/mockupFrameColors";



type StoreSlideExportCardProps = {

  slide: GeneratedSlide;

  aspectRatio: string;

  isGenerating: boolean;

  isRegenerating?: boolean;

  isStreaming?: boolean;

  onDownload: (slide: GeneratedSlide) => void;

  onCopyHeadline: (text: string) => void;

  onRegenerateSlide?: (

    slideNumber: number,

    mode?: StoreSlideRegenerateMode,

    options?: StoreSlideRegenerateOptions,

  ) => void;

  onSelectVariant?: (slideNumber: number, variantId: string) => void;

};



const SLIDE_LABELS = ["Hero", "Analytics", "Social", "Devices", "CTA"];



export function StoreSlideExportCard({

  slide,

  aspectRatio,

  isGenerating,

  isRegenerating = false,

  isStreaming = false,

  onDownload,

  onCopyHeadline,

  onRegenerateSlide,

  onSelectVariant,

}: StoreSlideExportCardProps) {

  const slideLabel = SLIDE_LABELS[slide.slideNumber - 1] || `Slide ${slide.slideNumber}`;

  const [mockupColor, setMockupColor] = useState<MockupFrameColor>(

    normalizeMockupFrameColor(slide.mockupColor ?? DEFAULT_MOCKUP_FRAME_COLOR),

  );



  useEffect(() => {

    setMockupColor(normalizeMockupFrameColor(slide.mockupColor ?? DEFAULT_MOCKUP_FRAME_COLOR));

  }, [slide.mockupColor, slide.slideNumber]);



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

          <button type="button" className="pf-export-hover-btn" onClick={() => onDownload(slide)} title="Download PNG">

            <Download aria-hidden="true" />

          </button>

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

          Download PNG

        </button>

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

              <button

                className="slide-action slide-action-composite"

                type="button"

                onClick={() => onRegenerateSlide(slide.slideNumber, "composite", { mockupColor })}

                disabled={isGenerating || !slide.backgroundDataUrl}

              >

                Composite only

              </button>

            </div>

            <div className="slide-action-grid">

              <button

                className="slide-action slide-action-background"

                type="button"

                onClick={() => onRegenerateSlide(slide.slideNumber, "background")}

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

