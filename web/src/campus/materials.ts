/** The campus palette as three.js materials: a handful, shared by every mesh.
 *  Faces are lifted to read on #0b0d0c; windows are emissive phosphor (no
 *  bloom composer — the material carries its own light); edges are phosphor
 *  on the running block and a lighter hairline elsewhere. No neon, no
 *  texture, no environment map. Pure three; no React. */
import * as THREE from "three";

export const CAMPUS = {
  background: "#0b0d0c",
  face: "#2a322e",
  faceDark: "#242b28",
  metal: "#1a1e1c",
  ivory: "#e8e4d8",
  phosphor: "#8faf88",
  phosphorEdge: "#a7c9a0",
  hairline: "#2a302c",
  hairlineLit: "#3d463f",
  pad: "#121514",
  grid: "#1b201d",
} as const;

export const MAT = {
  lab: new THREE.MeshStandardMaterial({ color: CAMPUS.face, roughness: 0.8, metalness: 0.2 }),
  shed: new THREE.MeshStandardMaterial({ color: CAMPUS.faceDark, roughness: 0.9, metalness: 0.15 }),
  blank: new THREE.MeshStandardMaterial({ color: CAMPUS.faceDark, roughness: 0.95, metalness: 0.1 }),
  plant: new THREE.MeshStandardMaterial({ color: CAMPUS.metal, roughness: 0.9, metalness: 0.3 }),
  pad: new THREE.MeshStandardMaterial({ color: CAMPUS.pad, roughness: 1 }),
  fence: new THREE.MeshStandardMaterial({ color: CAMPUS.hairlineLit, roughness: 0.85, metalness: 0.4 }),
  window: new THREE.MeshStandardMaterial({ color: CAMPUS.phosphor, emissive: new THREE.Color(CAMPUS.phosphor), emissiveIntensity: 1.6, roughness: 0.4 }),
  door: new THREE.MeshStandardMaterial({ color: CAMPUS.ivory, emissive: new THREE.Color(CAMPUS.ivory), emissiveIntensity: 0.25, roughness: 0.6 }),
};

/** Relative luminance of a material's colour, 0..1 (sRGB, not linear-corrected — a readability check, not photometry). */
export function luminance(c: THREE.Color): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}
