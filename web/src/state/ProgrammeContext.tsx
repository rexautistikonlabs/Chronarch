/** The loaded programme (a fixture), the catalogue it sits in (the union of
 *  the fixtures' fields and bridges), and the example synthesis child. All
 *  static JSON: no fetch, no process, no tenant store this turn. */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import classicsFixture from "../../fixtures/programme-classics.json";
import toyFixture from "../../fixtures/programme-toy.json";
import zeroFixture from "../../fixtures/programme-zero.json";
import childFixture from "../../fixtures/synthesis-child.json";
import worksFixture from "../../fixtures/works-preload.json";
import { catalogueOf, programmeCounts, Refusal, validateChild, type Catalogue, type ChildPin, type ProgrammeFile } from "../lib/programme";
import type { AnalysisNote } from "../lib/analysisNote";
import type { BenchOk } from "../lib/bench";
import { declareBridge as declareOn, newProject, operatorBridgeIds, withExtraBridges, withNote, withUpload, type DeclareResult, type Project, type ProjectNote } from "../lib/project";
import { acceptUpload, worksMap, type UploadRequest, type UploadResult, type Work, type WorksFile } from "../lib/works";

export const PROGRAMMES = {
  "programme-zero.json": zeroFixture as ProgrammeFile,
  "programme-toy.json": toyFixture as ProgrammeFile,
  "programme-classics.json": classicsFixture as ProgrammeFile,
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
  results: (BenchOk & { note: AnalysisNote })[]; // the project's notes, flattened (memory only)
  addResult: (r: BenchOk & { note: AnalysisNote }) => void;
  /** The session project: name, works used, session bridges, notes. Memory only. */
  project: Project;
  notes: ProjectNote[];
  setProjectName: (name: string) => void;
  declareBridge: (left: string, right: string, amendment: boolean) => DeclareResult;
  clearExtraBridges: () => void;
  /** The shipped catalogue alone — never gains a session bridge. */
  shippedCatalogue: Catalogue;
  operatorBridges: ReadonlySet<string>;
}

const Ctx = createContext<ProgrammeCtx | null>(null);

export function ProgrammeProvider({ children, initial = "programme-zero.json" }: { children: ReactNode; initial?: ProgrammeName }) {
  const [programmeName, setName] = useState<ProgrammeName>(initial);
  const [uploads, setUploads] = useState<Work[]>([]);
  const [project, setProject] = useState<Project>(() => newProject(1));
  const files = useMemo(() => Object.values(PROGRAMMES), []);
  const works = useMemo(() => [...PRELOAD_WORKS, ...uploads], [uploads]);
  const shippedCatalogue = useMemo(() => catalogueOf(Object.values(PROGRAMMES)), []);
  // The bench reads the shipped catalogue plus this project's amendments; the
  // shipped Map is never mutated and no programme file is written.
  const catalogue = useMemo(() => withExtraBridges(shippedCatalogue, project.extra_bridges), [shippedCatalogue, project.extra_bridges]);
  const operatorBridges = useMemo(() => operatorBridgeIds(project), [project]);
  const worksById = useMemo(() => worksMap(works), [works]);
  const addResult = useCallback((r: BenchOk & { note: AnalysisNote }) => {
    const { note, ...result } = r;
    setProject((p) => withNote(p, result, note, worksById));
  }, [worksById]);
  const results = useMemo(() => project.notes.map((n) => ({ ...n.result, note: n.note })), [project.notes]);
  const setProjectName = useCallback((name: string) => setProject((p) => ({ ...p, name })), []);
  const declareBridge = useCallback((left: string, right: string, amendment: boolean): DeclareResult => {
    const r = declareOn(project, catalogue, left, right, amendment);
    if (r.ok) setProject((p) => ({ ...p, extra_bridges: [...p.extra_bridges, r.bridge] }));
    return r;
  }, [project, catalogue]);
  const clearExtraBridges = useCallback(() => setProject((p) => ({ ...p, extra_bridges: [] })), []);
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
    if (r.ok) {
      setUploads((u) => [...u, r.work]);
      setProject((p) => withUpload(p, r.work));
    }
    return r;
  }, []);
  const value = useMemo(
    () => ({ programme, programmeName, catalogue, counts, child: CHILD, childVerdict, loadProgramme, works, preloadCount: PRELOAD_WORKS.length, upload, files, results, addResult, project, notes: project.notes, setProjectName, declareBridge, clearExtraBridges, shippedCatalogue, operatorBridges }),
    [programme, programmeName, catalogue, counts, childVerdict, loadProgramme, works, upload, files, results, addResult, project, setProjectName, declareBridge, clearExtraBridges, shippedCatalogue, operatorBridges],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProgramme(): ProgrammeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProgramme outside ProgrammeProvider");
  return ctx;
}
