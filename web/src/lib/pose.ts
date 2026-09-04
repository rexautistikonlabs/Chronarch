/** Rest pose: a pure function of SceneState via the hash PRNG.
 *
 * Everything the scene holds still at is decided here, once, from the state —
 * nothing in the scene drifts, idles or cycles. Two head_hashes → two poses.
 */
import { rngFromSeed } from "./prng";
import type { SceneState } from "./session";

export interface RingPose {
  y: number;
  radius: number;
  tube: number;
  azimuth: number; // radians; where the seam sits
  tilt: [number, number]; // small per-ring tilt (x, z)
  scarAt: number | null; // radians along the rim, or null
}

export interface RodPose {
  x: number;
  z: number;
  height: number;
  raised: boolean; // an I3 fault lifts one rod out of its seat
}

export interface Pose {
  seed: string;
  stackTilt: [number, number]; // whole-stack lean (x, z) in radians
  stackYaw: number;
  rings: RingPose[];
  rods: RodPose[];
  hearth: { legLean: number; legSpread: number; lockHeight: number; prestressed: boolean; cableTension: number };
  council: { seatYaw: number; seatCount: number; docked: boolean; parkOffset: [number, number] };
  mind: { yaw: number; lidOpen: number; attested: boolean };
  camera: { azimuth: number; elevation: number; distance: number };
}

const RING_STEP = 0.26;

export function posePalette(state: SceneState) {
  return {
    void: "#07090C",
    ivory: "#E8E4DA",
    ring: "#9AA3AD",
    genesis: "#C8CFD6",
    seat: "#5C6670",
    docked: "#7FB3A6",
    parked: "#4A5560",
    box: "#3A4048",
    rod: "#B9C0C7",
    // scar amber appears ONLY when there is a scar or a real I3 fault
    amber: state.scar_count > 0 || state.i3 !== null ? "#E0A32E" : "#9AA3AD",
    fault: state.i3 !== null ? "#E0A32E" : "#B9C0C7",
  };
}

export function derivePose(state: SceneState): Pose {
  const seed = state.head_hash || `${state.identity}:${state.height}`;
  const rng = rngFromSeed(seed);

  const stackTilt: [number, number] = [rng.range(-0.11, 0.11), rng.range(-0.11, 0.11)];
  const stackYaw = rng.range(0, Math.PI * 2);

  // Which ring heights carry a scar (never Ring 0 — genesis has no lesion).
  const scarHeights = new Set<number>();
  const candidates = Array.from({ length: Math.max(0, state.ring_count - 1) }, (_, i) => i + 1);
  for (let i = 0; i < Math.min(state.scar_count, candidates.length); i++) {
    const idx = rng.int(0, candidates.length - 1);
    scarHeights.add(candidates.splice(idx, 1)[0]!);
  }

  const rings: RingPose[] = [];
  for (let h = 0; h < state.ring_count; h++) {
    rings.push({
      y: h * RING_STEP,
      radius: 1.15 + rng.range(-0.05, 0.05),
      tube: h === 0 ? 0.075 : 0.05,
      azimuth: rng.range(0, Math.PI * 2),
      tilt: [rng.range(-0.02, 0.02), rng.range(-0.02, 0.02)],
      scarAt: scarHeights.has(h) ? rng.range(0, Math.PI * 2) : null,
    });
  }

  // Pins: rods in a well. The pinset size is not in the JSON, so the count is
  // seeded (5..9) — what IS data is pins_ok / I3, which decides the raised rod.
  const rodCount = rng.int(5, 9);
  const rods: RodPose[] = [];
  const faultIndex = state.i3 !== null || !state.pins_ok ? rng.int(0, rodCount - 1) : -1;
  for (let i = 0; i < rodCount; i++) {
    const a = (i / rodCount) * Math.PI * 2 + rng.range(-0.15, 0.15);
    const r = rng.range(0.15, 0.55);
    rods.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, height: rng.range(0.5, 0.95), raised: i === faultIndex });
  }

  const prestressed = (state.won_slots ?? 0) > 0 || Object.keys(state.credits_by_reason).length > 0;
  const hearth = {
    legLean: rng.range(0.18, 0.3),
    legSpread: rng.range(0.55, 0.75),
    lockHeight: prestressed ? rng.range(1.1, 1.3) : 0.65,
    prestressed,
    cableTension: prestressed ? 1 : 0.35,
  };

  const council = {
    seatYaw: rng.range(-0.35, 0.35),
    seatCount: Math.max(1, state.seats.length),
    docked: !!state.proposal?.ratified,
    parkOffset: [rng.range(1.5, 1.9) * rng.sign(), rng.range(0.6, 1.0)] as [number, number],
  };

  const mind = { yaw: rng.range(-0.6, 0.6), lidOpen: 0, attested: state.attested };

  const camera = {
    azimuth: rng.range(-0.9, 0.9),
    elevation: rng.range(0.28, 0.42),
    distance: 7.4 + Math.min(3, state.ring_count * 0.12),
  };

  return { seed, stackTilt, stackYaw, rings, rods, hearth, council, mind, camera };
}
