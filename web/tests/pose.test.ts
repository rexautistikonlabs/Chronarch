import { describe, expect, it } from "vitest";

import { derivePose } from "../src/lib/pose";
import { rngFromSeed } from "../src/lib/prng";
import { emptyState, type SceneState } from "../src/lib/session";

function state(head_hash: string, extra: Partial<SceneState> = {}): SceneState {
  return { ...emptyState(), identity: "t", height: 4, ring_count: 5, head_hash, ...extra };
}

describe("state-driven rest pose", () => {
  it("the PRNG is deterministic for a seed", () => {
    const a = rngFromSeed("ecdbe6b08f83b611a2dd5c46935f95dd2e71d7ac006349de3b5aaebf9d1ad1ae");
    const b = rngFromSeed("ecdbe6b08f83b611a2dd5c46935f95dd2e71d7ac006349de3b5aaebf9d1ad1ae");
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it("the same head_hash always yields the same pose", () => {
    const h = "bde78f7d640209dd88068feeb8c8e8fafb3d2c3480a669d8f88c1f6865a9b133";
    expect(derivePose(state(h))).toEqual(derivePose(state(h)));
  });

  it("two different head_hashes yield visibly different rest poses", () => {
    const p1 = derivePose(state("ecdbe6b08f83b611a2dd5c46935f95dd2e71d7ac006349de3b5aaebf9d1ad1ae"));
    const p2 = derivePose(state("bde78f7d640209dd88068feeb8c8e8fafb3d2c3480a669d8f88c1f6865a9b133"));
    const lean = (p: typeof p1) => Math.hypot(p.stackTilt[0] - p2.stackTilt[0], p.stackTilt[1] - p2.stackTilt[1]);
    expect(lean(p1)).toBeGreaterThan(0.01); // > ~0.6° of lean difference
    expect(Math.abs(p1.stackYaw - p2.stackYaw)).toBeGreaterThan(0.05);
    expect(p1.camera.azimuth).not.toBeCloseTo(p2.camera.azimuth, 2);
    expect(p1.rings.map((r) => r.azimuth)).not.toEqual(p2.rings.map((r) => r.azimuth));
  });

  it("ring_count and scar_count are data, not seed: rings match the count and scars sit on rims", () => {
    const p = derivePose(state("ab".repeat(32), { ring_count: 7, height: 6, scar_count: 2 }));
    expect(p.rings).toHaveLength(7);
    expect(p.rings.filter((r) => r.scarAt !== null)).toHaveLength(2);
    expect(p.rings[0]!.scarAt).toBeNull(); // Ring 0 never carries a lesion
  });

  it("I3 raises exactly one rod; PINS_OK raises none; ratified docks the proposal", () => {
    const ok = derivePose(state("cd".repeat(32)));
    expect(ok.rods.filter((r) => r.raised)).toHaveLength(0);
    expect(ok.council.docked).toBe(false);
    const fault = derivePose(state("cd".repeat(32), { pins_ok: false, i3: { interface: "I3" } }));
    expect(fault.rods.filter((r) => r.raised)).toHaveLength(1);
    const ratified = derivePose(state("cd".repeat(32), { proposal: { proposal_id: "p", major_class: "M6", outcome: "approved", ratified: true } }));
    expect(ratified.council.docked).toBe(true);
  });
});
