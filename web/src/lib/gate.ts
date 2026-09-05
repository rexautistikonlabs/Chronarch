/** The gate: law before any 3D. A still panel a visitor reads once and
 *  accepts; the flag rexmetrix.gate.v1 in this browser skips it afterwards.
 *  Also the two doors that leave this origin and the attributions (credit,
 *  not endorsement). No network, no clock. */
export const GATE_KEY = "rexmetrix.gate.v1";

export const GATE_LINES: readonly string[] = [
  "RexMetrix is a product house. Chronarch and Continuum are research software.",
  "Not a public chain. Not Foundation-endorsed. Not a diagnostic. Not a medical device.",
  "Continuum is a simulation; its numbers are model outputs, not measurements of any person.",
  "Laterion is not shipping here.",
];

export const ATTRIBUTIONS: readonly { href: string; label: string; what: string }[] = [
  { href: "https://rexautistikonlabs.org", label: "rexautistikonlabs.org", what: "literature and the Autistikon programme specification" },
  { href: "https://cyberphysics.ai", label: "cyberphysics.ai", what: "cited architecture / public materials" },
];
export const ATTRIBUTION_NOTE = "Credit, not endorsement.";

export const CONTINUUM_URL = "https://continuum.rexmetrix.com";
export const TITLE_LINE = "Measurement is King!";

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function seenGate(): boolean {
  try {
    return storage()?.getItem(GATE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markGate(): void {
  try {
    storage()?.setItem(GATE_KEY, "1");
  } catch {
    // no storage: the gate closes for this mount and returns next time
  }
}

/** Leaving this origin goes through one function so a test can watch it. */
export const exits = {
  leave(href: string): void {
    window.location.assign(href);
  },
};
