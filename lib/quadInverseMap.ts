import { bilinearQuad, type PerspectiveQuad } from "@/lib/mockupPerspectiveGeometry";

/** Inverse bilinear: canvas (x,y) → source (u,v) in [0,1]². */
export function invBilinearQuad(px: number, py: number, q: PerspectiveQuad): { u: number; v: number } | null {
  let u = 0.5;
  let v = 0.5;

  for (let i = 0; i < 16; i += 1) {
    const p = bilinearQuad(q, u, v);
    const du = 0.001;
    const dv = 0.001;
    const pu = bilinearQuad(q, Math.min(1, u + du), v);
    const pv = bilinearQuad(q, u, Math.min(1, v + dv));
    const dxdu = (pu.x - p.x) / du;
    const dydu = (pu.y - p.y) / du;
    const dxdv = (pv.x - p.x) / dv;
    const dydv = (pv.y - p.y) / dv;
    const det = dxdu * dydv - dxdv * dydu;
    if (Math.abs(det) < 1e-8) break;

    const ex = px - p.x;
    const ey = py - p.y;
    u += (ex * dydv - ey * dxdv) / det;
    v += (ey * dxdu - ex * dydu) / det;
    u = Math.max(0, Math.min(1, u));
    v = Math.max(0, Math.min(1, v));
  }

  const p = bilinearQuad(q, u, v);
  if (Math.hypot(p.x - px, p.y - py) > 2.5) return null;
  return { u, v };
}
