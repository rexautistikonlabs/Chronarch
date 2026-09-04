/** Animation law, enforced: pointer live, clock dead.
 *  Nothing under web/ (outside node_modules) may spell a repeating animation;
 *  the only per-frame hook is the pointer rig, and it reads delta, never the
 *  clock; the canvas is frameloop="demand" and wakes only while the pointer
 *  moves it. The banned literals are assembled so this file stays clean under
 *  the same grep. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..");
const SKIP = new Set(["node_modules", "dist", ".vite", ".git"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?|mjs|css|html|md|json)$/.test(name)) out.push(p);
  }
  return out;
}

const BANNED = [
  "repeat: " + "Infinity",
  "repeat:" + "Infinity",
  "repeat: " + "-1",
  "repeat:" + "-1",
  "auto" + "Rotate",
  "Animation" + "Mixer",
  "yoyo: " + "true",
  "animation-iteration-count: " + "infinite",
  "frameloop=" + '"always"', // "always" is only ever set at runtime by the rig, for as long as the pointer moves
];

const RIG = "src/scene/PointerRig.tsx";

describe("animation law", () => {
  it("web/ spells no repeating animation", () => {
    const hits: string[] = [];
    for (const file of walk(ROOT)) {
      const text = readFileSync(file, "utf8");
      for (const b of BANNED) if (text.includes(b)) hits.push(`${relative(ROOT, file)}: ${b}`);
    }
    expect(hits).toEqual([]);
  });

  it("every GSAP timeline is one-shot, and no stray tween exists outside one", () => {
    for (const file of walk(join(ROOT, "src")).filter((f) => /\.tsx?$/.test(f))) {
      const text = readFileSync(file, "utf8");
      for (const t of text.match(/gsap\.timeline\(([^)]*)\)/g) ?? []) expect(t, `${relative(ROOT, file)}: ${t}`).toContain("...ONE_SHOT");
      expect(text, relative(ROOT, file)).not.toMatch(/gsap\.(to|from|fromTo)\(/);
    }
  });

  const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("the pointer rig is the only per-frame hook, and it never reads a clock", () => {
    const files = walk(join(ROOT, "src")).filter((f) => /\.tsx?$/.test(f));
    for (const file of files) {
      const rel = relative(ROOT, file);
      const text = stripComments(readFileSync(file, "utf8")); // code, not prose
      if (rel !== RIG) expect(text, rel).not.toMatch(/useFrame\(/);
      // no clock anywhere in the scene or the hud: no elapsed time, no wall clock, no rAF loop of our own
      if (rel.startsWith("src/scene") || rel.startsWith("src/hud")) {
        expect(text, rel).not.toMatch(/\bclock\b|elapsedTime|getElapsedTime|performance\.now|Date\.now|requestAnimationFrame|setInterval/);
      }
    }
    const rig = readFileSync(join(ROOT, RIG), "utf8");
    expect(rig).toMatch(/useFrame\(\(_state, delta\)/); // delta in, clock never
    expect(rig).toMatch(/setFrameloop\("demand"\)/); // it always goes back to sleep
    expect(rig).toMatch(/POINTER_STOP_MS = 300/);
  });

  it("the well is drawn on demand", () => {
    const well = readFileSync(join(ROOT, "src/scene/Well.tsx"), "utf8");
    expect(well).toContain('frameloop="demand"');
  });
});
