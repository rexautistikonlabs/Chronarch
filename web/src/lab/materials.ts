/** The lab's palette as three.js materials: a handful, shared by every mesh.
 *  A dark resin floor, lifted walls, dark laminate bench tops on a steel
 *  frame, phosphor for what is switched on (the Chronarch display, the
 *  Continuum glass), a matte grey cover for what is switched off, ivory for
 *  the coat and the luminaires. Floor tape is pale, not amber. No neon, no
 *  environment map. Pure three; no React. */
import * as THREE from "three";

export const LAB = {
  background: "#0b0d0c",
  floor: "#222826",
  floorSeam: "#161a18",
  tape: "#b9b39f",
  wall: "#313835",
  dado: "#282e2b",
  frame: "#1a1e1c",
  benchTop: "#3b4640",
  benchFront: "#2f3835",
  bezel: "#111413",
  phosphor: "#8faf88",
  phosphorEdge: "#a7c9a0",
  hairlineLit: "#3d463f",
  ivory: "#e8e4d8",
  shroud: "#5a5d58",
  coat: "#e8e4d8",
  trousers: "#2a2f33",
  shoes: "#15181a",
  skin: "#7d6f63",
  paper: "#d9d4c5",
  dead: "#2a2d2b",
} as const;

export const MAT = {
  floor: new THREE.MeshStandardMaterial({ color: LAB.floor, roughness: 0.55, metalness: 0.05 }),
  floorSeam: new THREE.MeshStandardMaterial({ color: LAB.floorSeam, roughness: 0.9 }),
  tape: new THREE.MeshStandardMaterial({ color: LAB.tape, roughness: 0.7 }),
  wall: new THREE.MeshStandardMaterial({ color: LAB.wall, roughness: 0.95 }),
  dado: new THREE.MeshStandardMaterial({ color: LAB.dado, roughness: 0.9 }),
  frame: new THREE.MeshStandardMaterial({ color: LAB.frame, roughness: 0.6, metalness: 0.5 }),
  benchTop: new THREE.MeshStandardMaterial({ color: LAB.benchTop, roughness: 0.45, metalness: 0.1 }),
  benchFront: new THREE.MeshStandardMaterial({ color: LAB.benchFront, roughness: 0.8 }),
  bezel: new THREE.MeshStandardMaterial({ color: LAB.bezel, roughness: 0.5, metalness: 0.3 }),
  screen: new THREE.MeshStandardMaterial({ color: LAB.phosphor, emissive: new THREE.Color(LAB.phosphor), emissiveIntensity: 0.8, roughness: 0.4 }),
  luminaire: new THREE.MeshStandardMaterial({ color: LAB.ivory, emissive: new THREE.Color(LAB.ivory), emissiveIntensity: 1.4, roughness: 0.5 }),
  shroud: new THREE.MeshStandardMaterial({ color: LAB.shroud, roughness: 1, metalness: 0 }),
  dead: new THREE.MeshStandardMaterial({ color: LAB.dead, roughness: 0.8 }),
  coat: new THREE.MeshStandardMaterial({ color: LAB.coat, roughness: 0.9 }),
  trousers: new THREE.MeshStandardMaterial({ color: LAB.trousers, roughness: 0.95 }),
  shoes: new THREE.MeshStandardMaterial({ color: LAB.shoes, roughness: 0.6 }),
  skin: new THREE.MeshStandardMaterial({ color: LAB.skin, roughness: 0.8 }),
  paper: new THREE.MeshStandardMaterial({ color: LAB.paper, roughness: 0.95 }),
  glass: new THREE.MeshStandardMaterial({ color: LAB.ivory, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.07, depthWrite: false }),
};

/** Relative luminance of a colour, 0..1 (sRGB, not linear-corrected — a readability check, not photometry). */
export function luminance(c: THREE.Color): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}
