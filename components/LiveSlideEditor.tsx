"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EyeOff, RotateCcw } from "lucide-react";
import { Circle, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import type Konva from "konva";
import {
  APP_STORE_GENERATION_HEIGHT,
  APP_STORE_GENERATION_WIDTH,
} from "@/lib/appStoreImageSizes";
import type {
  AppProfile,
  GeneratedSlide,
  SlideEditorHiddenLayer,
  SlideEditorState,
  SlideEditorTextBlockId,
  SlideEditorTextBlockStyle,
  StoreSlidePlan,
  StrategyBrief,
} from "@/lib/campaignTypes";
import { SLIDE_EDITOR_STATE_VERSION } from "@/lib/campaignTypes";
import {
  BASE_DEVICE_RENDER_WIDTH,
  buildEditorDeviceCanvas,
  computeDefaultDeviceState,
  createDefaultEditorState,
  deviceStateToPixels,
  pixelsToDeviceState,
} from "@/lib/editor/clientDeviceFrame";
import {
  computeClientTextLayer,
  resolveEditorCopy,
  type ClientTextSegment,
} from "@/lib/editor/clientSlideLayout";
import { computeClientOverlayLayers } from "@/lib/editor/clientSlideOverlays";
import { downloadDataUrl, exportFilename, exportSlidePngFromStage } from "@/lib/editor/exportSlidePng";
import { editorFontFamily, loadEditorFonts } from "@/lib/editor/loadEditorFonts";
import { canvasCenterGuides, snapDragPosition } from "@/lib/editor/snapGuides";
import {
  blockOffset,
  migrateTextStyles,
  TEXT_BLOCK_LABELS,
} from "@/lib/editor/textBlockStyles";
import {
  HIDDEN_LAYER_LABELS,
  isLayerHidden,
  listHiddenLayers,
  setLayerHidden,
} from "@/lib/editor/layerVisibility";
import {
  MOCKUP_FRAME_PRESETS,
  normalizeMockupFrameColor,
  presetSwatchColor,
  type MockupFrameColor,
} from "@/lib/mockupFrameColors";
import { normalizeMockupPose } from "@/lib/mockupPose";
import { DEFAULT_MOCKUP_ASSET_ID, normalizeMockupAssetId } from "@/lib/assetMockup";

const CANVAS_W = APP_STORE_GENERATION_WIDTH;
const CANVAS_H = APP_STORE_GENERATION_HEIGHT;

type LiveSlideEditorProps = {
  slide: GeneratedSlide;
  slidePlan: StoreSlidePlan;
  strategy: StrategyBrief;
  appProfile?: AppProfile | null;
  screenshotUrl: string | null;
  backgroundUrl: string;
  sourceDataUrl: string;
  onSave: (update: {
    dataUrl: string;
    editorState: SlideEditorState;
    headline: string;
    subheadline: string;
  }) => void;
  onClose: () => void;
  onRevertToOriginal?: () => void;
};

type InlineEditState = {
  field: "headlineVerb" | "headlineDescriptor" | "subheadline";
  value: string;
  left: number;
  top: number;
  width: number;
  fontSize: number;
};

function useKonvaImage(src: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!cancelled) setImage(img);
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  return image;
}

function migrateEditorState(state: SlideEditorState): SlideEditorState {
  const textStyles = migrateTextStyles(state.textStyles, state.text);
  if (state.overlays?.brandingOffsetX || state.overlays?.brandingOffsetY) {
    textStyles.branding = {
      ...textStyles.branding,
      offsetX: (textStyles.branding?.offsetX ?? 0) + (state.overlays.brandingOffsetX ?? 0),
      offsetY: (textStyles.branding?.offsetY ?? 0) + (state.overlays.brandingOffsetY ?? 0),
    };
  }
  return {
    ...state,
    version: SLIDE_EDITOR_STATE_VERSION,
    overlays: state.overlays ?? {},
    textStyles,
    hiddenLayers: state.hiddenLayers ?? {},
    overrides: state.overrides ?? {},
  };
}

function renderSegmentProps(segment: ClientTextSegment, accentColor: string) {
  const gradientProps = segment.gradient
    ? {
        fillLinearGradientStartPoint: { x: 0, y: 0 },
        fillLinearGradientEndPoint: { x: CANVAS_W * 0.25, y: 0 },
        fillLinearGradientColorStops: [0, segment.gradient.start, 1, segment.gradient.end] as [
          number,
          string,
          number,
          string,
        ],
      }
    : { fill: segment.fill };

  return {
    text: segment.text,
    x: segment.x,
    y: segment.y,
    fontSize: segment.fontSize,
    align: segment.align,
    width: segment.width,
    opacity: segment.opacity ?? 1,
    ...gradientProps,
    shadowColor: "#000",
    shadowBlur: segment.id.startsWith("sub") ? 2 : 5,
    shadowOpacity: segment.id.startsWith("sub") ? 0.35 : 0.55,
    shadowOffsetY: segment.id.startsWith("sub") ? 1 : 2,
  };
}

export function LiveSlideEditor({
  slide,
  slidePlan,
  strategy,
  appProfile = null,
  screenshotUrl,
  backgroundUrl,
  sourceDataUrl,
  onSave,
  onClose,
  onRevertToOriginal,
}: LiveSlideEditorProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const deviceRef = useRef<Konva.Group>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [displayScale, setDisplayScale] = useState(0.35);
  const [ready, setReady] = useState(false);
  const [deviceImage, setDeviceImage] = useState<HTMLCanvasElement | null>(null);
  const [deviceBaseH, setDeviceBaseH] = useState(Math.round(BASE_DEVICE_RENDER_WIDTH * 2.05));
  const [snapGuideX, setSnapGuideX] = useState<number | null>(null);
  const [snapGuideY, setSnapGuideY] = useState<number | null>(null);
  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null);

  const locale = slide.locale ?? strategy.locale;
  const mockupPose = normalizeMockupPose(slide.mockupPose ?? slidePlan.mockupPose, slide.slideNumber);
  const mockupAssetId = normalizeMockupAssetId(
    slide.mockupAssetId ?? slidePlan.mockupAssetId ?? DEFAULT_MOCKUP_ASSET_ID,
  );

  const initialTextLayer = useMemo(
    () =>
      computeClientTextLayer({
        width: CANVAS_W,
        height: CANVAS_H,
        slidePlan,
        strategy,
        locale,
      }),
    [slidePlan, strategy, locale],
  );

  const [editorState, setEditorState] = useState<SlideEditorState>(() => {
    if (slide.editorState?.version) {
      return migrateEditorState(slide.editorState);
    }
    return createDefaultEditorState({
      width: CANVAS_W,
      height: CANVAS_H,
      mockupPose,
      textBlockBottom: initialTextLayer.textBlockBottom,
      frameColor: slide.mockupColor,
      mockupAssetId,
    });
  });

  const [overrides, setOverrides] = useState(() => ({
    headlineVerb: editorState.overrides?.headlineVerb ?? slidePlan.headlineVerb,
    headlineDescriptor: editorState.overrides?.headlineDescriptor ?? slidePlan.headlineDescriptor,
    subheadline: editorState.overrides?.subheadline ?? slidePlan.subheadline,
    headlineAccent: editorState.overrides?.headlineAccent ?? slidePlan.headlineAccent,
  }));

  const backgroundImage = useKonvaImage(backgroundUrl);
  const { guidesX, guidesY } = useMemo(() => canvasCenterGuides(CANVAS_W, CANVAS_H), []);

  const textLayer = useMemo(
    () =>
      computeClientTextLayer({
        width: CANVAS_W,
        height: CANVAS_H,
        slidePlan,
        strategy,
        locale,
        textStyles: editorState.textStyles,
        overrides,
      }),
    [slidePlan, strategy, locale, editorState.textStyles, overrides],
  );

  const overlayLayers = useMemo(
    () =>
      computeClientOverlayLayers({
        width: CANVAS_W,
        height: CANVAS_H,
        slidePlan,
        strategy,
        appProfile,
        locale,
      }),
    [slidePlan, strategy, appProfile, locale],
  );

  const devicePixels = useMemo(
    () => deviceStateToPixels(editorState.device, CANVAS_W, CANVAS_H, BASE_DEVICE_RENDER_WIDTH, deviceBaseH),
    [editorState.device, deviceBaseH],
  );

  const frameColor = normalizeMockupFrameColor(editorState.device.frameColor) as MockupFrameColor;
  const customHex = frameColor.startsWith("#") ? frameColor : null;
  const showDevice = Boolean(screenshotUrl) && slidePlan.asoBeat !== "download_cta";
  const fontFamily = editorFontFamily(locale);

  const pillsOffsetX = editorState.overlays?.pillsOffsetX ?? 0;
  const pillsOffsetY = editorState.overlays?.pillsOffsetY ?? 0;
  const socialOffsetX = editorState.overlays?.socialProofOffsetX ?? 0;
  const socialOffsetY = editorState.overlays?.socialProofOffsetY ?? 0;

  const brandingStyle = editorState.textStyles?.branding;
  const brandingColor = brandingStyle?.color ?? overlayLayers.branding?.accentColor ?? textLayer.accentColor;
  const hiddenLayers = editorState.hiddenLayers;
  const hiddenLayerList = useMemo(() => listHiddenLayers(hiddenLayers), [hiddenLayers]);

  const setLayerVisibility = useCallback((layer: SlideEditorHiddenLayer, hidden: boolean) => {
    setEditorState((prev) => setLayerHidden(prev, layer, hidden));
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const w = host.clientWidth - 24;
      if (w > 0) setDisplayScale(Math.min(0.45, w / CANVAS_W));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadEditorFonts(locale).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    if (!screenshotUrl || !showDevice) {
      setDeviceImage(null);
      return;
    }
    let cancelled = false;
    void buildEditorDeviceCanvas(
      screenshotUrl,
      mockupPose,
      frameColor,
      editorState.device.mockupAssetId ?? mockupAssetId,
    ).then((result) => {
      if (cancelled) return;
      setDeviceImage(result.canvas);
      setDeviceBaseH(result.height);
    });
    return () => {
      cancelled = true;
    };
  }, [screenshotUrl, showDevice, mockupPose, frameColor, editorState.device.mockupAssetId, mockupAssetId]);

  useEffect(() => {
    if (
      !deviceRef.current ||
      !transformerRef.current ||
      !showDevice ||
      isLayerHidden(hiddenLayers, "device")
    ) {
      transformerRef.current?.nodes([]);
      return;
    }
    transformerRef.current.nodes([deviceRef.current]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [deviceImage, showDevice, ready, hiddenLayers]);

  const applySnapDrag = useCallback(
    (node: Konva.Node, anchorBiasX = 0) => {
      const snapped = snapDragPosition(node.x(), node.y(), [0, ...guidesX.map((g) => g - anchorBiasX)], guidesY);
      node.position({ x: snapped.x, y: snapped.y });
      setSnapGuideX(snapped.guideX !== null ? snapped.guideX + anchorBiasX : null);
      setSnapGuideY(snapped.guideY);
    },
    [guidesX, guidesY],
  );

  const syncDeviceFromNode = useCallback(() => {
    const node = deviceRef.current;
    if (!node) return;
    const next = pixelsToDeviceState(
      node.x(),
      node.y(),
      node.scaleX(),
      node.rotation(),
      CANVAS_W,
      CANVAS_H,
      editorState.device.frameColor,
      editorState.device.mockupAssetId,
    );
    setEditorState((prev) => ({ ...prev, device: next }));
  }, [editorState.device.frameColor, editorState.device.mockupAssetId]);

  const updateDeviceField = useCallback((patch: Partial<SlideEditorState["device"]>) => {
    setEditorState((prev) => ({
      ...prev,
      device: { ...prev.device, ...patch },
    }));
  }, []);

  const updateTextBlockStyle = useCallback(
    (blockId: SlideEditorTextBlockId, patch: Partial<SlideEditorTextBlockStyle>) => {
      setEditorState((prev) => ({
        ...prev,
        textStyles: {
          ...prev.textStyles,
          [blockId]: { ...prev.textStyles?.[blockId], ...patch },
        },
      }));
    },
    [],
  );

  const commitTextBlockDrag = useCallback(
    (blockId: SlideEditorTextBlockId, x: number, y: number) => {
      updateTextBlockStyle(blockId, { offsetX: Math.round(x), offsetY: Math.round(y) });
      setSnapGuideX(null);
      setSnapGuideY(null);
    },
    [updateTextBlockStyle],
  );

  const defaultBlockColor = useCallback(
    (blockId: SlideEditorTextBlockId) => {
      const sample = textLayer.segments.find((s) => s.blockId === blockId);
      if (sample?.gradient) return sample.gradient.start;
      if (sample?.fill) return sample.fill;
      if (blockId === "descriptor") return "#ffffff";
      return textLayer.accentColor;
    },
    [textLayer],
  );

  const startInlineEdit = useCallback(
    (segment: ClientTextSegment, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!segment.editField) return;
      const node = e.target as Konva.Text;
      const stage = node.getStage();
      const host = hostRef.current;
      if (!stage || !host) return;
      const box = node.getClientRect({ relativeTo: stage });
      const hostRect = host.getBoundingClientRect();
      const field = segment.editField;
      const current =
        field === "headlineVerb"
          ? overrides.headlineVerb ?? ""
          : field === "headlineDescriptor"
            ? overrides.headlineDescriptor ?? ""
            : overrides.subheadline ?? "";
      setInlineEdit({
        field,
        value: current,
        left: hostRect.left + box.x * displayScale,
        top: hostRect.top + box.y * displayScale,
        width: Math.max(160, (segment.width ?? 280) * displayScale),
        fontSize: Math.max(12, segment.fontSize * displayScale * 0.55),
      });
    },
    [displayScale, overrides.headlineDescriptor, overrides.headlineVerb, overrides.subheadline],
  );

  const commitInlineEdit = useCallback(() => {
    if (!inlineEdit) return;
    setOverrides((prev) => ({ ...prev, [inlineEdit.field]: inlineEdit.value }));
    setInlineEdit(null);
  }, [inlineEdit]);

  const buildEditorStateForSave = useCallback((): SlideEditorState => {
    return {
      ...editorState,
      version: SLIDE_EDITOR_STATE_VERSION,
      overrides,
    };
  }, [editorState, overrides]);

  const handleExport = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    transformerRef.current?.nodes([]);
    setSnapGuideX(null);
    setSnapGuideY(null);
    stage.batchDraw();
    const dataUrl = exportSlidePngFromStage(stage);
    const { headline, subheadline } = resolveEditorCopy({
      width: CANVAS_W,
      height: CANVAS_H,
      slidePlan,
      strategy,
      locale,
      overrides,
    });
    onSave({ dataUrl, editorState: buildEditorStateForSave(), headline, subheadline });
    if (deviceRef.current && showDevice) {
      transformerRef.current?.nodes([deviceRef.current]);
    }
  }, [buildEditorStateForSave, onSave, overrides, showDevice, slidePlan, strategy, locale]);

  const handleDownload = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    transformerRef.current?.nodes([]);
    stage.batchDraw();
    const dataUrl = exportSlidePngFromStage(stage);
    downloadDataUrl(dataUrl, exportFilename(slide.slideNumber));
    if (deviceRef.current && showDevice) {
      transformerRef.current?.nodes([deviceRef.current]);
    }
  }, [showDevice, slide.slideNumber]);

  const handleResetLayout = useCallback(() => {
    const next = createDefaultEditorState({
      width: CANVAS_W,
      height: CANVAS_H,
      mockupPose,
      textBlockBottom: textLayer.textBlockBottom,
      frameColor: slide.mockupColor,
      mockupAssetId,
    });
    setEditorState(next);
    setOverrides({
      headlineVerb: slidePlan.headlineVerb,
      headlineDescriptor: slidePlan.headlineDescriptor,
      subheadline: slidePlan.subheadline,
      headlineAccent: slidePlan.headlineAccent,
    });
  }, [mockupPose, textLayer.textBlockBottom, slide.mockupColor, mockupAssetId, slidePlan]);

  const renderEditableText = (segment: ClientTextSegment) => (
    <Text
      key={segment.id}
      {...renderSegmentProps(segment, textLayer.accentColor)}
      fontFamily={fontFamily}
      fontStyle={segment.fontStyle ?? "900"}
      onDblClick={(e) => startInlineEdit(segment, e)}
      onDblTap={(e) => startInlineEdit(segment, e)}
    />
  );

  const renderTextBlock = (blockId: SlideEditorTextBlockId) => {
    if (isLayerHidden(hiddenLayers, blockId)) return null;
    const segments = textLayer.segments.filter((segment) => segment.blockId === blockId);
    if (!segments.length) return null;
    const off = blockOffset(editorState.textStyles, blockId);
    const anchorBias = blockId === "branding" ? CANVAS_W / 2 : textLayer.textAnchorX;
    return (
      <Group
        key={`text-block-${blockId}`}
        x={off.x}
        y={off.y}
        draggable
        onDragMove={(e) => applySnapDrag(e.target, anchorBias)}
        onDragEnd={(e) => commitTextBlockDrag(blockId, e.target.x(), e.target.y())}
      >
        {segments.map(renderEditableText)}
      </Group>
    );
  };

  const HideLayerButton = ({ layer }: { layer: SlideEditorHiddenLayer }) => (
    <button
      type="button"
      className="pf-layer-hide-btn"
      title={`Remove ${HIDDEN_LAYER_LABELS[layer]}`}
      onClick={() => setLayerVisibility(layer, true)}
    >
      <EyeOff aria-hidden="true" />
      <span>Remove</span>
    </button>
  );

  return (
    <div className="pf-live-editor-overlay" role="dialog" aria-modal="true" aria-label="Live slide editor">
      <div className="pf-live-editor-shell glass-panel">
        <header className="pf-live-editor-header">
          <div>
            <span className="pf-export-eyebrow">Live editor</span>
            <h2>Slide {slide.slideNumber}</h2>
            <p>Drag each text block on canvas. Adjust color and position in the panel.</p>
          </div>
          <div className="pf-live-editor-header-actions">
            <button type="button" className="secondary-action" onClick={handleResetLayout}>
              Reset layout
            </button>
            {onRevertToOriginal && sourceDataUrl ? (
              <button type="button" className="secondary-action" onClick={onRevertToOriginal}>
                Revert to original
              </button>
            ) : null}
            <button type="button" className="secondary-action" onClick={onClose}>
              Close
            </button>
            <button type="button" className="primary-action" onClick={handleDownload}>
              Download PNG
            </button>
            <button type="button" className="primary-action" onClick={handleExport}>
              Apply &amp; save
            </button>
          </div>
        </header>

        <div className="pf-live-editor-body">
          <div className="pf-live-editor-stage-host" ref={hostRef}>
            {ready ? (
              <>
                <Stage
                  ref={stageRef}
                  width={CANVAS_W}
                  height={CANVAS_H}
                  scaleX={displayScale}
                  scaleY={displayScale}
                  className="pf-live-editor-stage"
                >
                  <Layer>
                    {backgroundImage ? (
                      <KonvaImage
                        image={backgroundImage}
                        x={0}
                        y={0}
                        width={CANVAS_W}
                        height={CANVAS_H}
                        listening={false}
                      />
                    ) : (
                      <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="#101018" listening={false} />
                    )}

                    <Rect
                      x={0}
                      y={0}
                      width={CANVAS_W}
                      height={textLayer.scrimHeight}
                      fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                      fillLinearGradientEndPoint={{ x: 0, y: textLayer.scrimHeight }}
                      fillLinearGradientColorStops={[
                        0,
                        "rgba(0,0,0,0.58)",
                        0.45,
                        "rgba(0,0,0,0.32)",
                        0.75,
                        "rgba(0,0,0,0.12)",
                        1,
                        "rgba(0,0,0,0)",
                      ]}
                      listening={false}
                    />

                    {snapGuideX !== null ? (
                      <Line
                        points={[snapGuideX, 0, snapGuideX, CANVAS_H]}
                        stroke="rgba(45,212,191,0.75)"
                        strokeWidth={2}
                        dash={[12, 8]}
                        listening={false}
                      />
                    ) : null}
                    {snapGuideY !== null ? (
                      <Line
                        points={[0, snapGuideY, CANVAS_W, snapGuideY]}
                        stroke="rgba(45,212,191,0.75)"
                        strokeWidth={2}
                        dash={[12, 8]}
                        listening={false}
                      />
                    ) : null}

                    {showDevice && deviceImage && !isLayerHidden(hiddenLayers, "device") ? (
                      <Group
                        ref={deviceRef}
                        x={devicePixels.x}
                        y={devicePixels.y}
                        offsetX={devicePixels.offsetX}
                        offsetY={devicePixels.offsetY}
                        scaleX={devicePixels.width / BASE_DEVICE_RENDER_WIDTH}
                        scaleY={devicePixels.height / deviceBaseH}
                        rotation={devicePixels.rotation}
                        draggable
                        onDragEnd={syncDeviceFromNode}
                        onTransformEnd={syncDeviceFromNode}
                      >
                        <KonvaImage
                          image={deviceImage}
                          width={BASE_DEVICE_RENDER_WIDTH}
                          height={deviceBaseH}
                          shadowColor="#000"
                          shadowBlur={28}
                          shadowOpacity={0.45}
                          shadowOffsetY={12}
                        />
                      </Group>
                    ) : null}

                    {overlayLayers.featurePills && !isLayerHidden(hiddenLayers, "featurePills") ? (
                      <Group
                        x={pillsOffsetX}
                        y={pillsOffsetY}
                        draggable
                        onDragMove={(e) => applySnapDrag(e.target, CANVAS_W / 2)}
                        onDragEnd={(e) => {
                          setEditorState((prev) => ({
                            ...prev,
                            overlays: {
                              ...prev.overlays,
                              pillsOffsetX: e.target.x(),
                              pillsOffsetY: e.target.y(),
                            },
                          }));
                          setSnapGuideX(null);
                          setSnapGuideY(null);
                        }}
                      >
                        {overlayLayers.featurePills.pills.map((pill, index) => (
                          <Group key={`pill-${index}`}>
                            <Rect
                              x={pill.x}
                              y={pill.y}
                              width={pill.width}
                              height={pill.height}
                              cornerRadius={pill.radius}
                              fill="rgba(255,255,255,0.07)"
                              stroke="rgba(255,255,255,0.16)"
                              strokeWidth={1.5}
                            />
                            <Circle
                              x={pill.dotX}
                              y={pill.dotY}
                              radius={pill.dotRadius}
                              fill={overlayLayers.featurePills!.accentColor}
                            />
                            <Text
                              x={pill.textX}
                              y={pill.textY}
                              text={pill.label}
                              fontFamily={fontFamily}
                              fontStyle="700"
                              fontSize={pill.fontSize}
                              fill="#f0f3f8"
                            />
                          </Group>
                        ))}
                      </Group>
                    ) : null}

                    {overlayLayers.socialProof && !isLayerHidden(hiddenLayers, "socialProof") ? (
                      <Group
                        x={socialOffsetX}
                        y={socialOffsetY}
                        draggable
                        onDragMove={(e) => applySnapDrag(e.target, CANVAS_W / 2)}
                        onDragEnd={(e) => {
                          setEditorState((prev) => ({
                            ...prev,
                            overlays: {
                              ...prev.overlays,
                              socialProofOffsetX: e.target.x(),
                              socialProofOffsetY: e.target.y(),
                            },
                          }));
                          setSnapGuideX(null);
                          setSnapGuideY(null);
                        }}
                      >
                        <Rect
                          x={overlayLayers.socialProof.x}
                          y={overlayLayers.socialProof.y}
                          width={overlayLayers.socialProof.width}
                          height={overlayLayers.socialProof.height}
                          cornerRadius={overlayLayers.socialProof.radius}
                          fill="rgba(0,0,0,0.42)"
                          stroke="rgba(255,255,255,0.14)"
                          strokeWidth={1.5}
                        />
                        {overlayLayers.socialProof.rating ? (
                          <Text
                            x={overlayLayers.socialProof.x + overlayLayers.socialProof.width / 2}
                            y={overlayLayers.socialProof.y + overlayLayers.socialProof.pad}
                            text={"★".repeat(Math.min(5, Math.round(overlayLayers.socialProof.rating)))}
                            fontSize={overlayLayers.socialProof.fontSize}
                            fill={overlayLayers.socialProof.accentColor}
                            align="center"
                            width={overlayLayers.socialProof.width}
                          />
                        ) : null}
                        {overlayLayers.socialProof.quote ? (
                          <Text
                            x={overlayLayers.socialProof.x + overlayLayers.socialProof.pad}
                            y={
                              overlayLayers.socialProof.y +
                              overlayLayers.socialProof.pad +
                              (overlayLayers.socialProof.rating ? overlayLayers.socialProof.fontSize * 1.6 : 0)
                            }
                            width={overlayLayers.socialProof.width - overlayLayers.socialProof.pad * 2}
                            text={`"${overlayLayers.socialProof.quote}"`}
                            fontFamily={fontFamily}
                            fontStyle="700"
                            fontSize={overlayLayers.socialProof.fontSize}
                            fill="#f0f3f8"
                          />
                        ) : null}
                        {overlayLayers.socialProof.downloadCount ? (
                          <Text
                            x={overlayLayers.socialProof.x + overlayLayers.socialProof.pad}
                            y={overlayLayers.socialProof.y + overlayLayers.socialProof.height - overlayLayers.socialProof.fontSize * 2.2}
                            text={overlayLayers.socialProof.downloadCount}
                            fontFamily={fontFamily}
                            fontStyle="800"
                            fontSize={Math.round(overlayLayers.socialProof.fontSize * 0.92)}
                            fill={overlayLayers.socialProof.accentColor}
                          />
                        ) : null}
                        {overlayLayers.socialProof.award ? (
                          <Text
                            x={overlayLayers.socialProof.x + overlayLayers.socialProof.pad}
                            y={overlayLayers.socialProof.y + overlayLayers.socialProof.height - overlayLayers.socialProof.fontSize * 1.1}
                            text={`🏆 ${overlayLayers.socialProof.award}`}
                            fontFamily={fontFamily}
                            fontStyle="700"
                            fontSize={Math.round(overlayLayers.socialProof.fontSize * 0.85)}
                            fill="#cbd5e1"
                          />
                        ) : null}
                      </Group>
                    ) : null}

                    {overlayLayers.branding && !isLayerHidden(hiddenLayers, "branding") ? (
                      <Group
                        x={blockOffset(editorState.textStyles, "branding").x}
                        y={blockOffset(editorState.textStyles, "branding").y}
                        draggable
                        onDragMove={(e) => applySnapDrag(e.target, CANVAS_W / 2)}
                        onDragEnd={(e) =>
                          commitTextBlockDrag("branding", e.target.x(), e.target.y())
                        }
                      >
                        <Circle
                          x={overlayLayers.branding.iconX + overlayLayers.branding.iconSize / 2}
                          y={overlayLayers.branding.iconY + overlayLayers.branding.iconSize / 2}
                          radius={overlayLayers.branding.iconSize / 2}
                          stroke={brandingColor}
                          strokeWidth={3}
                        />
                        <Circle
                          x={overlayLayers.branding.iconX + overlayLayers.branding.iconSize / 2}
                          y={overlayLayers.branding.iconY + overlayLayers.branding.iconSize / 2}
                          radius={overlayLayers.branding.iconSize / 4}
                          fill={brandingColor}
                          opacity={0.9}
                        />
                        <Text
                          x={overlayLayers.branding.textX}
                          y={overlayLayers.branding.textY}
                          text={overlayLayers.branding.appName}
                          fontFamily={fontFamily}
                          fontStyle="800"
                          fontSize={overlayLayers.branding.fontSize}
                          fill={brandingStyle?.color ? brandingColor : "#ffffff"}
                          letterSpacing={2}
                        />
                      </Group>
                    ) : null}

                    {(["verb", "descriptor", "accent", "sub"] as SlideEditorTextBlockId[]).map((blockId) =>
                      renderTextBlock(blockId),
                    )}

                    {showDevice && !isLayerHidden(hiddenLayers, "device") ? (
                      <Transformer
                        ref={transformerRef}
                        rotateEnabled
                        enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
                        boundBoxFunc={(oldBox, newBox) => {
                          if (newBox.width < 80 || newBox.height < 120) return oldBox;
                          return newBox;
                        }}
                      />
                    ) : null}
                  </Layer>
                </Stage>

                {inlineEdit ? (
                  <textarea
                    className="pf-live-editor-inline-input"
                    style={{
                      left: inlineEdit.left,
                      top: inlineEdit.top,
                      width: inlineEdit.width,
                      fontSize: inlineEdit.fontSize,
                    }}
                    value={inlineEdit.value}
                    autoFocus
                    onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                    onBlur={commitInlineEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        commitInlineEdit();
                      }
                      if (e.key === "Escape") setInlineEdit(null);
                    }}
                  />
                ) : null}
              </>
            ) : (
              <p className="pf-live-editor-loading">Loading fonts…</p>
            )}
          </div>

          <aside className="pf-live-editor-panel">
            <section className="pf-live-editor-section">
              <span className="field-label">Headline</span>
              <p className="pf-live-editor-hint">Double-click text on canvas or edit here.</p>
              <label className="field">
                <span>Action verb</span>
                <input
                  type="text"
                  value={overrides.headlineVerb ?? ""}
                  onChange={(e) => setOverrides((o) => ({ ...o, headlineVerb: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>Benefit descriptor</span>
                <input
                  type="text"
                  value={overrides.headlineDescriptor ?? ""}
                  onChange={(e) => setOverrides((o) => ({ ...o, headlineDescriptor: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>Accent phrase</span>
                <input
                  type="text"
                  value={overrides.headlineAccent ?? ""}
                  onChange={(e) => setOverrides((o) => ({ ...o, headlineAccent: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>Subheadline</span>
                <textarea
                  rows={2}
                  value={overrides.subheadline ?? ""}
                  onChange={(e) => setOverrides((o) => ({ ...o, subheadline: e.target.value }))}
                />
              </label>
            </section>

            <section className="pf-live-editor-section">
              <span className="field-label">Text colors &amp; position</span>
              <p className="pf-live-editor-hint">Drag blocks on canvas or use sliders. Each line group moves independently.</p>
              {(["verb", "descriptor", "accent", "sub"] as SlideEditorTextBlockId[]).map((blockId) => {
                if (blockId === "accent" && !textLayer.segments.some((s) => s.blockId === "accent")) {
                  return null;
                }
                if (isLayerHidden(hiddenLayers, blockId)) return null;
                const style = editorState.textStyles?.[blockId];
                const showGradient = blockId === "verb" || blockId === "accent";
                return (
                  <div key={blockId} className="pf-text-block-controls">
                    <div className="pf-text-block-header">
                      <span className="pf-text-block-label">{TEXT_BLOCK_LABELS[blockId]}</span>
                      <HideLayerButton layer={blockId} />
                    </div>
                    <label className="field pf-field-inline">
                      <span>Color</span>
                      <input
                        type="color"
                        value={style?.color ?? defaultBlockColor(blockId)}
                        onChange={(e) => updateTextBlockStyle(blockId, { color: e.target.value.toLowerCase() })}
                      />
                    </label>
                    {showGradient ? (
                      <>
                        <label className="field pf-field-check">
                          <input
                            type="checkbox"
                            checked={style?.useGradient ?? true}
                            onChange={(e) =>
                              updateTextBlockStyle(blockId, { useGradient: e.target.checked })
                            }
                          />
                          <span>Gradient</span>
                        </label>
                        {(style?.useGradient ?? true) ? (
                          <label className="field pf-field-inline">
                            <span>Gradient end</span>
                            <input
                              type="color"
                              value={style?.gradientEnd ?? "#38bdf8"}
                              onChange={(e) =>
                                updateTextBlockStyle(blockId, { gradientEnd: e.target.value.toLowerCase() })
                              }
                            />
                          </label>
                        ) : null}
                      </>
                    ) : null}
                    {blockId === "sub" ? (
                      <label className="field">
                        <span>Opacity ({Math.round((style?.opacity ?? 0.78) * 100)}%)</span>
                        <input
                          type="range"
                          min={0.2}
                          max={1}
                          step={0.01}
                          value={style?.opacity ?? 0.78}
                          onChange={(e) =>
                            updateTextBlockStyle(blockId, { opacity: Number(e.target.value) })
                          }
                        />
                      </label>
                    ) : null}
                    <label className="field">
                      <span>Horizontal ({Math.round(style?.offsetX ?? 0)}px)</span>
                      <input
                        type="range"
                        min={-320}
                        max={320}
                        step={1}
                        value={style?.offsetX ?? 0}
                        onChange={(e) =>
                          updateTextBlockStyle(blockId, { offsetX: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Vertical ({Math.round(style?.offsetY ?? 0)}px)</span>
                      <input
                        type="range"
                        min={-320}
                        max={320}
                        step={1}
                        value={style?.offsetY ?? 0}
                        onChange={(e) =>
                          updateTextBlockStyle(blockId, { offsetY: Number(e.target.value) })
                        }
                      />
                    </label>
                  </div>
                );
              })}
              {overlayLayers.branding && !isLayerHidden(hiddenLayers, "branding") ? (
                <div className="pf-text-block-controls">
                  <div className="pf-text-block-header">
                    <span className="pf-text-block-label">{TEXT_BLOCK_LABELS.branding}</span>
                    <HideLayerButton layer="branding" />
                  </div>
                  <label className="field pf-field-inline">
                    <span>Accent color</span>
                    <input
                      type="color"
                      value={brandingColor}
                      onChange={(e) =>
                        updateTextBlockStyle("branding", { color: e.target.value.toLowerCase() })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Horizontal ({Math.round(brandingStyle?.offsetX ?? 0)}px)</span>
                    <input
                      type="range"
                      min={-320}
                      max={320}
                      step={1}
                      value={brandingStyle?.offsetX ?? 0}
                      onChange={(e) =>
                        updateTextBlockStyle("branding", { offsetX: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Vertical ({Math.round(brandingStyle?.offsetY ?? 0)}px)</span>
                    <input
                      type="range"
                      min={-320}
                      max={320}
                      step={1}
                      value={brandingStyle?.offsetY ?? 0}
                      onChange={(e) =>
                        updateTextBlockStyle("branding", { offsetY: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>
              ) : null}
            </section>

            {(overlayLayers.featurePills || overlayLayers.socialProof) &&
            (!isLayerHidden(hiddenLayers, "featurePills") ||
              !isLayerHidden(hiddenLayers, "socialProof")) ? (
              <section className="pf-live-editor-section">
                <span className="field-label">Overlays</span>
                {overlayLayers.featurePills && !isLayerHidden(hiddenLayers, "featurePills") ? (
                  <div className="pf-text-block-controls pf-overlay-control">
                    <div className="pf-text-block-header">
                      <span className="pf-text-block-label">{HIDDEN_LAYER_LABELS.featurePills}</span>
                      <HideLayerButton layer="featurePills" />
                    </div>
                    <p className="pf-live-editor-hint">Drag on canvas to reposition.</p>
                  </div>
                ) : null}
                {overlayLayers.socialProof && !isLayerHidden(hiddenLayers, "socialProof") ? (
                  <div className="pf-text-block-controls pf-overlay-control">
                    <div className="pf-text-block-header">
                      <span className="pf-text-block-label">{HIDDEN_LAYER_LABELS.socialProof}</span>
                      <HideLayerButton layer="socialProof" />
                    </div>
                    <p className="pf-live-editor-hint">Drag on canvas to reposition.</p>
                  </div>
                ) : null}
              </section>
            ) : null}

            {showDevice && !isLayerHidden(hiddenLayers, "device") ? (
              <section className="pf-live-editor-section">
                <div className="pf-text-block-header">
                  <span className="field-label">Mockup</span>
                  <HideLayerButton layer="device" />
                </div>
                <label className="field">
                  <span>Rotation ({Math.round(editorState.device.rotationDeg)}°)</span>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={editorState.device.rotationDeg}
                    onChange={(e) => updateDeviceField({ rotationDeg: Number(e.target.value) })}
                  />
                </label>
                <label className="field">
                  <span>Size ({Math.round(editorState.device.scale * 100)}%)</span>
                  <input
                    type="range"
                    min={0.35}
                    max={1.6}
                    step={0.01}
                    value={editorState.device.scale}
                    onChange={(e) => updateDeviceField({ scale: Number(e.target.value) })}
                  />
                </label>
                <span className="field-label">Frame color</span>
                <div className="mockup-color-row" role="group" aria-label="Mockup frame color">
                  {MOCKUP_FRAME_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={frameColor === preset.id ? "mockup-color-swatch active" : "mockup-color-swatch"}
                      style={{ background: preset.color }}
                      title={preset.label}
                      aria-label={preset.label}
                      aria-pressed={frameColor === preset.id}
                      onClick={() => updateDeviceField({ frameColor: preset.id })}
                    />
                  ))}
                  <label className="mockup-color-custom" title="Custom color">
                    <span className="sr-only">Custom mockup color</span>
                    <input
                      type="color"
                      value={customHex ?? presetSwatchColor(frameColor)}
                      onChange={(e) => updateDeviceField({ frameColor: e.target.value.toLowerCase() })}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="secondary-action compact-action"
                  onClick={() => {
                    const next = computeDefaultDeviceState(
                      CANVAS_W,
                      CANVAS_H,
                      mockupPose,
                      textLayer.textBlockBottom,
                      editorState.device.frameColor,
                      mockupAssetId,
                    );
                    setEditorState((prev) => ({ ...prev, device: next }));
                  }}
                >
                  Reset mockup position
                </button>
              </section>
            ) : null}

            {hiddenLayerList.length > 0 ? (
              <section className="pf-live-editor-section pf-hidden-layers">
                <span className="field-label">Removed layers</span>
                <p className="pf-live-editor-hint">Restore hidden elements to the slide.</p>
                <div className="pf-hidden-layer-list">
                  {hiddenLayerList.map((layer) => (
                    <button
                      key={layer}
                      type="button"
                      className="secondary-action compact-action pf-restore-layer-btn"
                      onClick={() => setLayerVisibility(layer, false)}
                    >
                      <RotateCcw aria-hidden="true" />
                      Restore {HIDDEN_LAYER_LABELS[layer]}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
