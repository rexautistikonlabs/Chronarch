/** Animation law, enforced: nothing under web/ (outside node_modules) may
 *  spell a repeating animation. The banned literals are assembled here so this
 *  file itself stays clean under the same grep. */
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
  "iteration-count:" + "infinite",
];

describe("animation law", () => {
  it("web/ spells no repeating animation", () => {
    const hits: string[] = [];
    for (const file of walk(ROOT)) {
      const text = readFileSync(file, "utf8");
      for (const b of BANNED) {
        if (text.includes(b)) hits.push(`${relative(ROOT, file)}: ${b}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("every GSAP timeline is built with the one-shot constant", () => {
    const src = walk(join(ROOT, "src")).filter((f) => /\.tsx?$/.test(f));
    for (const file of src) {
      const text = readFileSync(file, "utf8");
      const timelines = text.match(/gsap\.timeline\(([^)]*)\)/g) ?? [];
      for (const t of timelines) expect(t, `${relative(ROOT, file)}: ${t}`).toContain("...ONE_SHOT");
      expect(text, relative(ROOT, file)).not.toMatch(/gsap\.(to|from|fromTo)\(/); // no stray tweens outside a timeline
      expect(text, relative(ROOT, file)).not.toMatch(/useFrame\(/); // no per-frame drift
    }
  });
});
