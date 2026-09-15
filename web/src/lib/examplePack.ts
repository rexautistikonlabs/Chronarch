/** The example corpus is an optional pack, never the default path.
 *
 *  Programme Zero (the Autistikon example corpus), its two structure-only
 *  stand-in works and its example child are loaded here and only here, and
 *  only on request — the chip labelled "example corpus — not the product".
 *  The imports are dynamic, so the bundler splits them into their own chunk
 *  and a cold workbench never parses them; no module on the default path
 *  imports these fixtures. A researcher on an unrelated question never
 *  inherits this corpus: it is a pack they may load, like any catalogue. */
import type { ChildPin, ProgrammeFile } from "./programme";
import type { Work, WorksFile } from "./works";

export const EXAMPLE_PACK_ID = "programme-zero";
export const EXAMPLE_PACK_NAME = "programme-zero.json";

export interface ExamplePack {
  programme: ProgrammeFile;
  works: Work[];
  child: ChildPin;
}

let pending: Promise<ExamplePack> | null = null;

/** Load the example corpus once; later calls share the same promise. */
export function loadExampleCorpus(): Promise<ExamplePack> {
  pending ??= Promise.all([
    import("../../fixtures/programme-zero.json"),
    import("../../fixtures/works-example-corpus.json"),
    import("../../fixtures/synthesis-child.json"),
  ]).then(([p, w, c]) => ({
    programme: p.default as ProgrammeFile,
    works: (w.default as WorksFile).works,
    child: c.default as ChildPin,
  }));
  return pending;
}
