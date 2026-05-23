import sharp from "sharp";
import { ASO_SVG_FONT_FAMILY } from "@/lib/asoTypography";
import type { VisualTemplateInput } from "@/lib/visualTemplates/registry";

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function renderQuoteCard(input: VisualTemplateInput): Promise<Buffer> {
  const { background, headline, subheadline, width, height, accentColor = "#45d6b5", quoteAttribution } = input;
  const scale = width / 1024;
  const quoteSize = Math.round(52 * scale);
  const attrSize = Math.round(28 * scale);
  const subSize = Math.round(24 * scale);

  const svg = Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.35)}" width="${Math.round(width * 0.84)}" height="${Math.round(height * 0.3)}" rx="24" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)" stroke-width="2"/>
  <text x="${width / 2}" y="${Math.round(height * 0.48)}" text-anchor="middle" font-family="${ASO_SVG_FONT_FAMILY}" font-weight="800" font-size="${quoteSize}" fill="#ffffff">"${escapeXml(headline)}"</text>
  ${quoteAttribution ? `<text x="${width / 2}" y="${Math.round(height * 0.56)}" text-anchor="middle" font-family="${ASO_SVG_FONT_FAMILY}" font-weight="700" font-size="${attrSize}" fill="${accentColor}">— ${escapeXml(quoteAttribution)}</text>` : ""}
  <text x="${width / 2}" y="${Math.round(height * 0.64)}" text-anchor="middle" font-family="${ASO_SVG_FONT_FAMILY}" font-weight="600" font-size="${subSize}" fill="#c5cdd8">${escapeXml(subheadline)}</text>
</svg>`);

  const base = await sharp(background).resize(width, height, { fit: "cover" }).png().toBuffer();
  const overlay = await sharp(svg).png().toBuffer();
  return sharp(base).composite([{ input: overlay, top: 0, left: 0 }]).png().toBuffer();
}
