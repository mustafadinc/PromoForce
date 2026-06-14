import type { SocialProofInput } from "@/lib/campaignTypes";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderStars(rating: number, cx: number, cy: number, size: number, accentColor: string) {
  const stars = Math.min(5, Math.max(0, Math.round(rating)));
  const gap = size * 1.15;
  const startX = cx - ((stars - 1) * gap) / 2;
  return Array.from({ length: stars }, (_, i) => {
    const x = startX + i * gap;
    return `<polygon points="${x},${cy - size * 0.4} ${x + size * 0.22},${cy - size * 0.05} ${x + size * 0.45},${cy - size * 0.05} ${x + size * 0.28},${cy + size * 0.12} ${x + size * 0.34},${cy + size * 0.42} ${x},${cy + size * 0.22} ${x - size * 0.34},${cy + size * 0.42} ${x - size * 0.28},${cy + size * 0.12} ${x - size * 0.45},${cy - size * 0.05} ${x - size * 0.22},${cy - size * 0.05}" fill="${accentColor}"/>`;
  }).join("");
}

export function buildSocialProofSvg(input: {
  socialProof?: SocialProofInput;
  width: number;
  height: number;
  accentColor: string;
  fontFamily: string;
  scale: number;
}): string {
  const { socialProof, width, height, accentColor, fontFamily, scale } = input;
  if (!socialProof) return "";

  const quote = socialProof.reviewQuotes?.[0]?.trim();
  const downloadCount = socialProof.downloadCount?.trim();
  const award = socialProof.awards?.[0]?.trim();
  const rating = socialProof.rating;

  if (!quote && !downloadCount && !award && !rating) return "";

  const cardW = Math.round(width * 0.78);
  const cardH = Math.round(quote ? 168 * scale : 96 * scale);
  const cardX = Math.round((width - cardW) / 2);
  const cardY = height - Math.round(220 * scale) - cardH;
  const radius = Math.round(20 * scale);
  const pad = Math.round(20 * scale);
  const fontSize = Math.round(26 * scale);

  let inner = "";
  let y = cardY + pad + fontSize;

  if (rating && rating > 0) {
    inner += renderStars(rating, cardX + cardW / 2, cardY + pad + Math.round(14 * scale), Math.round(10 * scale), accentColor);
    y += Math.round(36 * scale);
  }

  if (quote) {
    const truncated = quote.length > 90 ? `${quote.slice(0, 87)}…` : quote;
    inner += `<text x="${cardX + pad}" y="${y}" font-family="${fontFamily}" font-weight="700" font-size="${fontSize}" fill="#f0f3f8">"${escapeXml(truncated)}"</text>`;
    y += Math.round(fontSize * 1.4);
  }

  if (downloadCount) {
    inner += `<text x="${cardX + pad}" y="${y}" font-family="${fontFamily}" font-weight="800" font-size="${Math.round(fontSize * 0.92)}" fill="${accentColor}">${escapeXml(downloadCount)}</text>`;
    y += Math.round(fontSize * 1.2);
  }

  if (award) {
    inner += `<text x="${cardX + pad}" y="${y}" font-family="${fontFamily}" font-weight="700" font-size="${Math.round(fontSize * 0.85)}" fill="#cbd5e1">🏆 ${escapeXml(award)}</text>`;
  }

  return `
  <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="${radius}" fill="rgba(0,0,0,0.42)" stroke="rgba(255,255,255,0.14)" stroke-width="${Math.max(1.5, 1.5 * scale)}"/>
  ${inner}`;
}
