/** The loaded programme, the catalogue the bench reads, and the project.
 *
 *  A cold load is the BLANK programme: no fields, no bridges, no works of
 *  its own — a researcher's start, inheriting nothing. Classics and Toy are
 *  shipped catalogues a group may load; the example corpus (Programme Zero)
 *  is an optional pack behind loadExampleCorpus(), never imported on this
 *  path and never listed until it is asked for.
 *
 *  The catalogue is the SELECTED programme's fields and bridges plus the
 *  project's own declared fields and bridges — so a blank programme shows no
 *  shipped edge, and the first bridge is the operator's. All static JSON: no
 *  fetch, no process, no tenant store. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import blankFixture from "../../fixtures/programme-blank.json";
import classicsFixture from "../../fixtures/programme-classics.json";
import toyFixture from "../../fixtures/programme-toy.json";
import classicsChild from "../../fixtures/synthesis-child-classics.json";
import worksFixture from "../../fixtures/works-preload.json";
import { EXAMPLE_PACK_ID, EXAMPLE_PACK_NAME, loadExampleCorpus, type ExamplePack } from "../lib/examplePack";
import { catalogueOf, programmeCounts, Refusal, validateChild, type Catalogue, type ChildPin, type ProgrammeFile } from "../lib/programme";
import type { AnalysisNote } from "../lib/analysisNote";
import type { BenchOk } from "../lib/bench";
import { DEFAULT_PROJECT_NAME, declareBridge as declareBridgeOn, declareField as declareFieldOn, newProject, operatorBridgeIds, withExtraBridges, withExtraFields, withNote, withUpload, type DeclareFieldResult, type DeclareResult, type Project, type ProjectNote } from "../lib/project";
import { clearSavedProject, loadProject, parseProject, saveProject, type ParseResult } from "../lib/projectStore";
import { acceptUpload, worksMap, type UploadRequest, type UploadResult, type Work, type WorksFile } from "../lib/works";

/** The programmes that ship on the default path. The example pack is not one of them. */
export const SHIPPED = {
  "programme-blank.json": blankFixture as ProgrammeFile,
  "programme-classics.json": classicsFixture as ProgrammeFile,
  "programme-toy.json": toyFixture as ProgrammeFile,
} as const;
export type ShippedName = keyof typeof SHIPPED;
export type ProgrammeName = ShippedName | typeof EXAMPLE_PACK_NAME;
export const BLANK_NAME = "programme-blank.json" satisfies ShippedName;
/** Kept for callers that enumerate programmes; the pack joins at runtime, on request. */
export const PROGRAMMES: Readonly<Record<ShippedName, ProgrammeFile>> = SHIPPED;

export const PRELOAD_WORKS = (worksFixture as WorksFile).works;

/** Example children, per programme: Classics ships one over two public-domain
 *  works and one shipped bridge; the example pack brings its own; the blank
 *  and the Toy programme have none — on the workbench you write yours. */
const EXAMPLE_CHILDREN: Readonly<Record<string, ChildPin>> = { "programme-classics": classicsChild as ChildPin };

export type PackState = "absent" | "loading" | "loaded";
export type ChildVerdict = { ok: true; walk: string[]; bridges: string[] } | { ok: false; code: string; detail: string };

interface ProgrammeCtx {
  programme: ProgrammeFile;
  programmeName: ProgrammeName;
  /** Every programme available right now: the shipped three, plus the example pack once loaded. */
  programmes: Readonly<Partial<Record<ProgrammeName, ProgrammeFile>>>;
  /** The selected programme's fields and bridges plus this project's own fields and bridges. */
  catalogue: Catalogue;
  /** The selected programme alone — never gains a session field or bridge. */
  shippedCatalogue: Catalogue;
  counts: ReturnType<typeof programmeCounts>;
  child: ChildPin | null;
  childVerdict: ChildVerdict;
  loadProgramme: (name: ProgrammeName) => void;
  /** The example corpus, on request only. Resolves once its programme, works and child are in. */
  loadExamplePack: () => Promise<void>;
  packState: PackState;
  works: Work[]; // preload + the example pack's works once loaded + this session's uploads (memory only)
  preloadCount: number;
  upload: (req: UploadRequest) => UploadResult;
  files: ProgrammeFile[];
  results: (BenchOk & { note: AnalysisNote })[]; // the project's notes, flattened (memory only)
  addResult: (r: BenchOk & { note: AnalysisNote }) => void;
  /** The project: name, fields declared, works used, session bridges, notes.
   *  Saved in this browser only (localStorage, one key); imported and exported as JSON. */
  project: Project;
  importProject: (text: string) => ParseResult;
  clearProject: () => void;
  saved: boolean; // whether the last write to this browser's storage succeeded
  notes: ProjectNote[];
  setProjectName: (name: string) => void;
  declareBridge: (left: string, right: string, amendment: boolean) => DeclareResult;
  declareField: (input: { label: string; units: string; sector: string; anti_overreach?: readonly string[] }) => DeclareFieldResult;
  clearExtraBridges: () => void;
  operatorBridges: ReadonlySet<string>;
}

const Ctx = createContext<ProgrammeCtx | null>(null);

const NO_EXAMPLE: ChildVerdict = { ok: false, code: "NO_EXAMPLE", detail: "this programme ships no example child; on the workbench, your Compare or Converge writes one with your parents" };

/** The programme name a project's first programme id points at; null for an unknown id. */
function nameForProgrammeId(id: string | undefined): ProgrammeName | null {
  for (const [name, file] of Object.entries(SHIPPED) as [ShippedName, ProgrammeFile][]) if (file.id === id) return name;
  return id === EXAMPLE_PACK_ID ? EXAMPLE_PACK_NAME : null;
}

// A cold load opens on the blank programme: nothing is inherited, and the
// example corpus is a pack a visitor may load. A saved project reopens on the
// programme it was on — including the pack, if that project had asked for it.
export function ProgrammeProvider({ children, initial }: { children: ReactNode; initial?: ProgrammeName }) {
  // Hydrate once from this browser's storage through the fail-closed guard;
  // a missing or corrupt key starts Untitled. Every change is written back.
  const [project, setProject] = useState<Project>(() => loadProject(PRELOAD_WORKS) ?? newProject(1));
  const [programmeName, setName] = useState<ProgrammeName>(() => initial ?? nameForProgrammeId(project.programme_ids[0]) ?? BLANK_NAME);
  const [pack, setPack] = useState<ExamplePack | null>(null);
  const [packState, setPackState] = useState<PackState>("absent");
  const [saved, setSaved] = useState(false);
  // Nothing is written to this browser until the project differs from a fresh
  // one: a visitor who only looks stores nothing (the strip says "on the
  // workbench, a project" — and only once there is one).
  useEffect(() => {
    const pristine = project.name === DEFAULT_PROJECT_NAME && project.works.length === 0 && project.extra_fields.length === 0 && project.extra_bridges.length === 0 && project.notes.length === 0;
    if (pristine) return;
    setSaved(saveProject(project));
  }, [project]);

  const loadExamplePack = useCallback((): Promise<void> => {
    setPackState((s) => (s === "loaded" ? s : "loading"));
    return loadExampleCorpus().then((p) => {
      setPack(p);
      setPackState("loaded");
    });
  }, []);
  // A saved project that was on the pack asked for it once already: fetch it again on return.
  useEffect(() => {
    if (programmeName === EXAMPLE_PACK_NAME && !pack) void loadExamplePack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const programmes = useMemo<Readonly<Partial<Record<ProgrammeName, ProgrammeFile>>>>(() => (pack ? { ...SHIPPED, [EXAMPLE_PACK_NAME]: pack.programme } : { ...SHIPPED }), [pack]);
  const programme = programmes[programmeName] ?? SHIPPED[BLANK_NAME];
  const files = useMemo(() => Object.values(programmes).filter((p): p is ProgrammeFile => !!p), [programmes]);
  // The programme the project is on: recorded on the project so the pack says so.
  useEffect(() => {
    setProject((p) => (p.programme_ids.length === 1 && p.programme_ids[0] === programme.id ? p : { ...p, programme_ids: [programme.id] }));
  }, [programme.id]);

  // The works table: the preload, the pack's works once loaded, and this project's session uploads.
  const works = useMemo(() => [...PRELOAD_WORKS, ...(pack?.works ?? []), ...project.works.filter((w) => w.source === "upload")], [pack, project.works]);
  // The selected programme alone, then the project's own fields and bridges over it.
  // The shipped Map is never mutated and no programme file is written.
  const shippedCatalogue = useMemo(() => catalogueOf([programme]), [programme]);
  const catalogue = useMemo(() => withExtraBridges(withExtraFields(shippedCatalogue, project.extra_fields), project.extra_bridges), [shippedCatalogue, project.extra_fields, project.extra_bridges]);
  const operatorBridges = useMemo(() => operatorBridgeIds(project), [project]);
  const worksById = useMemo(() => worksMap(works), [works]);
  const addResult = useCallback((r: BenchOk & { note: AnalysisNote }) => {
    const { note, ...result } = r;
    setProject((p) => withNote(p, result, note, worksById));
  }, [worksById]);
  const results = useMemo(() => project.notes.map((n) => ({ ...n.result, note: n.note })), [project.notes]);
  const setProjectName = useCallback((name: string) => setProject((p) => ({ ...p, name })), []);
  const declareBridge = useCallback((left: string, right: string, amendment: boolean): DeclareResult => {
    const r = declareBridgeOn(project, catalogue, left, right, amendment);
    if (r.ok) setProject((p) => ({ ...p, extra_bridges: [...p.extra_bridges, r.bridge] }));
    return r;
  }, [project, catalogue]);
  const declareField = useCallback((input: { label: string; units: string; sector: string; anti_overreach?: readonly string[] }): DeclareFieldResult => {
    const r = declareFieldOn(project, catalogue, input);
    if (r.ok) setProject((p) => ({ ...p, extra_fields: [...p.extra_fields, r.field] }));
    return r;
  }, [project, catalogue]);
  const clearExtraBridges = useCallback(() => setProject((p) => ({ ...p, extra_bridges: [] })), []);
  const importProject = useCallback((text: string): ParseResult => {
    const r = parseProject(text, [...PRELOAD_WORKS, ...(pack?.works ?? [])]);
    if (r.ok) setProject(r.project);
    return r;
  }, [pack]);
  const clearProject = useCallback(() => {
    clearSavedProject();
    setProject((p) => newProject(Number(p.created_at.replace(/^tick:/, "")) + 1 || 1, [programme.id]));
  }, [programme.id]);
  const counts = useMemo(() => programmeCounts(programme), [programme]);
  const child = useMemo<ChildPin | null>(() => (programme.id === EXAMPLE_PACK_ID ? pack?.child ?? null : EXAMPLE_CHILDREN[programme.id] ?? null), [programme.id, pack]);
  const childVerdict = useMemo<ChildVerdict>(() => {
    if (!child) return NO_EXAMPLE;
    try {
      const r = validateChild(catalogue, child, worksById);
      return { ok: true, ...r };
    } catch (e) {
      if (e instanceof Refusal) return { ok: false, code: e.code, detail: e.message };
      throw e;
    }
  }, [catalogue, child, worksById]);
  // A shipped programme switches at once; the example pack loads first, then switches.
  const loadProgramme = useCallback((name: ProgrammeName) => {
    if (name === EXAMPLE_PACK_NAME && !pack) {
      void loadExamplePack().then(() => setName(name));
      return;
    }
    setName(name);
  }, [pack, loadExamplePack]);
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
    () => ({ programme, programmeName, programmes, catalogue, shippedCatalogue, counts, child, childVerdict, loadProgramme, loadExamplePack, packState, works, preloadCount: PRELOAD_WORKS.length, upload, files, results, addResult, project, notes: project.notes, setProjectName, declareBridge, declareField, clearExtraBridges, operatorBridges, importProject, clearProject, saved }),
    [programme, programmeName, programmes, catalogue, shippedCatalogue, counts, child, childVerdict, loadProgramme, loadExamplePack, packState, works, upload, files, results, addResult, project, setProjectName, declareBridge, declareField, clearExtraBridges, operatorBridges, importProject, clearProject, saved],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProgramme(): ProgrammeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProgramme outside ProgrammeProvider");
  return ctx;
}
