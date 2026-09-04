/** Language the UI refuses to display. STATUS honesty is enforced in code,
 *  not just in copy: `assertHonest` screens any text the app renders from a
 *  session, so a pasted JSON cannot turn the instrument into a billboard. */
export const BANNED_PHRASES: readonly string[] = [
  "main" + "net",
  "chip-48 compat" + "ible",
  "connect wal" + "let",
  "token pr" + "ice",
  "tv" + "l",
  "live net" + "work",
];

export function findBanned(text: string): string | null {
  const t = text.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    // "tvl" only as a whole word, everything else as a substring
    const hit = phrase === "tv" + "l" ? /\btvl\b/.test(t) : t.includes(phrase);
    if (hit) return phrase;
  }
  return null;
}

export function assertHonest(text: string): string {
  const hit = findBanned(text);
  if (hit) return `[refused: session text contained "${hit}"]`;
  return text;
}
