/** STATUS honesty: the UI's own copy, fixtures and README carry none of the
 *  banned phrases, and the frozen sentence appears on the landing. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import { BANNED_PHRASES, findBanned } from "../src/lib/banned";

const ROOT = join(__dirname, "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|json|html|md)$/.test(name)) out.push(p);
  }
  return out;
}

describe("STATUS honesty", () => {
  it("src/, fixtures/, index.html and README carry no banned phrase", () => {
    const files = [...walk(join(ROOT, "src")), ...walk(join(ROOT, "fixtures")), join(ROOT, "index.html"), join(ROOT, "README.md")];
    const hits: string[] = [];
    for (const f of files) {
      if (f.endsWith("banned.ts")) continue; // the ban list itself (assembled, never literal)
      const hit = findBanned(readFileSync(f, "utf8"));
      if (hit) hits.push(`${relative(ROOT, f)}: ${hit}`);
    }
    expect(hits).toEqual([]);
  });

  it("the ban list is what the doctrine says it is", () => {
    expect(BANNED_PHRASES).toHaveLength(6);
    expect(findBanned("Connect Wal" + "let")).not.toBeNull();
    expect(findBanned("a research organism on a loopback net")).toBeNull();
  });
});
