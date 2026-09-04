/** Language the UI refuses to display.
 *
 * `BANNED_PHRASES` is the older technical screen (kept: it still runs over
 * pasted session text). `VISITOR_BANNED` is RexMetrix product law for every
 * visitor-facing string (specs/LEGAL.md): the floor sells programmes, not a
 * chain, a coin, a treatment or an endorsement. Phrases are assembled so the
 * ban list never contains what it bans. */
export const BANNED_PHRASES: readonly string[] = [
  "main" + "net",
  "chip-48 compat" + "ible",
  "connect wal" + "let",
  "token pr" + "ice",
  "tv" + "l",
  "live net" + "work",
];

export const VISITOR_BANNED: readonly string[] = [
  "public block" + "chain",
  "main" + "net",
  "wal" + "let",
  "token list" + "ing",
  "chronos as mo" + "ney",
  "council govern" + "ance",
  "digital organ" + "ism",
  "chip-" + "48",
  "min" + "ing",
  "tv" + "l",
  "fascia ther" + "apy",
  "autism treat" + "ment",
  "diagnostic sc" + "ore",
  "foundation-endor" + "sed",
  "l" + "1",
];

const WHOLE_WORD = new Set(["tv" + "l", "l" + "1", "min" + "ing"]);
// The one phrase that may appear negated: "not Foundation-endorsed" is the honesty sentence.
const NEGATABLE = new Set(["foundation-endor" + "sed"]);

function occurs(text: string, phrase: string): boolean {
  const t = text.toLowerCase();
  if (WHOLE_WORD.has(phrase)) {
    const re = new RegExp(`(^|[^a-z0-9])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`, "i");
    return re.test(t);
  }
  if (NEGATABLE.has(phrase)) {
    const re = /(^|[^a-z])(not|never|no)[\s-]+foundation-endorsed/g;
    const stripped = t.replace(re, "$1");
    return stripped.includes(phrase);
  }
  return t.includes(phrase);
}

export function findBanned(text: string): string | null {
  for (const phrase of BANNED_PHRASES) {
    const hit = phrase === "tv" + "l" ? /\btvl\b/.test(text.toLowerCase()) : text.toLowerCase().includes(phrase);
    if (hit) return phrase;
  }
  return null;
}

export function findVisitorBanned(text: string): string | null {
  for (const phrase of VISITOR_BANNED) if (occurs(text, phrase)) return phrase;
  return null;
}

export function assertHonest(text: string): string {
  const hit = findBanned(text) ?? findVisitorBanned(text);
  if (hit) return `[refused: session text contained "${hit}"]`;
  return text;
}
