import {

  buildMockupFrameGradients,

  type MockupFrameColor,

  resolveMockupFrameHex,

} from "@/lib/mockupFrameColors";

import {

  buildPerspectivePhoneGeometry,

  quadToPath,

  type PerspectivePhoneGeometry,

} from "@/lib/mockupPerspectiveGeometry";

import type { MockupOrientation } from "@/lib/mockupPose";
import { METALLIC_FRAME_W } from "@/lib/metallicIPhoneFrame";



type PerspectiveFrameOptions = {

  idPrefix?: string;

  frameColor?: MockupFrameColor | null;

  orientation: MockupOrientation;

};



function defaultTitaniumGradients(id: string) {

  return {

    titanium: `<linearGradient id="${id}-titanium" x1="0%" y1="0%" x2="100%" y2="0%">

      <stop offset="0%" stop-color="#d8d8de"/>

      <stop offset="30%" stop-color="#9a9aa4"/>

      <stop offset="55%" stop-color="#7c7c86"/>

      <stop offset="78%" stop-color="#9a9aa4"/>

      <stop offset="100%" stop-color="#cacad0"/>

    </linearGradient>`,

    side: `<linearGradient id="${id}-side" x1="0%" y1="0%" x2="100%" y2="0%">

      <stop offset="0%" stop-color="#141418"/>

      <stop offset="28%" stop-color="#3a3a44"/>

      <stop offset="55%" stop-color="#6a6a74"/>

      <stop offset="78%" stop-color="#42424c"/>

      <stop offset="100%" stop-color="#1e1e24"/>

    </linearGradient>`,

    sideDepth: `<linearGradient id="${id}-side-depth" x1="0%" y1="0%" x2="100%" y2="100%">

      <stop offset="0%" stop-color="#000000" stop-opacity="0.55"/>

      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>

    </linearGradient>`,

    edgeShine: `<linearGradient id="${id}-edge-shine" x1="0%" y1="0%" x2="100%" y2="100%">

      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.72"/>

      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.08"/>

      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.35"/>

    </linearGradient>`,

    rim: `<linearGradient id="${id}-rim" x1="0%" y1="0%" x2="0%" y2="100%">

      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.65"/>

      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.12"/>

    </linearGradient>`,

    btn: `<linearGradient id="${id}-btn" x1="0%" y1="0%" x2="0%" y2="100%">

      <stop offset="0%" stop-color="#f2f2f6"/>

      <stop offset="100%" stop-color="#4a4a54"/>

    </linearGradient>`,

  };

}



function dynamicIslandMarkup(geo: PerspectivePhoneGeometry, id: string) {

  const f = geo.front;

  const cx = (f.tl.x + f.tr.x) / 2;

  const topY = (f.tl.y + f.tr.y) / 2 + 14;

  const w = Math.abs(f.tr.x - f.tl.x) * 0.29;

  const h = 34;

  return `

    <rect x="${cx - w / 2}" y="${topY}" width="${w}" height="${h}" rx="${h / 2}" fill="#000"/>

    <circle cx="${cx + w * 0.38}" cy="${topY + h / 2}" r="6" fill="#1c1c1e"/>

  `;

}



function sideButtonsMarkup(geo: PerspectivePhoneGeometry, id: string) {

  if (!geo.side) return "";

  const s = geo.side;

  const midY = (s.tl.y + s.bl.y) / 2;

  const sideW = Math.max(3, Math.hypot(s.tr.x - s.tl.x, s.tr.y - s.tl.y));

  const x = geo.yawDeg > 0 ? s.tl.x : s.tr.x - sideW;

  return `

    <rect x="${x}" y="${midY - 92}" width="${sideW}" height="50" rx="2" fill="url(#${id}-btn)"/>

    <rect x="${x}" y="${midY + 18}" width="${sideW}" height="34" rx="2" fill="url(#${id}-btn)"/>

    <rect x="${x}" y="${midY + 62}" width="${sideW}" height="22" rx="2" fill="url(#${id}-btn)"/>

  `;

}



/** Thin highlight along the front edge that meets the visible side. */

function frontRimMarkup(geo: PerspectivePhoneGeometry, id: string) {

  const f = geo.front;

  const s = geo.side;

  if (!s) return "";

  const pts =

    geo.yawDeg > 0

      ? `M ${f.tr.x} ${f.tr.y} L ${f.br.x} ${f.br.y}`

      : `M ${f.tl.x} ${f.tl.y} L ${f.bl.x} ${f.bl.y}`;

  return `<path d="${pts}" stroke="url(#${id}-rim)" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.85"/>`;

}



export function generatePerspectiveMetallicFrameSvg(options: PerspectiveFrameOptions): string {

  const id = options.idPrefix ?? "persp";

  const geo = buildPerspectivePhoneGeometry(options.orientation);

  const customHex = resolveMockupFrameHex(options.frameColor);

  const gradients = customHex ? buildMockupFrameGradients(customHex, id) : defaultTitaniumGradients(id);



  const vbMinX = geo.bounds.minX - 6;

  const vbMinY = geo.bounds.minY - 6;

  const vbW = Math.ceil(geo.bounds.maxX - geo.bounds.minX + 12);

  const vbH = Math.ceil(geo.bounds.maxY - geo.bounds.minY + 12);

  const frontPath = quadToPath(geo.front);

  const sidePath = geo.side ? quadToPath(geo.side) : "";

  const screenHolePath = `M ${geo.screen.tl.x} ${geo.screen.tl.y} L ${geo.screen.bl.x} ${geo.screen.bl.y} L ${geo.screen.br.x} ${geo.screen.br.y} L ${geo.screen.tr.x} ${geo.screen.tr.y} Z`;

  const shellPath = `${frontPath} ${screenHolePath}`;

  const yawPositive = geo.yawDeg > 0;

  const sideGrad = defaultTitaniumGradients(id).side;

  const sideDepth = defaultTitaniumGradients(id).sideDepth;

  const rim = defaultTitaniumGradients(id).rim;



  const sideLayer = geo.side

    ? `<path d="${sidePath}" fill="url(#${id}-side)"/>

       <path d="${sidePath}" fill="url(#${id}-side-depth)" opacity="0.55"/>`

    : "";



  const shadow = `<filter id="${id}-shadow" x="-45%" y="-20%" width="190%" height="165%">

    <feDropShadow dx="${yawPositive ? -22 : 22}" dy="40" stdDeviation="34" flood-color="#000" flood-opacity="0.6"/>

    <feDropShadow dx="${yawPositive ? -6 : 6}" dy="14" stdDeviation="10" flood-color="#000" flood-opacity="0.38"/>

  </filter>`;

  // Diagonal glass reflection across the screen — key realism cue.
  const sheenAngle = yawPositive ? "0%" : "100%";
  const sheenAngleEnd = yawPositive ? "100%" : "0%";
  const screenSheen = `<linearGradient id="${id}-sheen" x1="${sheenAngle}" y1="0%" x2="${sheenAngleEnd}" y2="100%">
    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.16"/>
    <stop offset="26%" stop-color="#ffffff" stop-opacity="0.05"/>
    <stop offset="52%" stop-color="#ffffff" stop-opacity="0"/>
    <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
  </linearGradient>`;



  return `<svg width="${vbW}" height="${vbH}" viewBox="${vbMinX} ${vbMinY} ${vbW} ${vbH}"

    xmlns="http://www.w3.org/2000/svg">

  <defs>

    ${shadow}

    ${gradients.titanium}

    ${sideGrad}

    ${sideDepth}

    ${rim}

    ${gradients.edgeShine}

    ${gradients.btn}

    ${screenSheen}

  </defs>

  <g filter="url(#${id}-shadow)">

    ${sideLayer}

    <path fill-rule="evenodd" d="${shellPath}" fill="url(#${id}-titanium)"/>

    <path fill-rule="evenodd" d="${shellPath}" fill="url(#${id}-edge-shine)" opacity="0.12"/>

    <path d="${screenHolePath}" fill="none" stroke="#05050a" stroke-width="${Math.max(2, vbW * 0.012)}" stroke-linejoin="round"/>

    <path d="${screenHolePath}" fill="url(#${id}-sheen)"/>

    ${dynamicIslandMarkup(geo, id)}

    ${sideButtonsMarkup(geo, id)}

  </g>

</svg>`;

}



export function perspectiveFrameRasterSize(orientation: MockupOrientation, targetFrontWidth: number) {

  const geo = buildPerspectivePhoneGeometry(orientation);

  const spanW = geo.bounds.maxX - geo.bounds.minX;

  const spanH = geo.bounds.maxY - geo.bounds.minY;

  const scale = targetFrontWidth / METALLIC_FRAME_W;

  return {

    width: Math.max(1, Math.round(spanW * scale)),

    height: Math.max(1, Math.round(spanH * scale)),

    scale,

    geometry: geo,

  };

}

