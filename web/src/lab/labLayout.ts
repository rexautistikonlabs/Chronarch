/** The RexMetrix instrument lab: one indoor room, data only. Every mesh the
 *  scene draws maps to a row here, and every row has a job — a product door,
 *  a dead instrument with a one-line refusal, the legal text, the workbench.
 *  Nothing on the floor is decoration. Metres: x right, y up, z toward the
 *  window (the camera stands outside it). The only speed in this file is
 *  the operator's walking pace; nothing here is a clock. */
import type { Spherical } from "../scene/focus";

export type StationKey = "chronarch" | "continuum" | "laterion";
export type PropKey = StationKey | "specboard" | "labbook";

/** A door leaves the lab: a route in this app, or another origin. */
export type Door = { kind: "route"; to: string } | { kind: "external"; href: string };

export type Status = "RUNNING" | "NOT SHIPPING";
export type Kind = "bench-display" | "console" | "covered-bench" | "board" | "book";

export interface Prop {
  key: PropKey;
  kind: Kind;
  id: string; // the equipment tag on the piece
  sign: string; // the HTML hotspot's text
  status: Status | null; // the three products carry a status; the board and the book do not
  sentence: string; // the hover / click sentence
  at: [number, number]; // footprint centre on the floor (x, z)
  yaw: number; // the piece's facing: rotation about y; its front is local +z
  size: [number, number]; // footprint before rotation: along the piece, across it
  standAt: [number, number]; // where the operator stands to use it
  face: number; // the operator's yaw there (yaw 0 faces +z, the window)
  door: Door | null; // a running product has a door; a covered instrument has none
}

export const CONTINUUM_HOST = "https://continuum.rexmetrix.com";

/** One room: walls at x = ±w/2 and z = −d/2; the front, z = +d/2, is glass. */
export const ROOM = { w: 12, d: 8, h: 3.1 } as const;

export const PROPS: readonly Prop[] = [
  {
    key: "chronarch",
    kind: "bench-display",
    id: "RX-01",
    sign: "CHRONARCH · RUNNING",
    status: "RUNNING",
    sentence: "Chronarch · the programme bench, running here: fields, bridges, programmes, syntheses that name their parents. Its door opens the bench.",
    at: [-3.1, -3.15],
    yaw: 0,
    size: [3.0, 0.8],
    standAt: [-3.1, -2.25],
    face: Math.PI,
    door: { kind: "route", to: "/chronarch" },
  },
  {
    key: "continuum",
    kind: "console",
    id: "RX-02",
    sign: "CONTINUUM · RUNNING",
    status: "RUNNING",
    sentence: "Continuum · a teaching-simulation console, running on its own host. Model outputs, not measurements of a person. Its door leaves for that host.",
    at: [2.7, -3.2],
    yaw: 0,
    size: [2.0, 0.8],
    standAt: [2.7, -2.3],
    face: Math.PI,
    door: { kind: "external", href: CONTINUUM_HOST },
  },
  {
    key: "laterion",
    kind: "covered-bench",
    id: "RX-03",
    sign: "LATERION · NOT SHIPPING · NOT A DIAGNOSTIC",
    status: "NOT SHIPPING",
    sentence: "Laterion · a kinematics bench under its cover, powered down. Not shipping. Not a diagnostic. Not a person-score.",
    at: [5.4, 0.2],
    yaw: -Math.PI / 2,
    size: [2.8, 0.85],
    standAt: [4.45, 0.2],
    face: Math.PI / 2,
    door: null,
  },
  {
    key: "specboard",
    kind: "board",
    id: "RX-04",
    sign: "SPEC BOARD · LEGAL",
    status: null,
    sentence: "Spec board · the legal text and the attributions — the same words as the footer.",
    at: [0, -3.9],
    yaw: 0,
    size: [1.6, 0.06],
    standAt: [0, -2.6],
    face: Math.PI,
    door: null,
  },
  {
    key: "labbook",
    kind: "book",
    id: "RX-05",
    sign: "LAB BOOK · WORKBENCH",
    status: null,
    sentence: "Lab book and pack · export a note that names its parents. Its door opens the workbench.",
    at: [-5.6, 1.9],
    yaw: Math.PI / 2,
    size: [1.3, 0.6],
    standAt: [-4.9, 1.9],
    face: -Math.PI / 2,
    door: { kind: "route", to: "/chronarch/tech" },
  },
];

/** The three products, in catalogue order. */
export const STATIONS: readonly Prop[] = PROPS.filter((p) => p.status !== null);

/** DOM order of the hotspots: the two running products, the board, the book,
 *  then the covered bench — so no visitor text puts "Continuum" near a dead
 *  state. The scene and its jsdom stub both draw in this order. */
export const HOTSPOT_ORDER: readonly PropKey[] = ["continuum", "chronarch", "specboard", "labbook", "laterion"];

export const SIGN_LINES: Record<PropKey, string> = Object.fromEntries(PROPS.map((p) => [p.key, p.sign])) as Record<PropKey, string>;

export function propByKey(key: PropKey): Prop {
  return PROPS.find((p) => p.key === key)!;
}

/** The piece's axis-aligned footprint on the floor (a wall piece turned ±90° swaps its sides). */
export function footprint(p: Prop): { x0: number; x1: number; z0: number; z1: number } {
  const turned = Math.abs(Math.sin(p.yaw)) > 0.5;
  const [w, d] = turned ? [p.size[1], p.size[0]] : p.size;
  return { x0: p.at[0] - w / 2, x1: p.at[0] + w / 2, z0: p.at[1] - d / 2, z1: p.at[1] + d / 2 };
}

const WALL_HALF = 0.06; // the walls are 0.12 thick, centred on the room's edges

/** Distance from a piece's footprint centre to the inner face of the wall
 *  behind it (behind = its local −z); Infinity for a free-standing piece. */
export function wallGap(p: Prop): number {
  const s = Math.sin(p.yaw);
  const c = Math.cos(p.yaw);
  if (c > 0.5) return p.at[1] - (-ROOM.d / 2 + WALL_HALF); // faces +z: the back wall is behind
  if (s > 0.5) return p.at[0] - (-ROOM.w / 2 + WALL_HALF); // faces +x: the left wall is behind
  if (s < -0.5) return ROOM.w / 2 - WALL_HALF - p.at[0]; // faces −x: the right wall is behind
  return Number.POSITIVE_INFINITY;
}

/** The floor tape around a piece, in its local metres: a bar across the
 *  front and one down each side, the sides stopping at the wall behind. */
export function tapeExtent(p: Prop): { w: number; front: number; back: number } {
  const front = p.size[1] / 2 + 0.35;
  return { w: p.size[0] + 0.5, front, back: Math.min(front, wallGap(p) - 0.03) };
}

/** The operator: an adult, 1.72 m, who starts mid-room facing the benches. A
 *  walk is one straight leg between stand points at a brisk adult pace,
 *  capped so a door is never more than a few seconds away. */
export const FIGURE = {
  height: 1.72,
  home: [0.3, 0.4] as [number, number],
  homeFace: Math.PI,
  speed: 1.9, // m/s
  minS: 0.25,
  maxS: 2.6,
  turnS: 0.22, // the turn at each end of a walk
  strideM: 1.4, // one full stride cycle per this distance
  swing: 0.5, // leg swing amplitude, radians
} as const;

export type Path = readonly [number, number][];

/** The baked path from where the operator stands to a piece's stand point. */
export function walkPath(from: [number, number], key: PropKey): Path {
  return [from, propByKey(key).standAt];
}

export function pathLength(path: Path): number {
  let len = 0;
  for (let i = 1; i < path.length; i++) len += Math.hypot(path[i]![0] - path[i - 1]![0], path[i]![1] - path[i - 1]![1]);
  return len;
}

/** The point `d` metres along the path (clamped to its ends). */
export function samplePath(path: Path, d: number): [number, number] {
  if (path.length === 0) return [0, 0];
  let left = Math.max(0, d);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (left >= seg) {
      if (i === path.length - 1) return b; // the end, exactly
      left -= seg;
      continue;
    }
    const t = seg > 0 ? left / seg : 1;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
  return path[path.length - 1]!;
}

export function walkDuration(len: number): number {
  return Math.min(FIGURE.maxS, Math.max(FIGURE.minS, len / FIGURE.speed));
}

/** The yaw that faces from a toward b: yaw 0 faces +z; forward is (sin yaw, cos yaw). */
export function headingOf(a: [number, number], b: [number, number]): number {
  return Math.atan2(b[0] - a[0], b[1] - a[1]);
}

/** The angle equal to `to` (mod 2π) that is nearest `from`: the short way round. */
export function turnTo(from: number, to: number): number {
  let d = (to - from) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return from + d;
}

/** The two turns of a walk — to the heading, then to the piece — each the
 *  short way round, the second anchored on the yaw the first actually leaves
 *  (which may sit a full turn away from the normalised heading). */
export function turnPlan(fromYaw: number, heading: number, face: number): { h1: number; h2: number } {
  const h1 = turnTo(fromYaw, heading);
  return { h1, h2: turnTo(h1, face) };
}

/** A walk is clear when its straight leg passes no footprint closer than `margin`. */
export function pathClear(path: Path, margin = 0.25): boolean {
  const boxes = PROPS.map(footprint);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    for (let s = 0; s <= 64; s++) {
      const t = s / 64;
      const x = a[0] + (b[0] - a[0]) * t;
      const z = a[1] + (b[1] - a[1]) * t;
      for (const f of boxes) if (x > f.x0 - margin && x < f.x1 + margin && z > f.z0 - margin && z < f.z1 + margin) return false;
    }
  }
  return true;
}

/** The shop-window camera: outside the glass, a little to the left, looking
 *  down into the whole room. Drag may turn it within ORBIT; nothing else moves it. */
export const HERO_FOV = 28;
export const HERO_VIEW: Spherical = { az: -0.3, el: 0.36, dist: 19, target: [0, 1.5, -1.0] };
export const ORBIT = { az: 0.45, elUp: 0.22, elDown: 0.1 } as const;

/** Where the camera eases while a door opens: at the piece, closer, lower,
 *  from whichever side keeps the camera inside the side walls — a piece on
 *  the left wall is looked at from the right, and vice versa. */
export function doorView(key: PropKey, from: Spherical): Spherical {
  const p = propByKey(key);
  const side = Math.abs(from.az);
  const az = p.at[0] < -ROOM.w / 4 ? side : p.at[0] > ROOM.w / 4 ? -side : from.az;
  return { az, el: 0.24, dist: 9, target: [p.at[0], 1.2, p.at[1]] };
}

/** One click on a piece: the operator walks there. `n` makes each click new. */
export interface WalkRequest {
  key: PropKey;
  n: number;
}
