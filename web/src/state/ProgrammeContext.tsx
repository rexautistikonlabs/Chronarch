/** The loaded programme (a fixture), the catalogue it sits in (the union of
 *  the fixtures' fields and bridges), and the example synthesis child. All
 *  static JSON: no fetch, no process, no tenant store this turn. */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import toyFixture from "../../fixtures/programme-toy.json";
import zeroFixture from "../../fixtures/programme-zero.json";
import childFixture from "../../fixtures/synthesis-child.json";
import worksFixture from "../../fixtures/works-preload.json";
import { catalogueOf, programmeCounts, Refusal, validateChild, type Catalogue, type ChildPin, type ProgrammeFile } from "../lib/programme";
import { acceptUpload, worksMap, type UploadRequest, type UploadResult, type Work, type WorksFile } from "../lib/works";

export const PROGRAMMES = {
  "programme-zero.json": zeroFixture as ProgrammeFile,
  "programme-toy.json": toyFixture as ProgrammeFile,
} as const;
export type ProgrammeName = keyof typeof PROGRAMMES;

export const CHILD = childFixture as ChildPin;
export const PRELOAD_WORKS = (worksFixture as WorksFile).works;

interface ProgrammeCtx {
  programme: ProgrammeFile;
  programmeName: ProgrammeName;
  catalogue: Catalogue;
  counts: ReturnType<typeof programmeCounts>;
  child: ChildPin;
  childVerdict: { ok: true; walk: string[]; bridges: string[] } | { ok: false; code: string; detail: string };
  loadProgramme: (name: ProgrammeName) => void;
  works: Work[]; // preload + this session's uploads (memory only)
  preloadCount: number;
  upload: (req: UploadRequest) => UploadResult;
  files: ProgrammeFile[];
  results: ChildPin[]; // children the bench produced this session (memory only)
  addResult: (c: ChildPin) => void;
}

const Ctx = createContext<ProgrammeCtx | null>(null);

export function ProgrammeProvider({ children, initial = "programme-zero.json" }: { children: ReactNode; initial?: ProgrammeName }) {
  const [programmeName, setName] = useState<ProgrammeName>(initial);
  const [uploads, setUploads] = useState<Work[]>([]);
  const [results, setResults] = useState<ChildPin[]>([]);
  const addResult = useCallback((c: ChildPin) => setResults((r) => [...r, c]), []);
  const files = useMemo(() => Object.values(PROGRAMMES), []);
  const works = useMemo(() => [...PRELOAD_WORKS, ...uploads], [uploads]);
  const catalogue = useMemo(() => catalogueOf(Object.values(PROGRAMMES)), []);
  const programme = PROGRAMMES[programmeName];
  const counts = useMemo(() => programmeCounts(programme), [programme]);
  const childVerdict = useMemo<ProgrammeCtx["childVerdict"]>(() => {
    try {
      const r = validateChild(catalogue, CHILD, worksMap(works));
      return { ok: true, ...r };
    } catch (e) {
      if (e instanceof Refusal) return { ok: false, code: e.code, detail: e.message };
      throw e;
    }
  }, [catalogue, works]);
  const loadProgramme = useCallback((name: ProgrammeName) => setName(name), []);
  // Upload is a model: the accepted record joins the session catalogue in
  // memory. Nothing is written to disk from the browser.
  const upload = useCallback((req: UploadRequest) => {
    const r = acceptUpload(req);
    if (r.ok) setUploads((u) => [...u, r.work]);
    return r;
  }, []);
  const value = useMemo(
    () => ({ programme, programmeName, catalogue, counts, child: CHILD, childVerdict, loadProgramme, works, preloadCount: PRELOAD_WORKS.length, upload, files, results, addResult }),
    [programme, programmeName, catalogue, counts, childVerdict, loadProgramme, works, upload, files, results, addResult],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProgramme(): ProgrammeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProgramme outside ProgrammeProvider");
  return ctx;
}
