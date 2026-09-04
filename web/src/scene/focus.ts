import type { Pose } from "../lib/pose";

export type FocusKey = "overview" | "timechain" | "council" | "hearth" | "farm" | "mind";

export const LAYOUT = {
  timechain: [0, 0, 0],
  farm: [-2.6, 0, 1.2],
  hearth: [2.6, 0, -0.8],
  council: [-2.2, 0, -2.2],
  mind: [2.4, 0.25, 1.6],
} as const satisfies Record<string, readonly [number, number, number]>;

export interface CameraGoal {
  position: [number, number, number];
  target: [number, number, number];
}

/** The camera's rest position for a focus, seeded by the pose (azimuth,
 *  elevation, distance come from the head_hash PRNG). */
export function cameraGoal(focus: FocusKey, pose: Pose): CameraGoal {
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
  const t = targets[focus];
  const az = focus === "overview" ? azimuth * 0.5 : azimuth;
  return {
    target: t,
    position: [t[0] + Math.sin(az) * Math.cos(elevation) * dist, t[1] + Math.sin(elevation) * dist, t[2] + Math.cos(az) * Math.cos(elevation) * dist],
  };
}
