/** The loaded programme (a fixture), the catalogue it sits in (the union of
 *  the fixtures' fields and bridges), and the example synthesis child. All
 *  static JSON: no fetch, no process, no tenant store this turn. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import classicsFixture from "../../fixtures/programme-classics.json";
import toyFixture from "../../fixtures/programme-toy.json";
import zeroFixture from "../../fixtures/programme-zero.json";
import childFixture from "../../fixtures/synthesis-child.json";
import worksFixture from "../../fixtures/works-preload.json";
import { catalogueOf, programmeCounts, Refusal, validateChild, type Catalogue, type ChildPin, type ProgrammeFile } from "../lib/programme";
import type { AnalysisNote } from "../lib/analysisNote";
import type { BenchOk } from "../lib/bench";
import { DEFAULT_PROJECT_NAME, declareBridge as declareOn, newProject, operatorBridgeIds, withExtraBridges, withNote, withUpload, type DeclareResult, type Project, type ProjectNote } from "../lib/project";
import { clearSavedProject, loadProject, parseProject, saveProject, type ParseResult } from "../lib/projectStore";
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
  /** The project: name, works used, session bridges, notes. Saved in this
   *  browser only (localStorage, one key); imported and exported as JSON. */
  project: Project;
  importProject: (text: string) => ParseResult;
  clearProject: () => void;
  saved: boolean; // whether the last write to this browser's storage succeeded
  notes: ProjectNote[];
  setProjectName: (name: string) => void;
  declareBridge: (left: string, right: string, amendment: boolean) => DeclareResult;
  clearExtraBridges: () => void;
  /** The shipped catalogue alone — never gains a session bridge. */
  shippedCatalogue: Catalogue;
  operatorBridges: ReadonlySet<string>;
}

const Ctx = createContext<ProgrammeCtx | null>(null);

// A cold load opens on the Classics programme: the Autistikon example corpus is a chip, never the default.
export function ProgrammeProvider({ children, initial = "programme-classics.json" }: { children: ReactNode; initial?: ProgrammeName }) {
  const [programmeName, setName] = useState<ProgrammeName>(initial);
  // Hydrate once from this browser's storage through the fail-closed guard;
  // a missing or corrupt key starts Untitled. Every change is written back.
  const [project, setProject] = useState<Project>(() => loadProject(PRELOAD_WORKS) ?? newProject(1));
  const [saved, setSaved] = useState(false);
  // Nothing is written to this browser until the project differs from a fresh
  // one: a visitor who only looks stores nothing (the strip says "on the
  // workbench, a project" — and only once there is one).
  useEffect(() => {
    const pristine = project.name === DEFAULT_PROJECT_NAME && project.works.length === 0 && project.extra_bridges.length === 0 && project.notes.length === 0;
    if (pristine) return;
    setSaved(saveProject(project));
  }, [project]);
  const files = useMemo(() => Object.values(PROGRAMMES), []);
  // The works table: the preload plus this project's session uploads.
  const works = useMemo(() => [...PRELOAD_WORKS, ...project.works.filter((w) => w.source === "upload")], [project.works]);
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
  const importProject = useCallback((text: string): ParseResult => {
    const r = parseProject(text, PRELOAD_WORKS);
    if (r.ok) setProject(r.project);
    return r;
  }, []);
  const clearProject = useCallback(() => {
    clearSavedProject();
    setProject((p) => newProject(Number(p.created_at.replace(/^tick:/, "")) + 1 || 1));
  }, []);
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
      // an imported project may already hold an upload id from another session: never collide, never drop
      setProject((p) => {
        let w = r.work;
        for (let n = 2; p.works.some((x) => x.id === w.id); n++) w = { ...r.work, id: `${r.work.id}-${n}` };
        return withUpload(p, w);
      });
    }
    return r;
  }, []);
  const value = useMemo(
    () => ({ programme, programmeName, catalogue, counts, child: CHILD, childVerdict, loadProgramme, works, preloadCount: PRELOAD_WORKS.length, upload, files, results, addResult, project, notes: project.notes, setProjectName, declareBridge, clearExtraBridges, shippedCatalogue, operatorBridges, importProject, clearProject, saved }),
    [programme, programmeName, catalogue, counts, childVerdict, loadProgramme, works, upload, files, results, addResult, project, setProjectName, declareBridge, clearExtraBridges, shippedCatalogue, operatorBridges, importProject, clearProject, saved],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProgramme(): ProgrammeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProgramme outside ProgrammeProvider");
  return ctx;
}
