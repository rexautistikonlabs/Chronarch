/** First run: three steps an amateur can finish without the glossary — one
 *  real Compare, one Autistikon Converge, one pack. A professional skips it;
 *  one flag in this browser remembers either outcome. No new science: the
 *  steps only read the notes the bench already wrote. */
import type { FilterKey } from "./filters";
import { STAND_INS } from "./filters";
import type { ProjectNote } from "./project";

export const FIRST_RUN_KEY = "rexmetrix.seenFirstRun.v1";

export interface FirstRunStep {
  n: 1 | 2 | 3;
  text: string;
  filter: FilterKey | null; // the chip the "go" link sets
  done: (notes: readonly ProjectNote[], packDone: boolean) => boolean;
}

const parentIds = (n: ProjectNote) => new Set(n.result.parents.map((p) => p.id));
const same = (a: ReadonlySet<string>, b: ReadonlySet<string>) => a.size === b.size && [...a].every((x) => b.has(x));

export const FARADAY_MAXWELL: ReadonlySet<string> = new Set(["work-faraday-ere-v1", "work-maxwell-elem"]);

export const FIRST_RUN_STEPS: readonly FirstRunStep[] = [
  { n: 1, text: "Filter Classics. Tick Faraday and Maxwell. Compare.", filter: "classics", done: (notes) => notes.some((n) => n.note.job === "compare" && same(parentIds(n), FARADAY_MAXWELL)) },
  { n: 2, text: "Filter Autistikon. Tick both stand-ins. Converge.", filter: "autistikon", done: (notes) => notes.some((n) => n.note.job === "converge" && same(parentIds(n), STAND_INS)) },
  { n: 3, text: "Download pack.", filter: null, done: (_notes, packDone) => packDone },
];

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function seenFirstRun(): boolean {
  try {
    return storage()?.getItem(FIRST_RUN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markFirstRunSeen(): void {
  try {
    storage()?.setItem(FIRST_RUN_KEY, "1");
  } catch {
    // no storage: the panel closes for this mount and may return next time
  }
}
