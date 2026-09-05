/** Project persistence and exchange (specs/PROJECT.md, "Persistence").
 *
 *  One localStorage key on this browser — no cookies, no backend, no
 *  analytics, nothing sent anywhere. Everything that comes back in (from the
 *  key or from an imported file) passes one fail-closed guard: bad JSON or a
 *  missing name is IMPORT_INVALID and the project is unchanged; a bridge not
 *  marked origin operator is stripped, never applied as shipped; a work that
 *  is not a preload id enters only as a session upload that acceptUpload
 *  would accept, otherwise it is dropped and counted. */
import type { AnalysisNote } from "./analysisNote";
import type { BenchOk } from "./bench";
import type { Bridge } from "./programme";
import { isOperatorBridge, OPERATOR_JUNCTION, type Project, type ProjectNote } from "./project";
import { acceptUpload, type License, type Work } from "./works";

export const PROJECT_STORAGE_KEY = "rexmetrix.project.v1";

export type ParseResult =
  | { ok: true; project: Project; skipped_works: number; stripped_bridges: number; dropped_notes: number }
  | { ok: false; code: "IMPORT_INVALID"; detail: string };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === "string";

/** Fail-closed guard over an untrusted Project object. */
export function parseProject(text: string, preload: readonly Work[]): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, code: "IMPORT_INVALID", detail: `not JSON: ${(e as Error).message.slice(0, 80)}` };
  }
  if (!isRecord(raw)) return { ok: false, code: "IMPORT_INVALID", detail: "a project is a JSON object" };
  if (!str(raw.name) || !raw.name.trim()) return { ok: false, code: "IMPORT_INVALID", detail: "missing name" };
  for (const k of ["works", "extra_bridges", "notes"] as const) {
    if (!Array.isArray(raw[k])) return { ok: false, code: "IMPORT_INVALID", detail: `missing ${k}[]` };
  }
  const programme_ids = Array.isArray(raw.programme_ids) && raw.programme_ids.every(str) ? (raw.programme_ids as string[]) : ["programme-zero", "programme-classics"];
  const id = str(raw.id) && raw.id.trim() ? raw.id : "project-imported";
  const created_at = str(raw.created_at) ? raw.created_at : "tick:imported";

  // bridges: operator-declared only; anything else is stripped, never shipped
  let stripped_bridges = 0;
  const extra_bridges: Bridge[] = [];
  for (const b of raw.extra_bridges as unknown[]) {
    if (!isRecord(b) || !str(b.id) || !str(b.left) || !str(b.right) || b.left === b.right) { stripped_bridges += 1; continue; }
    const candidate: Bridge = { id: b.id, left: b.left, right: b.right, junction: str(b.junction) ? b.junction : OPERATOR_JUNCTION, status: "live", ledger: [], register: [], origin: "operator" };
    if (b.origin !== "operator" || !isOperatorBridge(candidate)) { stripped_bridges += 1; continue; }
    if (extra_bridges.some((x) => x.id === candidate.id)) { stripped_bridges += 1; continue; }
    extra_bridges.push(candidate);
  }

  // works: preload ids are references; the rest are session uploads under the upload law
  const byId = new Map(preload.map((w) => [w.id, w]));
  let skipped_works = 0;
  const works: Work[] = [];
  const seen = new Set<string>();
  for (const w of raw.works as unknown[]) {
    const wid = isRecord(w) ? w.id : str(w) ? w : undefined;
    if (!str(wid) || seen.has(wid)) { skipped_works += 1; continue; }
    const pre = byId.get(wid);
    if (pre) { seen.add(wid); works.push(pre); continue; }
    if (!isRecord(w) || !str(w.title)) { skipped_works += 1; continue; }
    const r = acceptUpload({
      title: w.title,
      license: str(w.license) ? (w.license as License) : null,
      claimsBytes: w.bytes === "present",
      rights: w.rights_declared === true,
      ...(str(w.field) ? { field: w.field } : {}),
      ...(str(w.text) ? { text: w.text } : {}),
      ...(str(w.source_url) ? { source_url: w.source_url } : {}),
    });
    if (!r.ok) { skipped_works += 1; continue; }
    seen.add(wid);
    works.push({ ...r.work, id: wid, ...(str(w.attribution) ? { attribution: w.attribution } : {}) });
  }

  // notes: a note needs an ok result with a child id and parents, and a note body with is_not
  let dropped_notes = 0;
  const notes: ProjectNote[] = [];
  for (const n of raw.notes as unknown[]) {
    if (!isRecord(n) || !isRecord(n.result) || !isRecord(n.note)) { dropped_notes += 1; continue; }
    const res = n.result as Partial<BenchOk>;
    const note = n.note as Partial<AnalysisNote>;
    if (res.ok !== true || !isRecord(res.child) || !str(res.child.id) || !Array.isArray(res.parents) || !Array.isArray(note.is_not) || !str(note.question) || !Array.isArray(note.findings)) { dropped_notes += 1; continue; }
    notes.push({ seq: notes.length + 1, result: res as BenchOk, note: note as AnalysisNote });
  }

  const project: Project = { schema: "rexmetrix.project/1", id, name: raw.name.trim(), programme_ids, works, extra_bridges, notes, created_at };
  return { ok: true, project, skipped_works, stripped_bridges, dropped_notes };
}

/** Canonical JSON: sorted keys, two-space indent, no functions (JSON has none). */
export function projectToJSON(project: Project): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (isRecord(v)) return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])]));
    return v;
  };
  return JSON.stringify(sort(project), null, 2) + "\n";
}

export function projectJsonFilename(project: Project): string {
  const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
  return `rexmetrix-project-${slug}.json`;
}

function storage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Write the project under the one key. Errors (quota, private mode) are swallowed: the page keeps working from memory. */
export function saveProject(project: Project): boolean {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(PROJECT_STORAGE_KEY, projectToJSON(project));
    return true;
  } catch {
    return false;
  }
}

/** Read the key through the same guard an import gets. Corrupt or missing → null (start Untitled; never crash). */
export function loadProject(preload: readonly Work[]): Project | null {
  const s = storage();
  if (!s) return null;
  try {
    const text = s.getItem(PROJECT_STORAGE_KEY);
    if (!text) return null;
    const r = parseProject(text, preload);
    return r.ok ? r.project : null;
  } catch {
    return null;
  }
}

export function clearSavedProject(): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(PROJECT_STORAGE_KEY);
  } catch {
    // nothing to do: the in-memory project is already reset by the caller
  }
}
