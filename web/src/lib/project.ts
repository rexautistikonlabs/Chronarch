/** A Project: the unit a professional takes home and an amateur understands —
 *  the fields the group declared, the works used, the live bridges (shipped
 *  plus session amendments), the AnalysisNotes, and one Markdown pack to
 *  download (specs/PROJECT.md, specs/NEW_PROGRAMME.md).
 *
 *  Session amendments — fields and bridges alike — live on the project only.
 *  Nothing here writes a programme file; a shipped catalogue never gains a
 *  field or an edge from this module. A blank programme plus a project's own
 *  fields is a complete start: no corpus is inherited.
 *  Pure functions; the app keeps the project in memory (no persistence, no
 *  network, no wall clock — a monotonic counter stands where a fixture has
 *  an ISO date). */
import type { AnalysisNote } from "./analysisNote";
import type { BenchOk } from "./bench";
import { noteToMarkdown } from "./exportNote";
import type { Bridge, Catalogue, Field } from "./programme";
import type { Work } from "./works";

export interface ProjectNote {
  seq: number; // time-order within the project (monotonic, not a clock)
  result: BenchOk;
  note: AnalysisNote;
}

export interface Project {
  schema: "rexmetrix.project/1";
  id: string;
  name: string;
  programme_ids: string[];
  works: Work[]; // works referenced by a note (by id) and this session's uploads
  extra_fields: Field[]; // the group's own fields, declared on this project; never merged into a shipped catalogue
  extra_bridges: Bridge[]; // session-only amendments; never merged into a shipped catalogue
  notes: ProjectNote[];
  created_at: string; // ISO string in a fixture; "tick:<n>" in the app (no wall clock)
}

export const DEFAULT_PROJECT_NAME = "Untitled project";
export const OPERATOR_BRIDGE_PREFIX = "amend-";
export const OPERATOR_JUNCTION = "operator-declared amendment for this project — not evidence; ledger and register empty";
export const OPERATOR_FIELD_PREFIX = "field-";
/** Every declared field carries the one refusal no field may drop. */
export const FIELD_ANTI_OVERREACH_ALWAYS = "no individual-level score, index or assessment on any person";
export const BLANK_PROGRAMME_ID = "programme-blank";

export const PACK_CLOSING: readonly string[] = [
  "not a fitted model",
  "not peer review",
  "not Foundation-endorsed",
  "not a public chain",
];

export function newProject(tick: number, programme_ids: string[] = [BLANK_PROGRAMME_ID]): Project {
  return { schema: "rexmetrix.project/1", id: `project-${tick}`, name: DEFAULT_PROJECT_NAME, programme_ids, works: [], extra_fields: [], extra_bridges: [], notes: [], created_at: `tick:${tick}` };
}

export function isOperatorField(f: Field): boolean {
  return f.origin === "operator" || f.id.startsWith(OPERATOR_FIELD_PREFIX);
}

export type DeclareFieldResult = { ok: true; field: Field } | { ok: false; reason: string };

/** The id a declared field gets from its label: lower-case, hyphenated, prefixed. */
export function fieldIdFor(label: string): string {
  const slug = label.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${OPERATOR_FIELD_PREFIX}${slug}`;
}

/** Declare one of the group's own fields on the project: a label, its units,
 *  its sector, and the claims its data may never carry. Refuses an empty
 *  label, units or sector, and an id that is already in the catalogue or
 *  already declared. The anti-overreach pack always carries the refusal of
 *  any person-level score. */
export function declareField(project: Project, cat: Catalogue, input: { label: string; units: string; sector: string; anti_overreach?: readonly string[] }): DeclareFieldResult {
  const label = input.label.trim();
  const units = input.units.trim();
  const sector = input.sector.trim();
  if (!label) return { ok: false, reason: "a field needs a label" };
  if (!units) return { ok: false, reason: "a field needs its units — what its literature counts or measures in" };
  if (!sector) return { ok: false, reason: "a field needs a sector — a child never writes across sectors" };
  const id = fieldIdFor(label);
  if (id === OPERATOR_FIELD_PREFIX) return { ok: false, reason: "a label needs at least one letter or digit" };
  if (cat.fields.has(id)) return { ok: false, reason: `${id} is already in the catalogue` };
  if (project.extra_fields.some((f) => f.id === id)) return { ok: false, reason: `already declared: ${id}` };
  const packs = (input.anti_overreach ?? []).map((s) => s.trim()).filter(Boolean);
  const anti_overreach = packs.includes(FIELD_ANTI_OVERREACH_ALWAYS) ? packs : [...packs, FIELD_ANTI_OVERREACH_ALWAYS];
  return { ok: true, field: { id, label, units, sector, anti_overreach, license_required: false, origin: "operator" } };
}

/** The catalogue with the project's own fields added. A new Map each time —
 *  the shipped catalogue is never mutated. */
export function withExtraFields(cat: Catalogue, extra: readonly Field[]): Catalogue {
  if (extra.length === 0) return cat;
  const fields = new Map(cat.fields);
  for (const f of extra) fields.set(f.id, f);
  return { fields, bridges: cat.bridges };
}

export function isOperatorBridge(b: Bridge): boolean {
  return b.origin === "operator" || b.id.startsWith(OPERATOR_BRIDGE_PREFIX);
}

export type DeclareResult = { ok: true; bridge: Bridge } | { ok: false; reason: string };

/** Declare a session bridge between two fields of the catalogue. Refuses a
 *  self-edge, an unknown field, a duplicate of a shipped or declared edge,
 *  and a declaration not marked as an amendment. */
export function declareBridge(project: Project, cat: Catalogue, left: string, right: string, amendment: boolean): DeclareResult {
  if (!amendment) return { ok: false, reason: "tick “amendment, not evidence” — a declared bridge is an operator's amendment, never a finding" };
  if (!left || !right) return { ok: false, reason: "choose two fields" };
  if (left === right) return { ok: false, reason: "a bridge joins two different fields" };
  if (!cat.fields.has(left)) return { ok: false, reason: `unknown field ${left}` };
  if (!cat.fields.has(right)) return { ok: false, reason: `unknown field ${right}` };
  const joins = (b: Bridge) => (b.left === left && b.right === right) || (b.left === right && b.right === left);
  const shipped = [...cat.bridges.values()].find((b) => joins(b) && !isOperatorBridge(b));
  if (shipped) return { ok: false, reason: `${shipped.id} already joins ${left} — ${right}` };
  if (project.extra_bridges.some(joins)) return { ok: false, reason: `already declared: ${left} — ${right}` };
  const bridge: Bridge = { id: `${OPERATOR_BRIDGE_PREFIX}${left}-${right}`, left, right, junction: OPERATOR_JUNCTION, status: "live", ledger: [], register: [], origin: "operator" };
  return { ok: true, bridge };
}

/** The catalogue the bench reads: the shipped catalogue plus the project's
 *  amendments. A new Map each time — the shipped catalogue is never mutated. */
export function withExtraBridges(cat: Catalogue, extra: readonly Bridge[]): Catalogue {
  if (extra.length === 0) return cat;
  const bridges = new Map(cat.bridges);
  for (const b of extra) bridges.set(b.id, b);
  return { fields: cat.fields, bridges };
}

export function operatorBridgeIds(project: Project): ReadonlySet<string> {
  return new Set(project.extra_bridges.map((b) => b.id));
}

/** Append a note and record the works it used (by id, once each). */
export function withNote(project: Project, result: BenchOk, note: AnalysisNote, works: Map<string, Work>): Project {
  const seq = project.notes.length + 1;
  const have = new Set(project.works.map((w) => w.id));
  const added: Work[] = [];
  for (const p of result.parents) {
    const w = works.get(p.id);
    if (w && !have.has(w.id)) { have.add(w.id); added.push(w); }
  }
  return { ...project, works: [...project.works, ...added], notes: [...project.notes, { seq, result, note }] };
}

export function withUpload(project: Project, w: Work): Project {
  if (project.works.some((x) => x.id === w.id)) return project;
  return { ...project, works: [...project.works, w] };
}

const cell = (s: string | undefined | null) => (s ?? "—").replace(/\|/g, "\\|").replace(/\s+/g, " ");

/** One Markdown file: name, works table, extra bridges, every note in full,
 *  the closing negations. Built in code; no model. */
export function projectToMarkdown(project: Project): string {
  const L: string[] = [];
  L.push(`# ${project.name}`);
  L.push("");
  L.push(`Chronarch project pack · \`${project.id}\` · programmes: ${project.programme_ids.join(", ")} · ${project.notes.length} note${project.notes.length === 1 ? "" : "s"} · created ${project.created_at}`);
  L.push("");
  L.push("## Works used");
  L.push("");
  if (project.works.length === 0) L.push("none yet — a work joins this table when a note cites it or when it is uploaded in this session");
  else {
    L.push("| id | title | license | source_url | attribution |");
    L.push("|---|---|---|---|---|");
    for (const w of project.works) L.push(`| ${cell(w.id)} | ${cell(w.title)} | ${cell(w.license)} | ${cell(w.source_url)} | ${cell(w.attribution)} |`);
  }
  L.push("");
  L.push("## Fields declared (this group's own)");
  L.push("");
  if (project.extra_fields.length === 0) L.push("none — every field in this pack is one a loaded catalogue shipped");
  for (const f of project.extra_fields) L.push(`- \`${f.id}\`: ${f.label} · units: ${f.units} · sector: ${f.sector} · will not carry: ${f.anti_overreach.join("; ")} · declared on this project, not written to any programme file`);
  L.push("");
  L.push("## Extra bridges (session amendments)");
  L.push("");
  if (project.extra_bridges.length === 0) L.push("none — every path in this pack runs over shipped, declared bridges");
  for (const b of project.extra_bridges) L.push(`- \`${b.id}\`: ${b.left} — ${b.right} · operator-declared · ${b.junction} · not written to any programme file`);
  L.push("");
  L.push("## Notes");
  L.push("");
  if (project.notes.length === 0) L.push("none yet");
  for (const n of project.notes) {
    L.push(`### Note ${n.seq}`);
    L.push("");
    L.push(noteToMarkdown(n.result, n.note));
    L.push("");
  }
  L.push("## Closing");
  L.push("");
  for (const c of PACK_CLOSING) L.push(`- ${c}`);
  L.push("");
  L.push("_Built in code by Chronarch, a RexMetrix product, from the works, the token metrics and the accepted child pins. No model wrote this. Memory only until downloaded: nothing was sent anywhere._");
  return L.join("\n");
}

export function packFilename(project: Project): string {
  const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
  return `chronarch-pack-${slug}.md`;
}
