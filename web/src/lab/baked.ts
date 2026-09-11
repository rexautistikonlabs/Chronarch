/** Baked stills for the lab's glass and paper: drawn once into a 2D canvas
 *  at mount and uploaded as a texture. The Chronarch display shows the
 *  catalogue graph and its readouts; the Continuum glass shows a sectional
 *  tissue and afferent-flow schematic; the spec board shows the legal text;
 *  each piece wears an equipment tag. Nothing here is live, fetched or
 *  embedded: no iframe, no image file, no network. Where a 2D context is
 *  missing (jsdom), the caller falls back to a flat material. Pure three. */
import * as THREE from "three";

import { LEGAL, LEGAL_LINES } from "../lib/legal";

export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
const SANS = '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';
const PHOSPHOR = "#8faf88";
const IVORY = "#e8e4d8";
const DIM = "#5c6670";
const INK = "#0e1311";

export function bake(w: number, h: number, draw: Draw): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/** Greedy word wrap for a monospace-ish line width. */
export function wrap(text: string, chars: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (!word) continue;
    if (line && (line + " " + word).length > chars) {
      out.push(line);
      line = word;
    } else line = line ? line + " " + word : word;
  }
  if (line) out.push(line);
  return out;
}

/** The Chronarch bench display: six fields on a ring, three bridges, one
 *  synthesis child above the centre; a column of readouts; the honesty line. */
export const drawChronarchDisplay: Draw = (ctx, w, h) => {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = "top";
  ctx.fillStyle = PHOSPHOR;
  ctx.font = `600 ${Math.round(h * 0.05)}px ${MONO}`;
  ctx.fillText("CHRONARCH · PROGRAMME BENCH", w * 0.04, h * 0.05);
  ctx.fillStyle = DIM;
  ctx.font = `${Math.round(h * 0.04)}px ${MONO}`;
  ctx.fillText("RUNNING", w * 0.84, h * 0.055);
  ctx.strokeStyle = "#1f2623";
  ctx.lineWidth = Math.max(1, h * 0.004);
  ctx.beginPath();
  ctx.moveTo(w * 0.04, h * 0.14);
  ctx.lineTo(w * 0.96, h * 0.14);
  ctx.stroke();
  // the catalogue graph
  const cx = w * 0.34;
  const cy = h * 0.57;
  const r = h * 0.28;
  const nodes: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    nodes.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  ctx.strokeStyle = "#2a302c";
  ctx.lineWidth = Math.max(1, h * 0.005);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = PHOSPHOR;
  ctx.lineWidth = Math.max(1.5, h * 0.008);
  for (const [i, j] of [[0, 2], [3, 5], [1, 4]] as const) {
    ctx.beginPath();
    ctx.moveTo(nodes[i]![0], nodes[i]![1]);
    ctx.lineTo(nodes[j]![0], nodes[j]![1]);
    ctx.stroke();
  }
  // the synthesis child names two parents
  const child: [number, number] = [cx, cy - r * 0.3];
  ctx.strokeStyle = "#5f8060";
  ctx.setLineDash([h * 0.012, h * 0.012]);
  for (const i of [0, 2]) {
    ctx.beginPath();
    ctx.moveTo(child[0], child[1]);
    ctx.lineTo(nodes[i]![0], nodes[i]![1]);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const [x, y] of nodes) {
    ctx.fillStyle = IVORY;
    ctx.beginPath();
    ctx.arc(x, y, h * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = PHOSPHOR;
  ctx.beginPath();
  ctx.arc(child[0], child[1], h * 0.028, 0, Math.PI * 2);
  ctx.fill();
  // readouts
  const rows: [string, string][] = [["fields", "6"], ["bridges", "3"], ["programmes", "1"], ["syntheses", "2"], ["parents named", "2 / 2"]];
  ctx.font = `${Math.round(h * 0.042)}px ${MONO}`;
  rows.forEach(([k, v], i) => {
    const y = h * 0.22 + i * h * 0.11;
    ctx.fillStyle = DIM;
    ctx.fillText(k, w * 0.64, y);
    ctx.fillStyle = IVORY;
    ctx.fillText(v, w * 0.88, y);
  });
  ctx.fillStyle = DIM;
  ctx.font = `${Math.round(h * 0.036)}px ${SANS}`;
  ctx.fillText("Not a diagnostic. Not a medical device.", w * 0.04, h * 0.9);
};

/** The Continuum console glass: a sectional schematic — three tissue layers
 *  as arcs, tension lines across them, afferent lines converging on one node —
 *  and the sentence that says what the numbers are. */
export const drawContinuumGlass: Draw = (ctx, w, h) => {
  ctx.fillStyle = "rgba(14, 19, 17, 0.88)";
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = "top";
  ctx.fillStyle = PHOSPHOR;
  ctx.font = `600 ${Math.round(h * 0.05)}px ${MONO}`;
  ctx.fillText("CONTINUUM · TEACHING SIMULATION", w * 0.04, h * 0.05);
  ctx.fillStyle = DIM;
  ctx.font = `${Math.round(h * 0.036)}px ${MONO}`;
  ctx.fillText("biotensegrity · afferent flow", w * 0.04, h * 0.125);
  // section: three layers as concentric arcs around a point below the frame
  const cx = w * 0.42;
  const cy = h * 1.25;
  ctx.lineWidth = Math.max(1.5, h * 0.007);
  const layers = [h * 0.62, h * 0.74, h * 0.86];
  layers.forEach((rad, i) => {
    ctx.strokeStyle = i === 1 ? PHOSPHOR : "#5f8060";
    ctx.beginPath();
    ctx.arc(cx, cy, rad, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
  });
  // tension elements across the middle layer
  ctx.strokeStyle = "#3d5a40";
  ctx.lineWidth = Math.max(1, h * 0.004);
  for (let k = 0; k < 9; k++) {
    const a = Math.PI * (1.18 + k * 0.08);
    const r0 = layers[0]!;
    const r2 = layers[2]!;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a + 0.05) * r2, cy + Math.sin(a + 0.05) * r2);
    ctx.stroke();
  }
  // afferent lines to one node
  const node: [number, number] = [w * 0.86, h * 0.5];
  ctx.strokeStyle = PHOSPHOR;
  ctx.lineWidth = Math.max(1.5, h * 0.006);
  for (let k = 0; k < 5; k++) {
    const a = Math.PI * (1.2 + k * 0.14);
    const r = layers[1]!;
    const sx = cx + Math.cos(a) * r;
    const sy = cy + Math.sin(a) * r;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo((sx + node[0]) / 2, Math.min(sy, node[1]) - h * 0.08, node[0], node[1]);
    ctx.stroke();
  }
  ctx.fillStyle = IVORY;
  ctx.beginPath();
  ctx.arc(node[0], node[1], h * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = DIM;
  ctx.font = `${Math.round(h * 0.036)}px ${SANS}`;
  ctx.fillText("Model outputs, not measurements of a person.", w * 0.04, h * 0.9);
};

/** The spec board: an ivory sheet on a dark board with the legal text. */
export const drawSpecBoard: Draw = (ctx, w, h) => {
  ctx.fillStyle = "#1a1e1c";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#d9d4c5";
  ctx.fillRect(w * 0.06, h * 0.05, w * 0.88, h * 0.9);
  ctx.textBaseline = "top";
  ctx.fillStyle = INK;
  ctx.font = `600 ${Math.round(h * 0.03)}px ${MONO}`;
  ctx.fillText("RX-SPEC · LEGAL", w * 0.1, h * 0.085);
  ctx.font = `${Math.round(h * 0.02)}px ${MONO}`;
  ctx.fillText(LEGAL.llc.toUpperCase(), w * 0.1, h * 0.13);
  const size = Math.round(h * 0.0195);
  ctx.font = `${size}px ${SANS}`;
  let y = h * 0.18;
  for (const line of LEGAL_LINES.slice(1)) {
    for (const row of wrap(line, 62)) {
      ctx.fillText(row, w * 0.1, y);
      y += size * 1.35;
    }
    y += size * 0.8;
  }
  ctx.fillStyle = "#4a4f4b";
  ctx.font = `${Math.round(h * 0.018)}px ${MONO}`;
  ctx.fillText("Credit, not endorsement.", w * 0.1, h * 0.9);
};

/** An equipment tag: the id large, one line small. */
export function drawTag(id: string, line: string): Draw {
  return (ctx, w, h) => {
    ctx.fillStyle = "#d9d4c5";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#1a1e1c";
    ctx.fillRect(0, 0, w, Math.max(2, h * 0.06));
    ctx.textBaseline = "top";
    ctx.fillStyle = INK;
    ctx.font = `600 ${Math.round(h * 0.42)}px ${MONO}`;
    ctx.fillText(id, w * 0.06, h * 0.14);
    ctx.font = `${Math.round(h * 0.2)}px ${MONO}`;
    ctx.fillStyle = "#3a3f3c";
    ctx.fillText(line, w * 0.06, h * 0.64);
  };
}
