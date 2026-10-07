/** First run: four steps a researcher on any question can finish without
 *  inheriting anything — your fields, your sources, one bridge if two fields,
 *  one pack. No step names a corpus, a fixture id or a particular author; the
 *  starter catalogues (Classics, Toy, the example corpus) are offered, never
 *  required. A professional skips it; one flag in this browser remembers
 *  either outcome. No new science: the steps read the workbench's own state
 *  and the notes the bench wrote. */
export const FIRST_RUN_KEY = "rexmetrix.seenFirstRun.v1";

/** What a step's "go" control does: load a starter programme, or nothing. */
export type FirstRunAction = { kind: "programme"; fixture: string; label: string };

/** What the workbench knows at the moment a step is judged. */
export interface FirstRunState {
  fieldCount: number; // fields in the catalogue the bench reads: the programme's plus the project's own
  selectedCount: number; // works ticked in the table
  noteCount: number; // notes the bench has written to the project
  packDone: boolean;
}

export interface FirstRunStep {
  n: 1 | 2 | 3 | 4;
  text: string;
  action: FirstRunAction | null;
  done: (s: FirstRunState) => boolean;
}

export const STARTER_PACK: FirstRunAction = { kind: "programme", fixture: "programme-classics.json", label: "load a public-domain starter pack" };

export const FIRST_RUN_STEPS: readonly FirstRunStep[] = [
  { n: 1, text: "Add two fields — a label, its units, its sector — or load an optional catalogue (Classics, Toy, or the example corpus).", action: STARTER_PACK, done: (s) => s.fieldCount >= 2 },
  { n: 2, text: "Pin or select two works you have rights to (or two from a loaded catalogue).", action: null, done: (s) => s.selectedCount >= 2 || s.noteCount > 0 },
  { n: 3, text: "Fill the reading record (mode, status, identifiability), then Converge or Compare. If the two works sit in two fields, declare a bridge first and tick “amendment, not evidence”.", action: null, done: (s) => s.noteCount > 0 },
  { n: 4, text: "Download pack.", action: null, done: (s) => s.packDone },
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
