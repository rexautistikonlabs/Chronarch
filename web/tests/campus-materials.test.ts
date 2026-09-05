/** Buildings must read in a screenshot: lifted faces, emissive windows, no black basic material. */
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { CAMPUS, luminance, MAT } from "../src/campus/materials";

describe("campus materials", () => {
  it("no material is a black MeshBasicMaterial; building faces are lifted to at least #2a322e", () => {
    const floor = luminance(new THREE.Color("#2a322e"));
    for (const [name, m] of Object.entries(MAT)) {
      expect(m, name).not.toBeInstanceOf(THREE.MeshBasicMaterial);
      expect((m as THREE.MeshStandardMaterial).color.getHex(), name).not.toBe(0x000000);
    }
    expect(luminance(MAT.lab.color)).toBeGreaterThanOrEqual(floor - 1e-6);
    expect(luminance(MAT.shed.color)).toBeGreaterThan(luminance(new THREE.Color(CAMPUS.background)) * 2);
  });

  it("Chronarch windows are emissive phosphor (light without a bloom composer); the door glows faintly ivory", () => {
    expect(MAT.window.emissiveIntensity).toBeGreaterThan(0);
    expect(MAT.window.emissive.getHexString()).toBe(new THREE.Color(CAMPUS.phosphor).getHexString());
    expect(MAT.door.emissiveIntensity).toBeGreaterThan(0);
    expect(CAMPUS.background).toBe("#0b0d0c");
    expect(CAMPUS.face).toBe("#2a322e");
  });
});
