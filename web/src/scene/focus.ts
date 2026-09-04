import type { Pose } from "../lib/pose";

export type FocusKey = "overview" | "timechain" | "council" | "hearth" | "farm" | "mind";

export const LAYOUT = {
  timechain: [0, 0, 0],
  farm: [-2.6, 0, 1.2],
  hearth: [2.6, 0, -0.8],
  council: [-2.2, 0, -2.2],
  mind: [2.4, 0.25, 1.6],
} as const satisfies Record<string, readonly [number, number, number]>;

/** A camera goal in spherical terms around a target: azimuth, elevation,
 *  distance. The pointer rig damps toward this; a focus change tweens it once. */
export interface Spherical {
  az: number;
  el: number;
  dist: number;
  target: [number, number, number];
}

export interface CameraGoal {
  position: [number, number, number];
  target: [number, number, number];
}

export function cameraSpherical(focus: FocusKey, pose: Pose): Spherical {
  const { azimuth, elevation, distance } = pose.camera;
  const targets: Record<FocusKey, [number, number, number]> = {
    overview: [0.2, 0.5, 0],
    timechain: [0, 0.6, 0],
    council: [LAYOUT.council[0], 0.3, LAYOUT.council[2]],
    hearth: [LAYOUT.hearth[0], 0.8, LAYOUT.hearth[2]],
    farm: [LAYOUT.farm[0], 0.4, LAYOUT.farm[2]],
    mind: [LAYOUT.mind[0], 0.4, LAYOUT.mind[2]],
  };
  const dist = focus === "overview" ? distance + 2.2 : focus === "timechain" ? distance : 4.2;
  const az = focus === "overview" ? azimuth * 0.5 : azimuth;
  return { az, el: elevation, dist, target: targets[focus] };
}

export function sphericalToPosition(s: Spherical): [number, number, number] {
  const [tx, ty, tz] = s.target;
  return [tx + Math.sin(s.az) * Math.cos(s.el) * s.dist, ty + Math.sin(s.el) * s.dist, tz + Math.cos(s.az) * Math.cos(s.el) * s.dist];
}

/** The camera's rest position for a focus, seeded by the pose. */
export function cameraGoal(focus: FocusKey, pose: Pose): CameraGoal {
  const s = cameraSpherical(focus, pose);
  return { target: s.target, position: sphericalToPosition(s) };
}

/** Critically-damped step toward a goal: dt-scaled so frame rate does not
 *  change the feel. `rate` ~ 1/seconds to close most of the gap. Pure. */
export function damp(current: number, goal: number, dt: number, rate = 9): number {
  const k = 1 - Math.exp(-Math.max(0, dt) * rate);
  return current + (goal - current) * k;
}
