// `npm run check:chrome` — visitor chrome law, runnable without vitest and run
// before every build. Exits 1 on any hit.
//  1. "Continuum" never within 40 characters of "forthcoming" in visitor chrome.
//  2. The GitHub source URL is never the primary CTA (a cta- test id, a hud-button, or a door).
//  3. The landing chrome carries no substrate word.
//  4. "Continuum" never near "ledger", "Timechain" or "forthcoming" in visitor files or the READMEs (the one
//     allowed negation, "not a programme ledger", is stripped first).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = ["src/pages/Landing.tsx", "src/components/LegalStrip.tsx", "src/lib/legal.ts", "src/campus", "src/hud/Hud.tsx", "src/hud/FloorHud.tsx", "src/components/StatusBanner.tsx", "src/lib/human.ts", "src/pages/About.tsx", "index.html"];
const READMES = ["README.md", "../README.md"];
const SUBSTRATE = [/\bDACO\b/, /\bTimechain\b/, /\bChronos\b/, /\bCouncil\b/, /not a public chain/i, /\bChia\b/, /\bPoST\b/];

function files(p) {
  const abs = join(ROOT, p);
  if (statSync(abs).isDirectory()) return readdirSync(abs).flatMap((n) => files(join(p, n)));
  return [p];
}
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'])\/\/.*$/gm, "$1"); // code and strings, not comments

const hits = [];
for (const rel of CHROME.flatMap(files)) {
  const text = strip(readFileSync(join(ROOT, rel), "utf8"));
  // each string literal and each JSX text node on its own: a visitor sentence never puts the two words together
  for (const m of text.match(/"[^"\n]*"|'[^'\n]*'|`[^`]*`|>[^<{}]+</g) ?? []) {
    if (/Continuum[\s\S]{0,40}forthcoming|forthcoming[\s\S]{0,40}Continuum/i.test(m)) hits.push(`${rel}: "Continuum" within 40 characters of "forthcoming" — ${m.slice(0, 100)}`);
  }
  for (const line of text.split("\n")) {
    if (line.includes("github.com/rexautistikonlabs/scientificlab") && /cta-|hud-button|door/.test(line)) hits.push(`${rel}: the GitHub URL used as a primary CTA — ${line.trim().slice(0, 100)}`);
  }
  for (const re of SUBSTRATE) if (re.test(text)) hits.push(`${rel}: substrate word ${re} on landing chrome`);
}
const NEAR = /Continuum[\s\S]{0,60}(ledger|Timechain|forthcoming)|(ledger|Timechain|forthcoming)[\s\S]{0,60}Continuum/gi;
const negate = (t) => t.replace(/not a programme ledger/gi, "");
// source files: each string literal and JSX text node on its own (code and data adjacency are not sentences)
for (const rel of CHROME.flatMap(files)) {
  const text = strip(readFileSync(join(ROOT, rel), "utf8"));
  for (const lit of text.match(/"[^"\n]*"|'[^'\n]*'|`[^`]*`|>[^<{}]+</g) ?? []) {
    for (const m of negate(lit).match(NEAR) ?? []) hits.push(`${rel}: Continuum near ledger/Timechain/forthcoming — ${m.replace(/\s+/g, " ").slice(0, 100)}`);
  }
}
// the READMEs: prose, whole text
for (const rel of READMES) {
  for (const m of negate(readFileSync(join(ROOT, rel), "utf8")).match(NEAR) ?? []) hits.push(`${rel}: Continuum near ledger/Timechain/forthcoming — ${m.replace(/\s+/g, " ").slice(0, 100)}`);
}
if (hits.length) {
  console.error("visitor chrome law broken:\n  " + hits.join("\n  "));
  process.exit(1);
}
console.log("check:chrome ok — Continuum has one state and one door; no substrate word on the landing chrome");
