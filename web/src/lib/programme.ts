/** Chronarch model: fields, bridges, programmes, synthesis children — and the
 *  refusals, implemented as hard errors, not footnotes (specs/SYNTHESIS.md). */

export type Rating = "conjectural" | "supported" | "contested" | "established";
export type BridgeStatus = "draft" | "live" | "retired";
export type JobKind = "overlap" | "match" | "couple" | "question";
export const JOB_KINDS: readonly JobKind[] = ["overlap", "match", "couple", "question"];

export interface Field {
  id: string;
  label: string;
  units: string;
  sector: string;
  anti_overreach: string[];
  license_required?: boolean;
  /** Set only on a field the operator declared on a project; never present
   *  on a field shipped in a programme file. */
  origin?: "operator";
}

export interface Bridge {
  id: string;
  left: string;
  right: string;
  junction: string;
  status: BridgeStatus;
  ledger: { id: string; rating: Rating }[];
  register: { id: string; consequence: string; anti_rescue: boolean }[];
  /** Set only on a session amendment declared by the operator on a project;
   *  never present on a bridge shipped in a programme file. */
  origin?: "operator";
}

export interface ProgrammeBody {
  fields_used: string[];
  bridges_used: string[];
  array_lock: { items: string[]; locked_at: string };
  stop: { date: string; rule: string };
  deviations: { date: string; what: string; results_known_at_the_time: boolean }[];
  amendments: { date: string; old: string; new: string; reason: string }[];
}

export interface LicenseGrant {
  grantor: string;
  scope: string;
  terms?: string;
  granted_at?: string;
  ref?: string;
}

export interface ProgrammeFile {
  schema: "rexmetrix.programme/1";
  id: string;
  label: string;
  tenant?: string;
  note?: string;
  fields: Field[];
  bridges: Bridge[];
  programme: ProgrammeBody;
  license_grant?: LicenseGrant;
}

/** The reading record: an operator's claim about what a reading was, carried
 *  on the child and copied into the note (specs/ANALYSIS.md, "Ledger of a
 *  claim"). The bench checks its shape and refuses an incomplete or
 *  contradictory record. It does not run the protocol, fit anything, or
 *  verify that the claim is true. */
export type ReadingMode = "calibration" | "incremental";
export const READING_MODES: readonly ReadingMode[] = ["calibration", "incremental"];
export const INTERMEDIARY_STATUSES = ["recovered_known", "candidate_confound", "not_identified", "untested_prediction", "incremental_value", "dropped"] as const;
export type IntermediaryStatus = (typeof INTERMEDIARY_STATUSES)[number];
export interface IdentifiabilityContrast {
  contrast: string; // one sentence
  nominal_input_held_fixed: string; // what was held
  covariates_held_fixed: string[]; // published covariates
}
export type Identifiability = IdentifiabilityContrast | "not_identified";
export interface Comparison {
  published_covariate_set: string[]; // non-empty
  added_parameter: string; // one string, never a list
  locked_metric: string;
  threshold: string | number; // operator-declared
  threshold_fixed_before_run: boolean; // false is a refusal, not a warning
}
export interface ReadingRecord {
  mode?: ReadingMode | null;
  intermediary_status?: IntermediaryStatus | null;
  identifiability?: Identifiability | null;
  comparison?: Comparison | null;
}

export interface ChildPin extends ReadingRecord {
  schema?: "rexmetrix.child/1";
  id: string;
  kind: JobKind;
  parents: { pin: string; field: string; work?: string }[];
  path?: string[];
  clique?: string[];
  method: string;
  grants: LicenseGrant[];
  sector: string;
  subject: string;
  writes_to: string | null;
}

export interface Catalogue {
  fields: Map<string, Field>;
  bridges: Map<string, Bridge>;
}

export type RefusalCode =
  | "NO_BRIDGE" | "LICENSE_MISSING" | "INDIVIDUAL_SCORE_FORBIDDEN" | "CROSS_SECTOR_WRITE" | "BAD_KIND" | "UNKNOWN_FIELD" | "FULLTEXT_FORBIDDEN" | "STUB_NO_FULLTEXT" | "UNKNOWN_WORK"
  // the reading record (specs/ANALYSIS.md): shape and contradiction only — never the truth of the claim
  | "MODE_REQUIRED" | "STATUS_REQUIRED" | "CALIBRATION_CANNOT_INCREMENT" | "IDENTIFIABILITY_REQUIRED" | "COMPARISON_BLOCKED" | "COMPARISON_REQUIRED" | "COMPARISON_FORBIDDEN" | "THRESHOLD_NOT_LOCKED" | "COUPLE_IS_LEXICAL";

/** The job kinds that must carry a reading record; a question pin carries none. */
export const RECORDED_KINDS: ReadonlySet<JobKind> = new Set<JobKind>(["overlap", "match", "couple"]);

const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** A comparison block counts as present when any of its fields carries a value; null, omitted or all-empty is absent. */
export function comparisonPresent(c: unknown): boolean {
  if (c === null || c === undefined) return false;
  if (!isRecord(c)) return true; // a malformed presence is still a presence
  return Object.values(c).some((v) => (Array.isArray(v) ? v.length > 0 : typeof v === "string" ? v.trim() !== "" : typeof v === "number" ? true : v === true));
}

/** Every field of the comparison block filled with the right shape (the lock's value is checked separately). */
export function comparisonComplete(c: unknown): c is Comparison {
  if (!isRecord(c)) return false;
  const set = c.published_covariate_set;
  if (!Array.isArray(set) || set.length === 0 || !set.every(nonEmpty)) return false;
  if (!nonEmpty(c.added_parameter)) return false; // one string, not a list
  if (!nonEmpty(c.locked_metric)) return false;
  const th = c.threshold;
  if (!(nonEmpty(th) || (typeof th === "number" && Number.isFinite(th)))) return false;
  return typeof c.threshold_fixed_before_run === "boolean";
}

export function identifiabilityValid(v: unknown): v is Identifiability {
  if (v === "not_identified") return true;
  if (!isRecord(v)) return false;
  return nonEmpty(v.contrast) && nonEmpty(v.nominal_input_held_fixed) && Array.isArray(v.covariates_held_fixed) && v.covariates_held_fixed.every((s) => typeof s === "string");
}

/** The reading record's law. Throws a Refusal; returns nothing. A question
 *  pin is legal with none of the four fields and is not checked here. */
export function validateReadingRecord(child: ChildPin): void {
  if (!RECORDED_KINDS.has(child.kind)) return;
  const mode = child.mode ?? null;
  const status = child.intermediary_status ?? null;
  if (mode === null) throw new Refusal("MODE_REQUIRED", `a ${child.kind} reading must say its mode: calibration or incremental`);
  if (!READING_MODES.includes(mode)) throw new Refusal("MODE_REQUIRED", `mode ${String(mode)} is not calibration or incremental`);
  if (status === null) throw new Refusal("STATUS_REQUIRED", `a ${child.kind} reading must carry an intermediary_status: ${INTERMEDIARY_STATUSES.join(" | ")}`);
  if (!(INTERMEDIARY_STATUSES as readonly string[]).includes(status)) throw new Refusal("STATUS_REQUIRED", `intermediary_status ${String(status)} is not one of ${INTERMEDIARY_STATUSES.join(" | ")}`);
  if (mode === "calibration" && status === "incremental_value") throw new Refusal("CALIBRATION_CANNOT_INCREMENT", "a calibration reading recovers a known answer; it cannot carry incremental_value");
  const ident = child.identifiability ?? null;
  if (ident === null || !identifiabilityValid(ident)) throw new Refusal("IDENTIFIABILITY_REQUIRED", `a ${child.kind} reading must carry identifiability: a contrast (one sentence, the nominal input held fixed, the published covariates held fixed) or exactly "not_identified"`);
  const cmp = child.comparison ?? null;
  const present = comparisonPresent(cmp);
  if (ident === "not_identified" && present) throw new Refusal("COMPARISON_BLOCKED", "identifiability is not_identified: no comparison may stand beside it");
  if (status === "incremental_value") {
    if (!present || !comparisonComplete(cmp)) throw new Refusal("COMPARISON_REQUIRED", "incremental_value needs a complete comparison: published_covariate_set (non-empty), added_parameter (one string), locked_metric, threshold, threshold_fixed_before_run");
    if (cmp.threshold_fixed_before_run !== true) throw new Refusal("THRESHOLD_NOT_LOCKED", "threshold_fixed_before_run must be true: a threshold chosen after the run is a refusal, not a warning");
  } else if (present) {
    throw new Refusal("COMPARISON_FORBIDDEN", `a comparison block belongs only to incremental_value; this reading is ${status}`);
  }
}

export class Refusal extends Error {
  constructor(public readonly code: RefusalCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "Refusal";
  }
}

/** The union of several programme files: one catalogue of fields and bridges. */
export function catalogueOf(files: ProgrammeFile[]): Catalogue {
  const fields = new Map<string, Field>();
  const bridges = new Map<string, Bridge>();
  for (const f of files) {
    for (const field of f.fields) fields.set(field.id, field);
    for (const bridge of f.bridges) bridges.set(bridge.id, bridge);
  }
  return { fields, bridges };
}

export function otherEnd(bridge: Bridge, field: string): string | null {
  if (bridge.left === field) return bridge.right;
  if (bridge.right === field) return bridge.left;
  return null;
}

/** Programme summary counts (what the floor reads out). */
export function programmeCounts(p: ProgrammeFile) {
  const used = new Set(p.programme.bridges_used);
  const bridges = p.bridges.filter((b) => used.has(b.id));
  return {
    field_count: p.programme.fields_used.length,
    bridge_count: p.programme.bridges_used.length,
    ledger_count: bridges.reduce((n, b) => n + b.ledger.length, 0),
    register_count: bridges.reduce((n, b) => n + b.register.length, 0),
    array_size: p.programme.array_lock.items.length,
    amendment_count: p.programme.amendments.length,
    deviation_count: p.programme.deviations.length,
    stop_date: p.programme.stop.date,
  };
}

const INDIVIDUAL_WORDS = /\b(individual|person|per[- ]person|patient|subject)\b[^.]{0,40}\b(score|index|scoring|assessment|profile|rating)\b|\b(score|index|assessment)\b[^.]{0,40}\b(an individual|a person|per person|the patient)\b/i;

/** The only thing a request for a person-level score on the Programme Zero
 *  construct can do here is refuse. There is no derived index, scoring
 *  algorithm or assessment instrument in Chronarch. */
export function requestIndividualScore(_field: string, _subject?: string): never {
  throw new Refusal("INDIVIDUAL_SCORE_FORBIDDEN", "Chronarch computes no individual-level score, index or assessment on any field's construct; the Programme Zero corpus forbids it explicitly");
}

/** Jobs that read bodies, not citations. A `question` may cite a stub. */
export const BODY_JOBS: ReadonlySet<JobKind> = new Set<JobKind>(["overlap", "match", "couple"]);

/** The subset of the works model this validator needs (specs/WORKS.md). */
export interface WorkRef {
  id: string;
  license: string;
  oa: boolean;
  bytes?: false | "present";
}
const FULLTEXT_OK = new Set(["cc-by-4.0", "cc0", "mit", "public-domain", "us-government", "arxiv-nonexclusive"]);

/** Validate a child against a catalogue (and, when given, the works its parents
 *  cite). Throws a Refusal; returns the ordered field walk of the path (or the
 *  clique's bridges) when the child is legal. */
export function validateChild(cat: Catalogue, child: ChildPin, works?: Map<string, WorkRef>): { walk: string[]; bridges: string[] } {
  if (!JOB_KINDS.includes(child.kind)) throw new Refusal("BAD_KIND", `kind ${String(child.kind)} is not overlap|match|couple|question`);

  // Works: only legal works enter; a body is needed by overlap|match|couple.
  for (const p of child.parents) {
    if (!p.work) continue;
    if (!works) throw new Refusal("UNKNOWN_WORK", `parent cites work ${p.work} but no works catalogue was given`);
    const w = works.get(p.work);
    if (!w) throw new Refusal("UNKNOWN_WORK", `parent cites work ${p.work}, which is not in the works catalogue`);
    if (!w.license) throw new Refusal("LICENSE_MISSING", `work ${w.id} has no licence`);
    if (w.bytes === "present" && !FULLTEXT_OK.has(w.license)) throw new Refusal("FULLTEXT_FORBIDDEN", `work ${w.id} claims full text under ${w.license}`);
    const body = w.bytes === "present" && FULLTEXT_OK.has(w.license) && w.oa;
    if (!body && BODY_JOBS.has(child.kind)) throw new Refusal("STUB_NO_FULLTEXT", `a ${child.kind} job needs a body; work ${w.id} is a citation only (a question may cite it)`);
  }
  if (child.parents.length < 2) throw new Refusal("NO_BRIDGE", "a child needs parents in at least two fields");
  const parentFields = child.parents.map((p) => p.field);
  for (const f of parentFields) if (!cat.fields.has(f)) throw new Refusal("UNKNOWN_FIELD", `parent field ${f} is not in the catalogue`);

  // Anti-overreach: no individual-level score on any parent whose pack forbids it.
  const asksIndividual = /\bindividual\b/i.test(child.subject) || INDIVIDUAL_WORDS.test(child.method);
  if (asksIndividual) {
    for (const f of parentFields) {
      const field = cat.fields.get(f)!;
      if (field.anti_overreach.some((a) => /individual|index|assessment|score/i.test(a))) {
        throw new Refusal("INDIVIDUAL_SCORE_FORBIDDEN", `field ${f} forbids an individual-level score, index or assessment`);
      }
    }
  }

  // Arm's length: licensed fields need a grant that covers them.
  for (const f of parentFields) {
    const field = cat.fields.get(f)!;
    if (field.license_required && !child.grants.some((g) => g.scope === f)) {
      throw new Refusal("LICENSE_MISSING", `field ${f} is at arm's length: a license_grant covering it must exist before its pins parent a child`);
    }
  }

  // The declared connection: a path or a clique of LIVE bridges. Parents that
  // all sit in ONE field share a vocabulary already: no bridge is needed.
  let bridges: string[] = [];
  const walk: string[] = [];
  const oneField = new Set(parentFields).size === 1;
  if (oneField && !(child.path && child.path.length > 0) && !(child.clique && child.clique.length > 0)) {
    walk.push(parentFields[0]!);
  } else if (child.path && child.path.length > 0) {
    bridges = child.path;
    let at = parentFields[0]!;
    walk.push(at);
    for (const id of child.path) {
      const b = cat.bridges.get(id);
      if (!b) throw new Refusal("NO_BRIDGE", `bridge ${id} is not in the catalogue`);
      if (b.status !== "live") throw new Refusal("NO_BRIDGE", `bridge ${id} is ${b.status}, not live`);
      const next = otherEnd(b, at);
      if (next === null) throw new Refusal("NO_BRIDGE", `bridge ${id} does not touch ${at}; the path breaks`);
      at = next;
      walk.push(at);
    }
    const last = parentFields[parentFields.length - 1]!;
    if (at !== last) throw new Refusal("NO_BRIDGE", `the path ends at ${at}, not at parent field ${last}`);
    for (const f of parentFields) if (!walk.includes(f)) throw new Refusal("NO_BRIDGE", `parent field ${f} is not on the declared path`);
  } else if (child.clique && child.clique.length > 0) {
    bridges = child.clique;
    const live = child.clique.map((id) => {
      const b = cat.bridges.get(id);
      if (!b) throw new Refusal("NO_BRIDGE", `bridge ${id} is not in the catalogue`);
      if (b.status !== "live") throw new Refusal("NO_BRIDGE", `bridge ${id} is ${b.status}, not live`);
      return b;
    });
    for (let i = 0; i < parentFields.length; i++) {
      for (let j = i + 1; j < parentFields.length; j++) {
        const a = parentFields[i]!;
        const c = parentFields[j]!;
        if (!live.some((b) => otherEnd(b, a) === c)) throw new Refusal("NO_BRIDGE", `no live bridge in the clique joins ${a} and ${c}`);
      }
    }
    walk.push(...parentFields);
  } else {
    throw new Refusal("NO_BRIDGE", "a child must declare a path or a clique of live bridges; there is no implicit coupling");
  }

  // A child never writes across sectors.
  if (child.writes_to) {
    const target = cat.fields.get(child.writes_to);
    if (!target) throw new Refusal("UNKNOWN_FIELD", `writes_to ${child.writes_to} is not in the catalogue`);
    if (target.sector !== child.sector) throw new Refusal("CROSS_SECTOR_WRITE", `a ${child.sector} child may not write into ${target.id} (${target.sector})`);
  }

  // The reading record: an operator's claim, checked for shape and contradiction only.
  validateReadingRecord(child);

  return { walk, bridges };
}

export function isProgrammeFile(v: unknown): v is ProgrammeFile {
  return typeof v === "object" && v !== null && (v as { schema?: unknown }).schema === "rexmetrix.programme/1";
}
