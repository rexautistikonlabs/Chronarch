/** The legal strip: law that is always visible, never a wall. The LLC, the
 *  two products, Continuum's one state, the split from Labs, the data
 *  sentence, credit-not-endorsement. Also the one buyer line, the one
 *  Continuum URL, the one source repository, and the exit that leaves this
 *  origin. No storage is required to see the catalogue; no network. */
export const LLC = "RexMetrix Technologies, LLC";

export const LEGAL = {
  llc: LLC,
  products: "Chronarch and Continuum are research software. Not a diagnostic. Not a medical device.",
  continuum: "Continuum: a literature-informed biotensegrity and afferent-flow teaching simulation on https://continuum.rexmetrix.com. Model outputs, not measurements of a person. Not a programme ledger.",
  split: "Rex Autistikōn Labs (https://rexautistikonlabs.org) is an independent 501(c)(3). Labs does not sell these products. RexMetrix does not speak for Labs.",
  data: "This browser may store a preference and, on the workbench, a project in this browser only. We do not sell that data. If we later record usage to improve the software or the site, this notice will say so first.",
  laterion: "Laterion is not shipping here.",
} as const;

export const LEGAL_LINES: readonly string[] = [LEGAL.llc, LEGAL.products, LEGAL.continuum, LEGAL.split, LEGAL.data, LEGAL.laterion];

export const BUYER_LINE = "A local workbench for a group to declare fields, pin sources, and write a synthesis that names its parents. Continuum is a separate simulation on its own host.";

export const ATTRIBUTIONS: readonly { href: string; label: string; what: string }[] = [
  { href: "https://rexautistikonlabs.org", label: "rexautistikonlabs.org", what: "Literature and the Autistikon programme specification." },
  { href: "https://cyberphysics.ai", label: "cyberphysics.ai", what: "Cited architecture / public materials." },
];
export const ATTRIBUTION_NOTE = "Credit, not endorsement.";

/** Continuum's only product URL — the door. */
export const CONTINUUM_URL = "https://continuum.rexmetrix.com";
/** Continuum's source repository — named once, as a source, never as the door. */
export const SCIENTIFICLAB_URL = "https://github.com/rexautistikonlabs/scientificlab";

/** Leaving this origin goes through one function so a test can watch it:
 *  one navigation, in this tab. (A new-tab door was tried and removed — with
 *  "noopener" the browser returns null from the open call, so a same-tab
 *  fallback fired too and one click navigated twice. See BUILD_LOG.) The
 *  door plane and the ledger are reset by the document's hide/show events, so
 *  Back from the other origin shows the campus, not a plane. */
export const exits = {
  leave(href: string): void {
    window.location.assign(href);
  },
};
