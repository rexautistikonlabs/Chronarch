/** The RexMetrix campus: a contractor's lab plate, not a playground. Three
 *  volumes on a poured pad inside one fence with one gate. Data only — the
 *  scene draws it, the chapters name it, the rig aims at it. Every number
 *  here is a position, a size or a scroll position; nothing is a speed. */
import type { Spherical } from "../scene/focus";

export type BuildingKey = "chronarch" | "continuum" | "laterion";

export interface Building {
  key: BuildingKey;
  sign: string;
  status: "RUNNING" | "FORTHCOMING";
  center: [number, number, number];
  size: [number, number, number];
  windows: boolean;
  shade: "lab" | "shed" | "blank";
  route: string | null; // only the running product has a door
  at: number; // scroll progress at which its chapter is in frame
}

export const BUILDINGS: readonly Building[] = [
  { key: "chronarch", sign: "CHRONARCH", status: "RUNNING", center: [-6.5, 0, -1], size: [7, 4.2, 5], windows: true, shade: "lab", route: "/chronarch", at: 1 / 3 },
  { key: "continuum", sign: "CONTINUUM", status: "FORTHCOMING", center: [3.5, 0, -4.5], size: [6, 2.6, 4], windows: false, shade: "shed", route: null, at: 2 / 3 },
  { key: "laterion", sign: "LATERION", status: "FORTHCOMING", center: [6.5, 0, 3.5], size: [4, 3.4, 4], windows: false, shade: "blank", route: null, at: 1 },
];

export const SIGN_LINES: Record<BuildingKey, string> = {
  chronarch: "CHRONARCH · RUNNING",
  continuum: "CONTINUUM · FORTHCOMING",
  laterion: "LATERION · FORTHCOMING · NOT A DIAGNOSTIC",
};

export const PLATE = { half: 13, fenceHeight: 1.1, postEvery: 2.6 } as const;
export const GATE = { center: [0, 0, PLATE.half] as [number, number, number], width: 5, height: 2.3, label: "REXMETRIX" } as const;

export function buildingByKey(key: BuildingKey): Building {
  return BUILDINGS.find((b) => b.key === key)!;
}

/** The story's camera keyframes: hero (three buildings and the gate), then
 *  each building filling the frame. Scroll progress 0–1 is the only driver. */
export interface Keyframe { at: number; pose: Spherical }

function framing(b: Building, az: number, dist: number): Spherical {
  return { az, el: 0.3, dist, target: [b.center[0], b.size[1] * 0.5, b.center[2]] };
}

export const KEYFRAMES: readonly Keyframe[] = [
  { at: 0, pose: { az: 0.18, el: 0.34, dist: 31, target: [0, 1.2, 1] } },
  { at: 1 / 3, pose: framing(buildingByKey("chronarch"), -0.5, 17) },
  { at: 2 / 3, pose: framing(buildingByKey("continuum"), 0.5, 14) },
  { at: 1, pose: framing(buildingByKey("laterion"), 1.15, 12.5) },
];

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The camera goal at scroll progress p ∈ [0, 1]: a smoothstep between the two nearest keyframes. */
export function storyGoal(p: number): Spherical {
  const x = Math.min(1, Math.max(0, Number.isFinite(p) ? p : 0));
  let i = 0;
  while (i < KEYFRAMES.length - 2 && x > KEYFRAMES[i + 1]!.at) i++;
  const a = KEYFRAMES[i]!;
  const b = KEYFRAMES[i + 1]!;
  const t = smooth((x - a.at) / (b.at - a.at));
  return {
    az: lerp(a.pose.az, b.pose.az, t),
    el: lerp(a.pose.el, b.pose.el, t),
    dist: lerp(a.pose.dist, b.pose.dist, t),
    target: [lerp(a.pose.target[0], b.pose.target[0], t), lerp(a.pose.target[1], b.pose.target[1], t), lerp(a.pose.target[2], b.pose.target[2], t)],
  };
}
