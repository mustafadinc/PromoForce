"use client";



import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import { Copy, Download, Image, Smartphone, Sparkles } from "lucide-react";

import { MockupPoseControls } from "@/components/MockupPoseControls";
import { MockupAssetSelector } from "@/components/MockupAssetSelector";
import type {
  GeneratedSlide,
  MockupAssetId,
  MockupPose,
  ScreenshotUsage,
  SlideLayoutStyle,
  SlideRole,
  StoreSlideBeat,
  StoreSlidePlan,
  StoreSlideRegenerateMode,
  StoreSlideRegenerateOptions,
} from "@/lib/campaignTypes";
import { getBeatForSlide, storeSlideBeatMeta } from "@/lib/storeSetAsoFramework";
import { APP_STORE_GENERATION_HEIGHT, APP_STORE_GENERATION_WIDTH } from "@/lib/appStoreImageSizes";
import { computeLockedTypographyFromHeadline } from "@/lib/asoTextLayout";

import {

  DEFAULT_MOCKUP_FRAME_COLOR,

  MOCKUP_FRAME_PRESETS,

  normalizeMockupFrameColor,

  presetSwatchColor,

  type MockupFrameColor,

} from "@/lib/mockupFrameColors";
import { normalizeMockupPose, phoneHeightRatioForMockupScale } from "@/lib/mockupPose";
import {
  DEFAULT_MOCKUP_ASSET_ID,
  isUnknownMockupAssetId,
  normalizeMockupAssetId,
} from "@/lib/assetMockup";



type StoreSlideExportCardProps = {

  slide: GeneratedSlide;

  slidePlan?: StoreSlidePlan;

  screenshotPreviews?: Array<{ index: number; previewUrl: string }>;

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

  ) => void | Promise<void>;

  onApplyTypographyToAll?: (
    sourceSlideNumber: number,
    options: Pick<StoreSlideRegenerateOptions, "slidePatch" | "mockupColor" | "mockupPose" | "mockupAssetId">,
  ) => void | Promise<void>;

  isApplyingTypographyToAll?: boolean;

  onSelectVariant?: (slideNumber: number, variantId: string) => void;

  onOpenLiveEditor?: (slide: GeneratedSlide) => void;

  hasMockup?: boolean;

  slideCount?: number;

  onDownloadBackgroundOnly?: (slide: GeneratedSlide) => void;

};

const roleOptions: SlideRole[] = ["hero", "feature", "cta"];
const beatOptions: StoreSlideBeat[] = [
  "hook",
  "problem_outcome",
  "feature_benefit",
  "social_proof",
  "download_cta",
];
const screenshotUsageLabels: Record<ScreenshotUsage, string> = {
  hero_mockup: "Hero mockup",
  feature_mockup: "Feature mockup",
  none: "No screenshot",
};
const layoutLabels: Record<SlideLayoutStyle, string> = {
  hero_branded: "Hero + branding",
  lifestyle_focus: "Lifestyle focus",
  feature_pills: "Feature pills",
  cta_minimal: "CTA minimal",
};

function buildHeadline(verb: string, descriptor: string, fallback: string) {
  return [verb.trim(), descriptor.trim()].filter(Boolean).join(" ") || fallback.trim();
}

const defaultHeaderTextColors: Required<NonNullable<NonNullable<StoreSlidePlan["textColors"]>["header"]>> = {
  useGradient: true,
  start: "#0a8bf9",
  end: "#38bdf8",
};

const defaultBenefitTextColors: Required<NonNullable<NonNullable<StoreSlidePlan["textColors"]>["benefit"]>> = {
  useGradient: true,
  start: "#f1f5f9",
  end: "#45e0c0",
};

const defaultSubheaderTextColors: Required<NonNullable<NonNullable<StoreSlidePlan["textColors"]>["subheader"]>> = {
  useGradient: false,
  start: "#f1f5f9",
  end: "#cbd5e1",
};

function normalizeHexColor(value: string | undefined, fallback: string) {
  const color = (value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
}

function clampFontInput(value: number, min = 12, max = 420) {
  if (!Number.isFinite(value)) return min;
  return Math.round(Math.min(max, Math.max(min, value)));
}

function scaleFromFontSize(fontSize: number, baseSize: number) {
  if (!Number.isFinite(baseSize) || baseSize <= 0) return 1;
  return Math.min(2, Math.max(0.55, fontSize / baseSize));
}



export function StoreSlideExportCard({

  slide,

  slidePlan,

  screenshotPreviews = [],

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

  onApplyTypographyToAll,

  onSelectVariant,

  onOpenLiveEditor,

  hasMockup: propsHasMockup,

  slideCount = 5,

  isApplyingTypographyToAll = false,

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
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [quickVerb, setQuickVerb] = useState(slidePlan?.headlineVerb ?? slide.headline);
  const [quickDescriptor, setQuickDescriptor] = useState(slidePlan?.headlineDescriptor ?? "");
  const [quickSubheadline, setQuickSubheadline] = useState(slidePlan?.subheadline ?? slide.subheadline);
  const [quickRole, setQuickRole] = useState<SlideRole>(slidePlan?.role ?? slide.role);
  const [quickBeat, setQuickBeat] = useState<StoreSlideBeat>(beat);
  const [quickUsage, setQuickUsage] = useState<ScreenshotUsage>(slidePlan?.screenshotUsage ?? "none");
  const [quickScreenshotIndex, setQuickScreenshotIndex] = useState<number | null>(
    slidePlan?.screenshotIndex ?? null,
  );
  const [quickLayout, setQuickLayout] = useState<SlideLayoutStyle>(slidePlan?.layoutStyle ?? "lifestyle_focus");
  const [quickVerbScale, setQuickVerbScale] = useState(slidePlan?.typographyScales?.verb ?? 1);
  const [quickDescriptorScale, setQuickDescriptorScale] = useState(slidePlan?.typographyScales?.descriptor ?? 1);
  const [quickSubScale, setQuickSubScale] = useState(slidePlan?.typographyScales?.sub ?? 1);
  const [quickMockupY, setQuickMockupY] = useState(slidePlan?.layoutOffsets?.mockupY ?? 0);
  const [quickVerbY, setQuickVerbY] = useState(slidePlan?.layoutOffsets?.verbY ?? 0);
  const [quickDescriptorY, setQuickDescriptorY] = useState(slidePlan?.layoutOffsets?.descriptorY ?? 0);
  const [quickSubY, setQuickSubY] = useState(slidePlan?.layoutOffsets?.subY ?? 0);
  const [quickHeaderGradient, setQuickHeaderGradient] = useState(
    slidePlan?.textColors?.header?.useGradient ?? defaultHeaderTextColors.useGradient,
  );
  const [quickHeaderStart, setQuickHeaderStart] = useState(
    normalizeHexColor(slidePlan?.textColors?.header?.start, defaultHeaderTextColors.start),
  );
  const [quickHeaderEnd, setQuickHeaderEnd] = useState(
    normalizeHexColor(slidePlan?.textColors?.header?.end, defaultHeaderTextColors.end),
  );
  const [quickBenefitGradient, setQuickBenefitGradient] = useState(
    slidePlan?.textColors?.benefit?.useGradient ??
      slidePlan?.textColors?.header?.useGradient ??
      defaultBenefitTextColors.useGradient,
  );
  const [quickBenefitStart, setQuickBenefitStart] = useState(
    normalizeHexColor(
      slidePlan?.textColors?.benefit?.start ?? slidePlan?.textColors?.header?.start,
      defaultBenefitTextColors.start,
    ),
  );
  const [quickBenefitEnd, setQuickBenefitEnd] = useState(
    normalizeHexColor(
      slidePlan?.textColors?.benefit?.end ?? slidePlan?.textColors?.header?.end,
      defaultBenefitTextColors.end,
    ),
  );
  const [quickSubGradient, setQuickSubGradient] = useState(
    slidePlan?.textColors?.subheader?.useGradient ?? defaultSubheaderTextColors.useGradient,
  );
  const [quickSubStart, setQuickSubStart] = useState(
    normalizeHexColor(slidePlan?.textColors?.subheader?.start, defaultSubheaderTextColors.start),
  );
  const [quickSubEnd, setQuickSubEnd] = useState(
    normalizeHexColor(slidePlan?.textColors?.subheader?.end, defaultSubheaderTextColors.end),
  );

  const quickUsesMockup = quickUsage !== "none";
  const hasMockup = propsHasMockup ?? quickUsesMockup;
  const showMockupControls = hasMockup || quickUsesMockup;
  const hasLegacySceneMockup = isUnknownMockupAssetId(slide.mockupAssetId);
  const canDownloadMockupOnly = Boolean(hasMockup && !hasLegacySceneMockup);
  const canComposite = Boolean(slide.backgroundDataUrl) && (hasMockup || quickUsesMockup) && !hasLegacySceneMockup;
  const canLiveEdit = Boolean(onOpenLiveEditor && slide.backgroundDataUrl && hasMockup);
  const quickHeadline = buildHeadline(quickVerb, quickDescriptor, slidePlan?.headline ?? slide.headline);
  const baseTypography = useMemo(
    () =>
      computeLockedTypographyFromHeadline(
        quickHeadline,
        quickSubheadline,
        quickVerb,
        quickDescriptor,
        APP_STORE_GENERATION_WIDTH,
        APP_STORE_GENERATION_HEIGHT,
        quickBeat === "download_cta",
      ),
    [quickBeat, quickDescriptor, quickHeadline, quickSubheadline, quickVerb],
  );
  const quickVerbFontSize = clampFontInput((baseTypography.verbSize || 100) * quickVerbScale, 12, 620);
  const quickDescriptorFontSize = clampFontInput(
    (baseTypography.descriptorSize || 72) * quickDescriptorScale,
    12,
    620,
  );
  const quickSubFontSize = clampFontInput((baseTypography.subSize || 40) * quickSubScale, 12, 620);
  const verbFontMax = Math.max(240, Math.round((baseTypography.verbSize || 100) * 2));
  const descriptorFontMax = Math.max(180, Math.round((baseTypography.descriptorSize || 72) * 2));
  const subFontMax = Math.max(120, Math.round((baseTypography.subSize || 40) * 2));

  const quickSlidePatch: Partial<StoreSlidePlan> | undefined = slidePlan
    ? {
        headlineVerb: quickVerb,
        headlineDescriptor: quickDescriptor,
        headline: quickHeadline,
        subheadline: quickSubheadline,
        role: quickRole,
        asoBeat: quickBeat,
        screenshotUsage: quickUsage,
        screenshotIndex: quickUsage === "none" ? null : quickScreenshotIndex,
        layoutStyle: quickLayout,
        showAppBranding: quickUsage === "hero_mockup",
        mockupPose,
        mockupAssetId,
        phoneHeightRatio: phoneHeightRatioForMockupScale(mockupPose.scale),
        typographyScales: {
          verb: quickVerbScale,
          descriptor: quickDescriptorScale,
          sub: quickSubScale,
        },
        layoutOffsets: {
          mockupY: quickMockupY,
          verbY: quickVerbY,
          descriptorY: quickDescriptorY,
          subY: quickSubY,
        },
        textColors: {
          header: {
            useGradient: quickHeaderGradient,
            start: quickHeaderStart,
            end: quickHeaderEnd,
          },
          benefit: {
            useGradient: quickBenefitGradient,
            start: quickBenefitStart,
            end: quickBenefitEnd,
          },
          subheader: {
            useGradient: quickSubGradient,
            start: quickSubStart,
            end: quickSubEnd,
          },
        },
      }
    : undefined;



  useEffect(() => {

    setMockupColor(normalizeMockupFrameColor(slide.mockupColor ?? DEFAULT_MOCKUP_FRAME_COLOR));

  }, [slide.mockupColor, slide.slideNumber]);

  useEffect(() => {
    setMockupPose(normalizeMockupPose(slide.mockupPose, slide.slideNumber));
  }, [slide.mockupPose, slide.slideNumber]);

  useEffect(() => {
    setMockupAssetId(normalizeMockupAssetId(slide.mockupAssetId ?? DEFAULT_MOCKUP_ASSET_ID));
  }, [slide.mockupAssetId, slide.slideNumber]);

  useEffect(() => {
    setQuickVerb(slidePlan?.headlineVerb ?? slide.headline);
    setQuickDescriptor(slidePlan?.headlineDescriptor ?? "");
    setQuickSubheadline(slidePlan?.subheadline ?? slide.subheadline);
    setQuickRole(slidePlan?.role ?? slide.role);
    setQuickBeat(slidePlan?.asoBeat ?? beat);
    setQuickUsage(slidePlan?.screenshotUsage ?? "none");
    setQuickScreenshotIndex(slidePlan?.screenshotIndex ?? null);
    setQuickLayout(slidePlan?.layoutStyle ?? "lifestyle_focus");
    setQuickVerbScale(slidePlan?.typographyScales?.verb ?? 1);
    setQuickDescriptorScale(slidePlan?.typographyScales?.descriptor ?? 1);
    setQuickSubScale(slidePlan?.typographyScales?.sub ?? 1);
    setQuickMockupY(slidePlan?.layoutOffsets?.mockupY ?? 0);
    setQuickVerbY(slidePlan?.layoutOffsets?.verbY ?? 0);
    setQuickDescriptorY(slidePlan?.layoutOffsets?.descriptorY ?? 0);
    setQuickSubY(slidePlan?.layoutOffsets?.subY ?? 0);
    setQuickHeaderGradient(slidePlan?.textColors?.header?.useGradient ?? defaultHeaderTextColors.useGradient);
    setQuickHeaderStart(normalizeHexColor(slidePlan?.textColors?.header?.start, defaultHeaderTextColors.start));
    setQuickHeaderEnd(normalizeHexColor(slidePlan?.textColors?.header?.end, defaultHeaderTextColors.end));
    setQuickBenefitGradient(
      slidePlan?.textColors?.benefit?.useGradient ??
        slidePlan?.textColors?.header?.useGradient ??
        defaultBenefitTextColors.useGradient,
    );
    setQuickBenefitStart(
      normalizeHexColor(
        slidePlan?.textColors?.benefit?.start ?? slidePlan?.textColors?.header?.start,
        defaultBenefitTextColors.start,
      ),
    );
    setQuickBenefitEnd(
      normalizeHexColor(
        slidePlan?.textColors?.benefit?.end ?? slidePlan?.textColors?.header?.end,
        defaultBenefitTextColors.end,
      ),
    );
    setQuickSubGradient(slidePlan?.textColors?.subheader?.useGradient ?? defaultSubheaderTextColors.useGradient);
    setQuickSubStart(normalizeHexColor(slidePlan?.textColors?.subheader?.start, defaultSubheaderTextColors.start));
    setQuickSubEnd(normalizeHexColor(slidePlan?.textColors?.subheader?.end, defaultSubheaderTextColors.end));
  }, [beat, slide.headline, slide.role, slide.slideNumber, slide.subheadline, slidePlan]);



  const customHex = mockupColor.startsWith("#") ? mockupColor : null;
  const buildQuickRegenerateOptions = (): StoreSlideRegenerateOptions => ({
    mockupColor,
    mockupPose,
    mockupAssetId,
    slidePatch: quickSlidePatch,
  });

  const currentTypographyScales: NonNullable<StoreSlidePlan["typographyScales"]> = {
    verb: quickVerbScale,
    descriptor: quickDescriptorScale,
    sub: quickSubScale,
  };
  const currentLayoutOffsets: NonNullable<StoreSlidePlan["layoutOffsets"]> = {
    mockupY: quickMockupY,
    verbY: quickVerbY,
    descriptorY: quickDescriptorY,
    subY: quickSubY,
  };
  const currentTextColors: NonNullable<StoreSlidePlan["textColors"]> = {
    header: {
      useGradient: quickHeaderGradient,
      start: quickHeaderStart,
      end: quickHeaderEnd,
    },
    benefit: {
      useGradient: quickBenefitGradient,
      start: quickBenefitStart,
      end: quickBenefitEnd,
    },
    subheader: {
      useGradient: quickSubGradient,
      start: quickSubStart,
      end: quickSubEnd,
    },
  };

  const handleCustomBackgroundUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onRegenerateSlide) return;

    const reader = new FileReader();
    reader.onload = () => {
      onRegenerateSlide(slide.slideNumber, "composite", {
        ...buildQuickRegenerateOptions(),
        customBackgroundDataUrl: String(reader.result ?? ""),
      });
    };
    reader.readAsDataURL(file);
  };



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

            {slidePlan ? (
              <div className="pf-quick-slide-edit">
                <button
                  type="button"
                  className="secondary-action compact-action"
                  onClick={() => setQuickEditOpen((open) => !open)}
                  disabled={isGenerating}
                >
                  {quickEditOpen ? "Hide quick edit" : "Quick edit"}
                </button>
                {quickEditOpen ? (
                  <div className="pf-quick-slide-fields">
                    <label className="field">
                      <span>Action verb</span>
                      <input
                        type="text"
                        value={quickVerb}
                        onChange={(event) => setQuickVerb(event.target.value)}
                        disabled={isGenerating}
                      />
                    </label>
                    <label className="field">
                      <span>Descriptor</span>
                      <input
                        type="text"
                        value={quickDescriptor}
                        onChange={(event) => setQuickDescriptor(event.target.value)}
                        disabled={isGenerating}
                      />
                    </label>
                    <label className="field pf-quick-field-wide">
                      <span>Subheadline</span>
                      <textarea
                        rows={2}
                        value={quickSubheadline}
                        onChange={(event) => setQuickSubheadline(event.target.value)}
                        disabled={isGenerating}
                      />
                    </label>
                    <label className="field">
                      <span>Role</span>
                      <select
                        value={quickRole}
                        onChange={(event) => setQuickRole(event.target.value as SlideRole)}
                        disabled={isGenerating}
                      >
                        {roleOptions.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Beat</span>
                      <select
                        value={quickBeat}
                        onChange={(event) => setQuickBeat(event.target.value as StoreSlideBeat)}
                        disabled={isGenerating}
                      >
                        {beatOptions.map((value) => (
                          <option key={value} value={value}>
                            {storeSlideBeatMeta[value].label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Screenshot</span>
                      <select
                        value={quickUsage}
                        onChange={(event) => {
                          const usage = event.target.value as ScreenshotUsage;
                          setQuickUsage(usage);
                          if (usage !== "none" && quickScreenshotIndex === null) {
                            setQuickScreenshotIndex(screenshotPreviews[0]?.index ?? 0);
                          }
                        }}
                        disabled={isGenerating}
                      >
                        {Object.entries(screenshotUsageLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Screen</span>
                      <select
                        value={quickScreenshotIndex ?? ""}
                        onChange={(event) =>
                          setQuickScreenshotIndex(event.target.value === "" ? null : Number(event.target.value))
                        }
                        disabled={isGenerating || quickUsage === "none" || screenshotPreviews.length === 0}
                      >
                        <option value="">None</option>
                        {screenshotPreviews.map((shot) => (
                          <option key={shot.index} value={shot.index}>
                            Screen {shot.index + 1}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Layout</span>
                      <select
                        value={quickLayout}
                        onChange={(event) => setQuickLayout(event.target.value as SlideLayoutStyle)}
                        disabled={isGenerating}
                      >
                        {Object.entries(layoutLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="slide-action-composite-block">
              {slidePlan ? (
                <div className="pf-quick-slide-fields">
                  <label className="field">
                    <span>Action verb font size</span>
                    <input
                      type="number"
                      min="12"
                      max={verbFontMax}
                      step="1"
                      value={quickVerbFontSize}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isFinite(next)) return;
                        setQuickVerbScale(scaleFromFontSize(clampFontInput(next, 12, verbFontMax), baseTypography.verbSize));
                      }}
                      disabled={isGenerating}
                    />
                  </label>
                  <label className="field">
                    <span>Benefit font size</span>
                    <input
                      type="number"
                      min="12"
                      max={descriptorFontMax}
                      step="1"
                      value={quickDescriptorFontSize}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isFinite(next)) return;
                        setQuickDescriptorScale(
                          scaleFromFontSize(clampFontInput(next, 12, descriptorFontMax), baseTypography.descriptorSize),
                        );
                      }}
                      disabled={isGenerating}
                    />
                  </label>
                  <label className="field">
                    <span>Subheadline font size</span>
                    <input
                      type="number"
                      min="12"
                      max={subFontMax}
                      step="1"
                      value={quickSubFontSize}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isFinite(next)) return;
                        setQuickSubScale(scaleFromFontSize(clampFontInput(next, 12, subFontMax), baseTypography.subSize));
                      }}
                      disabled={isGenerating}
                    />
                  </label>
                  <label className="field">
                    <span>Mockup vertical {Math.round(quickMockupY)}px</span>
                    <input
                      type="range"
                      min="-360"
                      max="360"
                      step="10"
                      value={quickMockupY}
                      onChange={(event) => setQuickMockupY(Number(event.target.value))}
                      disabled={isGenerating}
                    />
                  </label>
                  <label className="field">
                    <span>Action verb vertical {Math.round(quickVerbY)}px</span>
                    <input
                      type="range"
                      min="-240"
                      max="240"
                      step="10"
                      value={quickVerbY}
                      onChange={(event) => setQuickVerbY(Number(event.target.value))}
                      disabled={isGenerating}
                    />
                  </label>
                  <label className="field">
                    <span>Descriptor vertical {Math.round(quickDescriptorY)}px</span>
                    <input
                      type="range"
                      min="-240"
                      max="240"
                      step="10"
                      value={quickDescriptorY}
                      onChange={(event) => setQuickDescriptorY(Number(event.target.value))}
                      disabled={isGenerating}
                    />
                  </label>
                  <label className="field">
                    <span>Subheadline vertical {Math.round(quickSubY)}px</span>
                    <input
                      type="range"
                      min="-240"
                      max="240"
                      step="10"
                      value={quickSubY}
                      onChange={(event) => setQuickSubY(Number(event.target.value))}
                      disabled={isGenerating}
                    />
                  </label>
                  <label className="field">
                    <span>Action verb gradient</span>
                    <input
                      type="checkbox"
                      checked={quickHeaderGradient}
                      onChange={(event) => setQuickHeaderGradient(event.target.checked)}
                      disabled={isGenerating}
                    />
                  </label>
                  <label className="field">
                    <span>Action verb start</span>
                    <input
                      type="color"
                      value={quickHeaderStart}
                      onChange={(event) => setQuickHeaderStart(event.target.value.toLowerCase())}
                      disabled={isGenerating}
                    />
                  </label>
                  <label className="field">
                    <span>Action verb end</span>
                    <input
                      type="color"
                      value={quickHeaderEnd}
                      onChange={(event) => setQuickHeaderEnd(event.target.value.toLowerCase())}
                      disabled={isGenerating || !quickHeaderGradient}
                    />
                  </label>
                  <label className="field">
                    <span>Benefit gradient</span>
                    <input
                      type="checkbox"
                      checked={quickBenefitGradient}
                      onChange={(event) => setQuickBenefitGradient(event.target.checked)}
                      disabled={isGenerating}
                    />
                  </label>
                  <label className="field">
                    <span>Benefit start</span>
                    <input
                      type="color"
                      value={quickBenefitStart}
                      onChange={(event) => setQuickBenefitStart(event.target.value.toLowerCase())}
                      disabled={isGenerating}
                    />
                  </label>
                  <label className="field">
                    <span>Benefit end</span>
                    <input
                      type="color"
                      value={quickBenefitEnd}
                      onChange={(event) => setQuickBenefitEnd(event.target.value.toLowerCase())}
                      disabled={isGenerating || !quickBenefitGradient}
                    />
                  </label>
                  <label className="field">
                    <span>Subheader gradient</span>
                    <input
                      type="checkbox"
                      checked={quickSubGradient}
                      onChange={(event) => setQuickSubGradient(event.target.checked)}
                      disabled={isGenerating}
                    />
                  </label>
                  <label className="field">
                    <span>Subheader start</span>
                    <input
                      type="color"
                      value={quickSubStart}
                      onChange={(event) => setQuickSubStart(event.target.value.toLowerCase())}
                      disabled={isGenerating}
                    />
                  </label>
                  <label className="field">
                    <span>Subheader end</span>
                    <input
                      type="color"
                      value={quickSubEnd}
                      onChange={(event) => setQuickSubEnd(event.target.value.toLowerCase())}
                      disabled={isGenerating || !quickSubGradient}
                    />
                  </label>
                  {onApplyTypographyToAll ? (
                    <button
                      type="button"
                      className="secondary-action compact-action"
                      onClick={() =>
                        onApplyTypographyToAll(slide.slideNumber, {
                          mockupColor,
                          mockupPose,
                          mockupAssetId,
                          slidePatch: {
                            typographyScales: currentTypographyScales,
                            layoutOffsets: currentLayoutOffsets,
                            textColors: currentTextColors,
                            mockupPose,
                            mockupAssetId,
                            phoneHeightRatio: phoneHeightRatioForMockupScale(mockupPose.scale),
                          },
                        })
                      }
                      disabled={isGenerating || isApplyingTypographyToAll}
                    >
                      {isApplyingTypographyToAll ? "Applying layout..." : "Apply layout to all"}
                    </button>
                  ) : null}
                </div>
              ) : null}

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
                    ...buildQuickRegenerateOptions(),
                  })
                }

                disabled={isGenerating || !canComposite}

              >

                Composite only

              </button>

              <label className="slide-action slide-action-custom-background">
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={isGenerating || !(hasMockup || quickUsesMockup) || hasLegacySceneMockup}
                  onChange={handleCustomBackgroundUpload}
                />
                Upload bg + composite
              </label>

            </div>

            <div className="slide-action-grid">

              <button

                className="slide-action slide-action-background"

                type="button"

                onClick={() =>
                  onRegenerateSlide(slide.slideNumber, "background", {
                    ...buildQuickRegenerateOptions(),
                  })
                }

                disabled={isGenerating}

              >

                New background

              </button>

              <button

                className="slide-action slide-action-full"

                type="button"

                onClick={() => onRegenerateSlide(slide.slideNumber, "full", buildQuickRegenerateOptions())}

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
