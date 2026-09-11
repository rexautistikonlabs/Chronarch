/** The room must read in a screenshot: no black basic material, lifted walls
 *  and bench tops; what is switched on emits (the display, the luminaires),
 *  what is switched off does not (the cover, the dead isolator); the coat is
 *  ivory; the tape is pale, not amber. */
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { LAB, luminance, MAT } from "../src/lab/materials";

describe("lab materials", () => {
  it("no material is a black MeshBasicMaterial; walls and bench tops are lifted above the floor", () => {
    for (const [name, m] of Object.entries(MAT)) {
      expect(m, name).not.toBeInstanceOf(THREE.MeshBasicMaterial);
      expect(m, name).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(m.color.getHex(), name).not.toBe(0x000000);
    }
    const bg = luminance(new THREE.Color(LAB.background));
    expect(luminance(MAT.wall.color)).toBeGreaterThan(bg * 3);
    expect(luminance(MAT.benchTop.color)).toBeGreaterThan(luminance(MAT.floor.color));
    expect(LAB.background).toBe("#0b0d0c");
  });

  it("switched on emits, switched off does not", () => {
    expect(MAT.screen.emissiveIntensity).toBeGreaterThan(0);
    expect(MAT.screen.emissive.getHexString()).toBe(new THREE.Color(LAB.phosphor).getHexString());
    expect(MAT.luminaire.emissiveIntensity).toBeGreaterThan(0);
    for (const name of ["shroud", "dead", "frame", "benchTop", "coat"] as const) expect(MAT[name].emissive.getHex(), name).toBe(0x000000);
    expect(luminance(MAT.shroud.color)).toBeLessThan(luminance(new THREE.Color(LAB.ivory)) * 0.5); // a matte cover, not a lit surface
  });

  it("the coat is ivory; the tape is pale and not amber; the glass is faint and takes no depth", () => {
    expect(MAT.coat.color.getHexString()).toBe("e8e4d8");
    // the tape as authored (sRGB), not as three stores it (linear)
    const tape = new THREE.Color().setHex(parseInt(LAB.tape.slice(1), 16), THREE.LinearSRGBColorSpace);
    const hsl = { h: 0, s: 0, l: 0 };
    tape.getHSL(hsl, THREE.LinearSRGBColorSpace);
    expect(hsl.s).toBeLessThan(0.25); // desaturated: not a yellow or an amber warning colour
    expect(hsl.l).toBeGreaterThan(0.6);
    expect(LAB.tape.toLowerCase()).not.toBe("#e0a32e");
    expect(MAT.glass.transparent).toBe(true);
    expect(MAT.glass.opacity).toBeLessThan(0.2);
    expect(MAT.glass.depthWrite).toBe(false);
  });
});
