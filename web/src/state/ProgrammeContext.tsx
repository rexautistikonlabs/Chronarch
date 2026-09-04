/** The loaded programme (a fixture), the catalogue it sits in (the union of
 *  the fixtures' fields and bridges), and the example synthesis child. All
 *  static JSON: no fetch, no process, no tenant store this turn. */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import toyFixture from "../../fixtures/programme-toy.json";
import zeroFixture from "../../fixtures/programme-zero.json";
import childFixture from "../../fixtures/synthesis-child.json";
import { catalogueOf, programmeCounts, Refusal, validateChild, type Catalogue, type ChildPin, type ProgrammeFile } from "../lib/programme";

export const PROGRAMMES = {
  "programme-zero.json": zeroFixture as ProgrammeFile,
  "programme-toy.json": toyFixture as ProgrammeFile,
} as const;
export type ProgrammeName = keyof typeof PROGRAMMES;

export const CHILD = childFixture as ChildPin;

interface ProgrammeCtx {
  programme: ProgrammeFile;
  programmeName: ProgrammeName;
  catalogue: Catalogue;
  counts: ReturnType<typeof programmeCounts>;
  child: ChildPin;
  childVerdict: { ok: true; walk: string[]; bridges: string[] } | { ok: false; code: string; detail: string };
  loadProgramme: (name: ProgrammeName) => void;
}

const Ctx = createContext<ProgrammeCtx | null>(null);

export function ProgrammeProvider({ children, initial = "programme-zero.json" }: { children: ReactNode; initial?: ProgrammeName }) {
  const [programmeName, setName] = useState<ProgrammeName>(initial);
  const catalogue = useMemo(() => catalogueOf(Object.values(PROGRAMMES)), []);
  const programme = PROGRAMMES[programmeName];
  const counts = useMemo(() => programmeCounts(programme), [programme]);
  const childVerdict = useMemo<ProgrammeCtx["childVerdict"]>(() => {
    try {
      const r = validateChild(catalogue, CHILD);
      return { ok: true, ...r };
    } catch (e) {
      if (e instanceof Refusal) return { ok: false, code: e.code, detail: e.message };
      throw e;
    }
  }, [catalogue]);
  const loadProgramme = useCallback((name: ProgrammeName) => setName(name), []);
  const value = useMemo(() => ({ programme, programmeName, catalogue, counts, child: CHILD, childVerdict, loadProgramme }), [programme, programmeName, catalogue, counts, childVerdict, loadProgramme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProgramme(): ProgrammeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProgramme outside ProgrammeProvider");
  return ctx;
}
