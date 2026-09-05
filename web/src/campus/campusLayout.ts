/** The RexMetrix campus: a contractor's lab plate, not a playground. Three
 *  volumes on a poured pad inside one fence with one gate. Data only — the
 *  scene draws it, the HUD names it, the rig aims at it. Every number here is
 *  a position or a size; nothing is a speed. */
import type { Spherical } from "../scene/focus";

export type BuildingKey = "chronarch" | "continuum" | "face-mapping";

export interface Building {
  key: BuildingKey;
  sign: string; // the plate on the wall, in capitals
  status: "RUNNING" | "FORTHCOMING";
  center: [number, number, number]; // of the footprint, y = 0
  size: [number, number, number]; // w, h, d
  windows: boolean; // lit windows: only the running product
  shade: "lab" | "shed" | "blank";
  route: string | null; // only the running product has a door
}

/** Graded to the app's set. Nothing brighter than ivory, nothing warmer than the pad. */
export const CAMPUS = {
  background: "#0b0d0c",
  metal: "#1a1e1c",
  metalDark: "#141715",
  ivory: "#e8e4d8",
  phosphor: "#8faf88",
  hairline: "#2a302c",
  pad: "#101312",
  grid: "#171b19",
} as const;

export const BUILDINGS: readonly Building[] = [
  { key: "chronarch", sign: "CHRONARCH", status: "RUNNING", center: [-6.5, 0, -1], size: [7, 4.2, 5], windows: true, shade: "lab", route: "/chronarch" },
  { key: "continuum", sign: "CONTINUUM", status: "FORTHCOMING", center: [3.5, 0, -4.5], size: [6, 2.6, 4], windows: false, shade: "shed", route: null },
  { key: "face-mapping", sign: "FACE MAP", status: "FORTHCOMING", center: [6.5, 0, 3.5], size: [4, 3.4, 4], windows: false, shade: "blank", route: null },
];

export const SIGN_LINES: Record<BuildingKey, string> = {
  chronarch: "CHRONARCH · RUNNING",
  continuum: "CONTINUUM · FORTHCOMING",
  "face-mapping": "FACE MAP · FORTHCOMING · NOT A DIAGNOSTIC",
};

export const PLATE = { half: 13, fenceHeight: 1.1, postEvery: 2.6 } as const;
export const GATE = { center: [0, 0, PLATE.half] as [number, number, number], width: 5, height: 2.3, label: "REXMETRIX" } as const;

/** Where the camera rests: the overview from outside the gate, or a three-quarter
 *  view of one building. Slow orbit and wheel zoom are added by the hand. */
export function campusGoal(selected: BuildingKey | null): Spherical {
  if (!selected) return { az: 0.35, el: 0.42, dist: 30, target: [0, 1, 0] };
  const b = BUILDINGS.find((x) => x.key === selected)!;
  const [x, , z] = b.center;
  return { az: Math.atan2(x, z + 9) + 0.55, el: 0.32, dist: 15, target: [x, b.size[1] * 0.45, z] };
}

export function buildingByKey(key: BuildingKey): Building {
  return BUILDINGS.find((b) => b.key === key)!;
}
