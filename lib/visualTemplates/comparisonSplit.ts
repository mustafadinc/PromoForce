import sharp from "sharp";
import { ASO_SVG_FONT_FAMILY } from "@/lib/asoTypography";
import type { VisualTemplateInput } from "@/lib/visualTemplates/registry";

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function renderComparisonSplit(input: VisualTemplateInput): Promise<Buffer> {
  const { background, width, height, beforeLabel = "Before", afterLabel = "After", headline } = input;
  const halfW = Math.floor(width / 2);
  const labelSize = Math.round(32 * (width / 1024));

  const svg = Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${halfW}" height="${height}" fill="rgba(0,0,0,0.45)"/>
  <rect x="${halfW}" y="0" width="${halfW}" height="${height}" fill="rgba(69,214,181,0.12)"/>
  <line x1="${halfW}" y1="0" x2="${halfW}" y2="${height}" stroke="rgba(255,255,255,0.25)" stroke-width="3"/>
  <text x="${halfW / 2}" y="${Math.round(height * 0.12)}" text-anchor="middle" font-family="${ASO_SVG_FONT_FAMILY}" font-weight="800" font-size="${labelSize}" fill="#9aa4b2">${escapeXml(beforeLabel)}</text>
  <text x="${halfW + halfW / 2}" y="${Math.round(height * 0.12)}" text-anchor="middle" font-family="${ASO_SVG_FONT_FAMILY}" font-weight="800" font-size="${labelSize}" fill="#45d6b5">${escapeXml(afterLabel)}</text>
  <text x="${width / 2}" y="${Math.round(height * 0.92)}" text-anchor="middle" font-family="${ASO_SVG_FONT_FAMILY}" font-weight="700" font-size="${labelSize}" fill="#ffffff">${escapeXml(headline)}</text>
</svg>`);

  const base = await sharp(background).resize(width, height, { fit: "cover" }).png().toBuffer();
  const overlay = await sharp(svg).png().toBuffer();
  return sharp(base).composite([{ input: overlay, top: 0, left: 0 }]).png().toBuffer();
}
