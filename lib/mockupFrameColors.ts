/** iPhone mockup frame color presets + metallic gradient helpers. */

export type MockupFramePresetId =
  | "titanium"
  | "black"
  | "white"
  | "gold"
  | "blue"
  | "graphite";

export type MockupFrameColor = MockupFramePresetId | (string & {});

export const DEFAULT_MOCKUP_FRAME_COLOR: MockupFramePresetId = "titanium";

export const MOCKUP_FRAME_PRESETS: ReadonlyArray<{
  id: MockupFramePresetId;
  label: string;
  color: string;
}> = [
  { id: "titanium", label: "Titanium", color: "#8a8a92" },
  { id: "black", label: "Black", color: "#1c1c1e" },
  { id: "white", label: "White", color: "#f2f2f7" },
  { id: "gold", label: "Gold", color: "#c8a951" },
  { id: "blue", label: "Blue", color: "#7eb0c9" },
  { id: "graphite", label: "Graphite", color: "#48484a" },
];

const PRESET_BY_ID = Object.fromEntries(MOCKUP_FRAME_PRESETS.map((p) => [p.id, p.color])) as Record<
  MockupFramePresetId,
  string
>;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseHex(hex: string) {
  const normalized = hex.replace("#", "").trim();
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized.slice(0, 6);
  const value = Number.parseInt(expanded, 16);
  if (Number.isNaN(value)) {
    return { r: 138, g: 138, b: 146 };
  }
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function toHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mix(a: string, b: string, t: number) {
  const c1 = parseHex(a);
  const c2 = parseHex(b);
  return toHex(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t,
  );
}

function tone(hex: string, amount: number) {
  const { r, g, b } = parseHex(hex);
  if (amount >= 0) {
    return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
  }
  const factor = 1 + amount;
  return toHex(r * factor, g * factor, b * factor);
}

export function resolveMockupFrameHex(color?: MockupFrameColor | null): string | null {
  if (!color || color === "titanium") return null;
  if (color.startsWith("#")) return color.toLowerCase();
  const preset = PRESET_BY_ID[color as MockupFramePresetId];
  return preset ?? null;
}

export function normalizeMockupFrameColor(color?: MockupFrameColor | null): MockupFrameColor {
  if (!color || color === "titanium") return DEFAULT_MOCKUP_FRAME_COLOR;
  if (color.startsWith("#")) return color.toLowerCase();
  if (color in PRESET_BY_ID) return color as MockupFramePresetId;
  return DEFAULT_MOCKUP_FRAME_COLOR;
}

export function mockupFrameCacheKey(color?: MockupFrameColor | null): string {
  const resolved = resolveMockupFrameHex(color);
  return resolved ?? DEFAULT_MOCKUP_FRAME_COLOR;
}

export function buildMockupFrameGradients(baseHex: string, id: string) {
  const highlight = tone(baseHex, 0.62);
  const midLight = tone(baseHex, 0.28);
  const mid = baseHex;
  const midDark = tone(baseHex, -0.22);
  const shadow = tone(baseHex, -0.42);
  const deep = tone(baseHex, -0.55);
  const btnTop = tone(baseHex, 0.38);
  const btnMid = tone(baseHex, -0.08);
  const btnBottom = tone(baseHex, -0.35);

  const titanium = `<linearGradient id="${id}-titanium" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${highlight}"/>
      <stop offset="6%" stop-color="${tone(baseHex, 0.48)}"/>
      <stop offset="18%" stop-color="${midLight}"/>
      <stop offset="32%" stop-color="${tone(baseHex, -0.12)}"/>
      <stop offset="46%" stop-color="${midDark}"/>
      <stop offset="54%" stop-color="${shadow}"/>
      <stop offset="66%" stop-color="${mix(mid, highlight, 0.35)}"/>
      <stop offset="80%" stop-color="${tone(baseHex, 0.34)}"/>
      <stop offset="92%" stop-color="${tone(baseHex, 0.52)}"/>
      <stop offset="100%" stop-color="${tone(baseHex, 0.68)}"/>
    </linearGradient>`;

  const edgeShine = `<linearGradient id="${id}-edge-shine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.65"/>
      <stop offset="8%" stop-color="#ffffff" stop-opacity="0.1"/>
      <stop offset="50%" stop-color="#000000" stop-opacity="0.1"/>
      <stop offset="92%" stop-color="#000000" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.28"/>
    </linearGradient>`;

  const btn = `<linearGradient id="${id}-btn" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${btnTop}"/>
      <stop offset="40%" stop-color="${btnMid}"/>
      <stop offset="100%" stop-color="${btnBottom}"/>
    </linearGradient>`;

  return { titanium, edgeShine, btn, mid, deep };
}

export function presetSwatchColor(color: MockupFrameColor): string {
  const hex = resolveMockupFrameHex(color);
  if (hex) return hex;
  return PRESET_BY_ID.titanium;
}
