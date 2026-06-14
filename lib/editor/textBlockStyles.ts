import type { SlideEditorTextBlockId, SlideEditorTextBlockStyle, SlideEditorTextStyles } from "@/lib/campaignTypes";

export function migrateTextStyles(
  styles: SlideEditorTextStyles | undefined,
  legacy?: { headlineOffsetX?: number; headlineOffsetY?: number; subOffsetX?: number; subOffsetY?: number },
): SlideEditorTextStyles {
  const next: SlideEditorTextStyles = { ...(styles ?? {}) };
  if (legacy?.headlineOffsetX || legacy?.headlineOffsetY) {
    next.verb = {
      ...next.verb,
      offsetX: (next.verb?.offsetX ?? 0) + (legacy.headlineOffsetX ?? 0),
      offsetY: (next.verb?.offsetY ?? 0) + (legacy.headlineOffsetY ?? 0),
    };
    next.descriptor = {
      ...next.descriptor,
      offsetX: (next.descriptor?.offsetX ?? 0) + (legacy.headlineOffsetX ?? 0),
      offsetY: (next.descriptor?.offsetY ?? 0) + (legacy.headlineOffsetY ?? 0),
    };
    next.accent = {
      ...next.accent,
      offsetX: (next.accent?.offsetX ?? 0) + (legacy.headlineOffsetX ?? 0),
      offsetY: (next.accent?.offsetY ?? 0) + (legacy.headlineOffsetY ?? 0),
    };
  }
  if (legacy?.subOffsetX || legacy?.subOffsetY) {
    next.sub = {
      ...next.sub,
      offsetX: (next.sub?.offsetX ?? 0) + (legacy.subOffsetX ?? 0),
      offsetY: (next.sub?.offsetY ?? 0) + (legacy.subOffsetY ?? 0),
    };
  }
  return next;
}

export function applyTextBlockStyle(
  segment: {
    fill: string;
    gradient?: { start: string; end: string };
    opacity?: number;
  },
  style?: SlideEditorTextBlockStyle,
  defaults?: { gradientEnd?: string; defaultUseGradient?: boolean },
) {
  if (!style) return segment;
  const next = { ...segment };
  if (style.color) {
    next.fill = style.color;
    const useGradient = style.useGradient ?? defaults?.defaultUseGradient ?? false;
    if (useGradient) {
      next.gradient = {
        start: style.color,
        end: style.gradientEnd ?? defaults?.gradientEnd ?? "#38bdf8",
      };
    } else {
      next.gradient = undefined;
    }
  }
  if (style.opacity !== undefined) {
    next.opacity = style.opacity;
  }
  return next;
}

export function blockOffset(styles: SlideEditorTextStyles | undefined, block: SlideEditorTextBlockId) {
  return {
    x: styles?.[block]?.offsetX ?? 0,
    y: styles?.[block]?.offsetY ?? 0,
  };
}

export const TEXT_BLOCK_LABELS: Record<SlideEditorTextBlockId, string> = {
  verb: "Headline verb",
  descriptor: "Descriptor",
  accent: "Accent highlight",
  sub: "Subheadline",
  branding: "App branding",
};
