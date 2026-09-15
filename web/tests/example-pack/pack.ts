/** The example corpus, loaded the way these tests need it: statically. Only
 *  tests under tests/example-pack/ import Programme Zero, its two stand-in
 *  works and its child; the default suite never does. `npm run test:core`
 *  runs everything but this directory and must stay green on its own. */
import classics from "../../fixtures/programme-classics.json";
import toy from "../../fixtures/programme-toy.json";
import zero from "../../fixtures/programme-zero.json";
import childFixture from "../../fixtures/synthesis-child.json";
import exampleWorks from "../../fixtures/works-example-corpus.json";
import preload from "../../fixtures/works-preload.json";
import type { ChildPin, ProgrammeFile } from "../../src/lib/programme";
import type { Work, WorksFile } from "../../src/lib/works";

export const ZERO = zero as ProgrammeFile;
export const TOY = toy as ProgrammeFile;
export const CLASSICS = classics as ProgrammeFile;
export const PACK_CHILD = childFixture as ChildPin;
/** The preload plus the pack's two stand-ins: what the workbench lists once the example chip is pressed. */
export const ALL_WORKS: Work[] = [...(preload as WorksFile).works, ...(exampleWorks as WorksFile).works];
export const PACK_WORKS: Work[] = (exampleWorks as WorksFile).works;
