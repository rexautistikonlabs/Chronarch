/** Animation law, enforced: pointer live, clock dead.
 *  Nothing under web/ (outside node_modules) may spell a repeating animation;
 *  the only per-frame hooks are the two rigs (the well's, the lab's), and
 *  they read delta, never the clock; every canvas is frameloop="demand" and
 *  wakes only while a hand, a walk or a door moves it. The banned literals
 *  are assembled so this file stays clean under the same grep. */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
const RIGS = new Set([RIG, "src/lab/LabRig.tsx"]); // the well's rig and the lab's rig: both read delta, never a clock

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

  it("the two pointer rigs are the only per-frame hooks, and neither reads a clock", () => {
    const files = walk(join(ROOT, "src")).filter((f) => /\.tsx?$/.test(f));
    for (const file of files) {
      const rel = relative(ROOT, file);
      const text = stripComments(readFileSync(file, "utf8")); // code, not prose
      if (!RIGS.has(rel)) expect(text, rel).not.toMatch(/useFrame\(/);
      // no clock anywhere in the scene or the hud: no elapsed time, no wall clock, no rAF loop of our own
      if (rel.startsWith("src/scene") || rel.startsWith("src/hud") || rel.startsWith("src/lab")) {
        expect(text, rel).not.toMatch(/\bclock\b|elapsedTime|getElapsedTime|performance\.now|Date\.now|requestAnimationFrame|setInterval/);
      }
    }
    for (const r of RIGS) expect(readFileSync(join(ROOT, r), "utf8"), r).toMatch(/useFrame\(\(_state, delta\)/); // delta in, clock never
    const well = readFileSync(join(ROOT, "src/scene/Well.tsx"), "utf8");
    expect(well).toMatch(/subscribe\(\(awake\) => \{\s*setLoop\(awake \? "always" : "demand"\)/); // the loop mode follows the ledger …
    expect(well).toMatch(/if \(!awake\) invalidate\(\)/); // … and sleeping paints one last frame
    const policy = readFileSync(join(ROOT, "src/scene/renderPolicy.ts"), "utf8");
    expect(policy).toMatch(/IDLE_MS = 200/);
  });

  it("the well is drawn on demand, with a cheap compositor", () => {
    const well = readFileSync(join(ROOT, "src/scene/Well.tsx"), "utf8");
    expect(well).toContain("frameloop={loop}"); // the prop is the ledger's word, never a literal "always"
    expect(well).toMatch(/useState<"always" \| "demand">\("demand"\)/); // and it starts asleep
    expect(well).toContain("dpr={[1, 1.5]}");
    expect(well).toContain("shadows={false}");
    expect(well).not.toMatch(/castShadow|receiveShadow/);
    const energy = readFileSync(join(ROOT, "src/scene/Energy.tsx"), "utf8");
    expect(energy).toContain("if (!spiking) return null;"); // no EffectComposer at rest
    expect(energy).toMatch(/multisampling=\{0\}/);
  });

  it("the lab on / obeys the same law: demand at rest, ledger-driven loop, no shadows, no post-processing, no environment map, no texture loader, no physics, no well import", () => {
    const lab = readFileSync(join(ROOT, "src/lab/Lab.tsx"), "utf8");
    expect(lab).toContain("frameloop={loop}");
    expect(lab).toMatch(/useState<"always" \| "demand">\("demand"\)/);
    expect(lab).toMatch(/subscribe\(\(awake\) => \{\s*setLoop\(awake \? "always" : "demand"\)/);
    expect(lab).toMatch(/if \(!awake\) invalidate\(\)/);
    expect(lab).toContain("dpr={[1, 1.5]}");
    expect(lab).toContain("shadows={false}");
    expect(lab).not.toMatch(/castShadow|receiveShadow|EffectComposer|Environment|useTexture|TextureLoader|RGBELoader|Physics|useRapier|cannon|<iframe|useVideoTexture|<video/);
    expect(lab).not.toMatch(/scene\/Well|Catalogue3D|scene\/Timechain|scene\/Council/);
    // the baked stills are drawn once into a 2D canvas: no image file, no fetch, no network
    const baked = stripComments(readFileSync(join(ROOT, "src/lab/baked.ts"), "utf8"));
    expect(baked).toContain("CanvasTexture");
    expect(baked).not.toMatch(/fetch\(|new Image\(|\.png|\.jpg|\.webp|<img|XMLHttpRequest|import\(/);
    const landing = readFileSync(join(ROOT, "src/pages/Landing.tsx"), "utf8");
    expect(landing).not.toMatch(/scene\/Well|Catalogue3D|useFrame|<Canvas|frameloop/); // the page never sets the loop mode
    expect(stripComments(landing)).not.toMatch(/addEventListener\("scroll"|touch\(/); // scroll moves nothing: no frame is drawn for it
    // no title overlay exists; the door is ≤ 800 ms
    expect(existsSync(join(ROOT, "src/components/TitleBeat.tsx"))).toBe(false);
    const doorSrc = readFileSync(join(ROOT, "src/components/DoorIris.tsx"), "utf8");
    expect(Number(doorSrc.match(/DOOR_MS = (\d+)/)![1])).toBeLessThanOrEqual(800);
    const rig = readFileSync(join(ROOT, "src/lab/LabRig.tsx"), "utf8");
    expect(rig).toMatch(/hold\("/);
    expect(stripComments(rig)).not.toMatch(/parallax|Physics|velocity|wheelbase|honk|wheel|autoRot|spin|follow/i); // drag orbit only; nothing turns on its own
    expect(stripComments(rig)).not.toMatch(/gsap/); // the camera has no tween of its own: it damps toward the goal
    // the operator's walk is one held, invalidating, one-shot timeline per click; idle is still
    const figure = readFileSync(join(ROOT, "src/lab/Figure.tsx"), "utf8");
    const timelines = figure.match(/gsap\.timeline\(\{[\s\S]*?\}\);/g) ?? [];
    expect(timelines).toHaveLength(1);
    expect(timelines[0]).toMatch(/onUpdate: \(\) => \{[\s\S]*invalidate\(\)/);
    expect(figure).toMatch(/hold\("walk"\)/);
    expect(stripComments(figure)).not.toMatch(/useFrame|breath|sway|idle|bob|hover/i);
    expect(stripComments(figure)).toMatch(/ease: "none"/); // a walk at a constant pace, distance-driven
  });

  it("every tween that moves the camera, the iris or the bloom invalidates on every tick and holds the loop", () => {
    for (const rel of ["src/scene/PointerRig.tsx", "src/hud/Iris.tsx", "src/scene/Energy.tsx", "src/scene/Timechain.tsx", "src/scene/Council.tsx", "src/scene/DummyMind.tsx", "src/components/DoorIris.tsx", "src/lab/Figure.tsx"]) {
      const text = readFileSync(join(ROOT, rel), "utf8");
      const timelines = text.match(/gsap\.timeline\(\{[\s\S]*?\}\);/g) ?? [];
      expect(timelines.length, rel).toBeGreaterThan(0);
      for (const t of timelines) {
        expect(t, `${rel}: ${t}`).toMatch(/onUpdate: (invalidate|\(\) => \{[\s\S]*invalidate\(\))/);
      }
      expect(text, rel).toMatch(/hold\("/);
    }
  });
});
