// `npm run check:loops` — the same grep the doctrine asks for, runnable
// without vitest. Exits 1 on any hit. The literals are assembled so this
// script stays clean under its own grep.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set(["node_modules", "dist", ".vite", ".git"]);
const BANNED = ["repeat: " + "Infinity", "auto" + "Rotate"];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const hits = [];
for (const f of walk(ROOT)) {
  const text = readFileSync(f, "utf8");
  for (const b of BANNED) if (text.includes(b)) hits.push(`${relative(ROOT, f)}: ${b}`);
}
if (hits.length) {
  console.error("repeating-animation literals found:\n  " + hits.join("\n  "));
  process.exit(1);
}
console.log("check:loops ok — no repeating-animation literal under web/");
