import { describe, expect, it } from "vitest";

import { cameraSpherical, damp, sphericalToPosition } from "../src/scene/focus";
import { IDLE_MS } from "../src/scene/renderPolicy";
import { derivePose } from "../src/lib/pose";
import { emptyState } from "../src/lib/session";

describe("pointer rig maths (pure)", () => {
  it("damping converges and is frame-rate independent in the limit", () => {
    let x = 0;
    for (let i = 0; i < 120; i++) x = damp(x, 1, 1 / 60);
    expect(x).toBeGreaterThan(0.99);
    let y = 0;
    for (let i = 0; i < 60; i++) y = damp(y, 1, 1 / 30);
    expect(Math.abs(x - y)).toBeLessThan(0.02);
    expect(damp(1, 1, 0.016)).toBe(1); // at the goal it stays put: no idle drift
    expect(damp(0.5, 0.5, 0)).toBe(0.5);
  });

  it("the loop sleeps 200 ms after the last hold is released", () => {
    expect(IDLE_MS).toBe(200);
  });

  it("spherical goals are seeded by the pose and land where cameraGoal used to", () => {
    const pose = derivePose({ ...emptyState(), identity: "t", height: 4, ring_count: 5, head_hash: "ab".repeat(32) });
    const s = cameraSpherical("timechain", pose);
    const p = sphericalToPosition(s);
    expect(Math.hypot(p[0] - s.target[0], p[1] - s.target[1], p[2] - s.target[2])).toBeCloseTo(s.dist, 6);
    const other = derivePose({ ...emptyState(), identity: "t", height: 4, ring_count: 5, head_hash: "cd".repeat(32) });
    expect(cameraSpherical("timechain", other).az).not.toBeCloseTo(s.az, 2);
  });
});
