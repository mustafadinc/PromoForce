import sharp from "sharp";
import { ASO_SVG_FONT_FAMILY } from "@/lib/asoTypography";
import type { VisualTemplateInput } from "@/lib/visualTemplates/registry";

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function renderStatCard(input: VisualTemplateInput): Promise<Buffer> {
  const { background, headline, subheadline, width, height, accentColor = "#45d6b5", statValue, statLabel } = input;
  const scale = width / 1024;
  const numSize = Math.round(120 * scale);
  const labelSize = Math.round(36 * scale);
  const subSize = Math.round(28 * scale);
  const value = statValue || headline;
  const label = statLabel || subheadline;

  const svg = Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <text x="${width / 2}" y="${Math.round(height * 0.42)}" text-anchor="middle" font-family="${ASO_SVG_FONT_FAMILY}" font-weight="900" font-size="${numSize}" fill="${accentColor}">${escapeXml(value)}</text>
  <text x="${width / 2}" y="${Math.round(height * 0.52)}" text-anchor="middle" font-family="${ASO_SVG_FONT_FAMILY}" font-weight="700" font-size="${labelSize}" fill="#ffffff">${escapeXml(label)}</text>
  <text x="${width / 2}" y="${Math.round(height * 0.6)}" text-anchor="middle" font-family="${ASO_SVG_FONT_FAMILY}" font-weight="600" font-size="${subSize}" fill="#b8c0cc">${escapeXml(subheadline)}</text>
</svg>`);

  const base = await sharp(background).resize(width, height, { fit: "cover" }).png().toBuffer();
  const overlay = await sharp(svg).png().toBuffer();
  return sharp(base).composite([{ input: overlay, top: 0, left: 0 }]).png().toBuffer();
}
