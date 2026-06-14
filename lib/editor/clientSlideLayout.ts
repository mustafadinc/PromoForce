import { computeAsoTextLayout } from "@/lib/asoTextLayout";
import type { LockedTypography, SlideEditorTextBlockId, SlideEditorTextStyles, StoreSlidePlan, StrategyBrief } from "@/lib/campaignTypes";
import { getCompositeLayoutProfile, layoutScale } from "@/lib/compositeLayoutProfile";
import type { LocaleCode } from "@/lib/locales";
import { editorFontFamily } from "@/lib/editor/loadEditorFonts";
import { applyTextBlockStyle } from "@/lib/editor/textBlockStyles";

export type ClientTextSegment = {
  id: string;
  blockId: SlideEditorTextBlockId;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fill: string;
  align: "center" | "left";
  width?: number;
  gradient?: { start: string; end: string };
  opacity?: number;
  fontStyle?: string;
  editField?: "headlineVerb" | "headlineDescriptor" | "subheadline";
  defaultUseGradient?: boolean;
};
export type ClientTextLayer = {
  segments: ClientTextSegment[];
  headlineSegments: ClientTextSegment[];
  subSegments: ClientTextSegment[];
  textAnchorX: number;
  textBlockBottom: number;
  scrimHeight: number;
  accentColor: string;
  fontFamily: string;
};

export type ClientSlideLayoutInput = {
  width: number;
  height: number;
  slidePlan: StoreSlidePlan;
  strategy: StrategyBrief;
  locale?: LocaleCode;
  lockedTypography?: LockedTypography;
  textOffsets?: { headlineOffsetX?: number; headlineOffsetY?: number; subOffsetX?: number; subOffsetY?: number };
  textStyles?: SlideEditorTextStyles;
  overrides?: {    headlineVerb?: string;
    headlineDescriptor?: string;
    subheadline?: string;
    headlineAccent?: string;
  };
};

function buildHeadlineFromParts(verb: string, descriptor: string) {
  return [verb.trim(), descriptor.trim()].filter(Boolean).join(" ");
}

export function resolveEditorCopy(input: ClientSlideLayoutInput) {
  const verb = input.overrides?.headlineVerb ?? input.slidePlan.headlineVerb;
  const descriptor = input.overrides?.headlineDescriptor ?? input.slidePlan.headlineDescriptor;
  const subheadline = input.overrides?.subheadline ?? input.slidePlan.subheadline;
  const headlineAccent = input.overrides?.headlineAccent ?? input.slidePlan.headlineAccent;
  const headline = buildHeadlineFromParts(verb, descriptor) || input.slidePlan.headline;
  return { verb, descriptor, subheadline, headlineAccent, headline };
}

function styleSegment(
  segment: ClientTextSegment,
  textStyles: SlideEditorTextStyles | undefined,
  accentColor: string,
): ClientTextSegment {
  const styled = applyTextBlockStyle(segment, textStyles?.[segment.blockId], {
    gradientEnd: "#38bdf8",
    defaultUseGradient: segment.defaultUseGradient,
  });
  return { ...segment, ...styled };
}

export function computeClientTextLayer(input: ClientSlideLayoutInput): ClientTextLayer {
  const { verb, descriptor, subheadline, headlineAccent, headline } = resolveEditorCopy(input);
  const isCta = input.slidePlan.asoBeat === "download_cta";
  const profile = getCompositeLayoutProfile(input.width, input.height);
  const scale = layoutScale(input.width, input.height, profile);
  const fontFamily = editorFontFamily(input.locale ?? input.strategy.locale);
  const accentColor = input.strategy.accentColor || input.strategy.brandColor || "#6366f1";

  const layout = computeAsoTextLayout(
    headline,
    subheadline,
    verb,
    descriptor,
    input.width,
    input.height,
    isCta,
    input.lockedTypography,
    Boolean(input.slidePlan.showAppBranding && !isCta && profile.format === "app_store"),
    input.locale ?? input.strategy.locale,
  );

  const anchorX = layout.textAnchorX;
  const headlineSegments: ClientTextSegment[] = [];
  const subSegments: ClientTextSegment[] = [];
  let y = layout.textTopY;

  layout.verbLines.forEach((line, index) => {
    headlineSegments.push(
      styleSegment(
        {
          id: `verb-${index}`,
          blockId: "verb",
          text: line,
          x: anchorX,
          y,
          fontSize: layout.verbSize,
          fill: accentColor,
          align: layout.textAnchor === "middle" ? "center" : "left",
          width: input.width * profile.textSafeWidthRatio,
          gradient: { start: accentColor, end: "#38bdf8" },
          fontStyle: "900",
          defaultUseGradient: true,
          editField: index === 0 ? "headlineVerb" : undefined,
        },
        input.textStyles,
        accentColor,
      ),
    );
    y += Math.round(layout.verbSize * 1.05);
  });

  const accentPhrase =
    headlineAccent.trim() ||
    layout.descriptorLines[0]?.split(/\s+/).slice(-2).join(" ") ||
    "";

  layout.descriptorLines.forEach((line, index) => {
    const idx = accentPhrase ? line.toLowerCase().indexOf(accentPhrase.toLowerCase()) : -1;
    if (idx === -1 || !accentPhrase) {
      headlineSegments.push(
        styleSegment(
          {
            id: `desc-${index}`,
            blockId: "descriptor",
            text: line,
            x: anchorX,
            y,
            fontSize: layout.descriptorSize,
            fill: "#ffffff",
            align: layout.textAnchor === "middle" ? "center" : "left",
            width: input.width * profile.textSafeWidthRatio,
            fontStyle: "900",
            editField: index === 0 ? "headlineDescriptor" : undefined,
          },
          input.textStyles,
          accentColor,
        ),
      );
    } else {
      const before = line.slice(0, idx);
      const accent = line.slice(idx, idx + accentPhrase.length);
      const after = line.slice(idx + accentPhrase.length);
      if (before) {
        headlineSegments.push(
          styleSegment(
            {
              id: `desc-${index}-before`,
              blockId: "descriptor",
              text: before,
              x: anchorX,
              y,
              fontSize: layout.descriptorSize,
              fill: "#ffffff",
              align: layout.textAnchor === "middle" ? "center" : "left",
              width: input.width * profile.textSafeWidthRatio,
              fontStyle: "900",
            },
            input.textStyles,
            accentColor,
          ),
        );
      }
      if (accent) {
        headlineSegments.push(
          styleSegment(
            {
              id: `desc-${index}-accent`,
              blockId: "accent",
              text: accent,
              x: anchorX,
              y,
              fontSize: layout.descriptorSize,
              fill: accentColor,
              align: layout.textAnchor === "middle" ? "center" : "left",
              width: input.width * profile.textSafeWidthRatio,
              gradient: { start: accentColor, end: "#38bdf8" },
              fontStyle: "900",
              defaultUseGradient: true,
              editField: index === 0 ? "headlineDescriptor" : undefined,
            },
            input.textStyles,
            accentColor,
          ),
        );
      }
      if (after) {
        headlineSegments.push(
          styleSegment(
            {
              id: `desc-${index}-after`,
              blockId: "descriptor",
              text: after,
              x: anchorX,
              y,
              fontSize: layout.descriptorSize,
              fill: "#ffffff",
              align: layout.textAnchor === "middle" ? "center" : "left",
              width: input.width * profile.textSafeWidthRatio,
              fontStyle: "900",
            },
            input.textStyles,
            accentColor,
          ),
        );
      }
    }
    y += Math.round(layout.descriptorSize * 1.15);
  });

  if (layout.descriptorLines.length && layout.subLines.length) {
    y += Math.round(layout.descriptorSize * 0.42);
  } else if (layout.verbLines.length && layout.subLines.length) {
    y += Math.round(layout.verbSize * 0.28);
  }

  layout.subLines.forEach((line, index) => {
    subSegments.push(
      styleSegment(
        {
          id: `sub-${index}`,
          blockId: "sub",
          text: line,
          x: anchorX,
          y: y + index * Math.round(layout.subSize * 1.28),
          fontSize: layout.subSize,
          fill: accentColor,
          align: layout.textAnchor === "middle" ? "center" : "left",
          width: input.width * profile.textSafeWidthRatio * 0.95,
          opacity: 0.78,
          fontStyle: "700",
          editField: index === 0 ? "subheadline" : undefined,
        },
        input.textStyles,
        accentColor,
      ),
    );
  });

  const segments = [...headlineSegments, ...subSegments];

  const captionBandH = Math.min(layout.textBlockBottom + Math.round(24 * scale), Math.round(input.height * 0.34));
  const scrimHeight = Math.max(
    layout.fadeHeight,
    captionBandH + Math.round(32 * scale),
  );

  return {
    segments,
    headlineSegments,
    subSegments,
    textAnchorX: anchorX,
    textBlockBottom: layout.textBlockBottom,
    scrimHeight,
    accentColor,
    fontFamily,
  };
}
