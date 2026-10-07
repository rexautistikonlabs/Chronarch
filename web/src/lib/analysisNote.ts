/** AnalysisNote: the default result of a successful bench action, built in
 *  code from the works, the metrics already computed and the child that
 *  validateChild accepted (specs/ANALYSIS.md). Pure: no fetch, no model.
 *
 *  Every finding sentence cites a work id or a metric id. Where the bodies
 *  cannot support a section, the section says so. Nothing is invented. The
 *  four reading-record fields are copied from the child: a ledger of an
 *  operator's claim, never a bench result. */
import type { BenchOk, ParentView } from "./bench";
import { percent, type PairMetrics } from "./metrics";
import type { Comparison, Identifiability, IntermediaryStatus, JobKind, ProgrammeFile, ReadingMode } from "./programme";
import type { Work } from "./works";

export type ObjectRole = "ledger" | "register" | "note" | "stub" | "body";

export interface AnalysisNote {
  job: "converge" | "compare" | "analyze";
  kind: JobKind;
  ok: true;
  question: string;
  objects: { work_id: string; title: string; field: string; license: string; role: ObjectRole }[];
  compared: { tokens?: PairMetrics; path: string[]; grants: string[] };
  findings: { text: string; cites: string[] }[];
  assumptions_used: { id: string; text: string; rating?: string }[];
  would_falsify: string;
  is_not: string[];
  appendix: { jaccard?: number; snippets: { id: string; text: string }[]; child_id: string };
  /** The reading record — an operator claim copied from the child; null on a question pin. */
  mode: ReadingMode | null;
  intermediary_status: IntermediaryStatus | null;
  identifiability: Identifiability | null;
  comparison: Comparison | null;
}

/** The line every rendering of the record must carry. */
export const RECORD_CAPTION = "operator record, not a bench result.";

export const IS_NOT_ALWAYS: readonly string[] = [
  "not a fitted model",
  "not peer review",
  "not a clinical claim",
  "not an individual score",
  "not a nested model comparison",
  "not a measurement of a person",
  "not evidence the architecture generalises",
];

/** Phrases a note may never carry (specs/LEGAL.md, product law on results). */
export const NOTE_BANS: readonly string[] = [
  "public " + "chain",
  "foundation-" + "endorsed",
  "diagnos" + "tic",
  "treat" + "ment",
  "individual " + "score", // allowed only in the is_not list as its negation
  "the framework is " + "confirmed",
  "fascia " + "therapy",
];

/** Result labels and verdict sentences a note may never carry: the bench
 *  records a reading, it does not grade one. Patterns, where a substring
 *  would catch ordinary words ("pass" inside "passes"). */
export const NOTE_BAN_PATTERNS: readonly { name: string; re: RegExp }[] = [
  { name: "PASS as a result label", re: /(^|[^A-Za-z])PASS(?![a-z])/ },
  { name: "HIGH-POTENTIAL PASS", re: /high[- ]potential pass/i },
  { name: "new experimentally separable variable", re: /new experimentally separable variable/i },
  { name: "discovery opportunity", re: /discovery opportunit/i },
  { name: "the bench fitted, proved or discovered an intermediary", re: /\b(fitted|fits?|proved|proves|proven|discovered|discovers)\b[^.;]{0,80}\bintermediar(y|ies)\b|\bintermediar(y|ies)\b[^.;]{0,80}\b(was|were|is|are|has been|have been)\s+(fitted|fit|proved|proven|discovered)\b/i },
];

export function noteBanHits(note: AnalysisNote): string[] {
  const texts = [note.question, ...note.findings.map((f) => f.text), note.would_falsify, ...note.is_not.filter((s) => !IS_NOT_ALWAYS.includes(s))];
  const hits: string[] = [];
  for (const t of texts) {
    const low = t.toLowerCase();
    for (const b of NOTE_BANS) if (low.includes(b) && !(b === "individual " + "score" && /\bnot an individual score\b/.test(low))) hits.push(`${b} ← ${t}`);
    for (const p of NOTE_BAN_PATTERNS) if (p.re.test(t)) hits.push(`${p.name} ← ${t}`);
  }
  return hits;
}

function roleOf(w: Work | undefined, view: ParentView): ObjectRole {
  if (!view.snippet) return "stub";
  const id = w?.id ?? view.id;
  if (/ledger/.test(id)) return "ledger";
  if (/register/.test(id)) return "register";
  if (/note/.test(id)) return "note";
  return "body";
}

export const IS_NOT_OPERATOR_BRIDGE = "bridge was operator-declared";

/** `operatorBridges`: ids of session-declared bridges. A note whose path runs
 *  over one carries the negation and an empty assumptions ledger — an
 *  amendment is not evidence and has no rated entries to cite. */
export function buildNote(result: BenchOk, works: Map<string, Work>, programmes: ProgrammeFile[], operatorBridges: ReadonlySet<string> = new Set()): AnalysisNote {
  const objects = result.parents.map((p) => ({ work_id: p.id, title: p.title, field: p.field, license: p.license, role: roleOf(works.get(p.id), p) }));
  const ids = objects.map((o) => o.work_id);
  const [a, b] = objects;
  const sameField = new Set(objects.map((o) => o.field)).size === 1;
  const grants = result.child.grants.map((g) => g.scope);
  const path = result.child.path ?? result.child.clique ?? [];
  const m = result.metrics ?? undefined;
  const kind = result.child.kind;

  const question = questionFor(kind, result, a, b, path);

  const findings: AnalysisNote["findings"] = [];
  if (kind === "question") {
    // a stub among the parents: no finding can be supported by a body that is not there
  } else if (m) {
    if (kind === "overlap") {
      findings.push({ text: `${m.shared.length} tokens are shared between ${a!.work_id} and ${b!.work_id}; ${m.onlyLeft.length} appear only in the first and ${m.onlyRight.length} only in the second (Jaccard ${percent(m.jaccard)}).`, cites: [...ids, "metric:jaccard"] });
      findings.push({ text: sameField ? `Both works are shelved in one field (${a!.field}); the overlap is read within one vocabulary and needed no bridge.` : `The works sit in different fields (${a!.field} and ${b!.field}); the overlap is read across ${path.length} declared bridge${path.length === 1 ? "" : "s"}.`, cites: ids });
      findings.push({ text: grants.length ? `A licence grant covers ${grants.join(", ")}, so the corpus field's pins may parent this child.` : `No licence grant was needed: none of the parent fields is at arm's length.`, cites: ids });
    } else {
      findings.push({ text: `Lexical agreement between ${a!.work_id} and ${b!.work_id} is ${percent(m.jaccard)} (Jaccard); ${m.onlyLeft.length} tokens appear only in the first and ${m.onlyRight.length} only in the second. Lexical overlap only.`, cites: [...ids, "metric:jaccard"] });
      if (kind === "couple") findings.push({ text: `No numeric coupling was fitted: the two bodies were read side by side along ${path.length ? path.join(" → ") : "one field"}, and the number above is a token ratio.`, cites: ids });
    }
  } else {
    findings.push({ text: `The bodies cannot support a token comparison here (a body is missing or more than two works were selected); no metric is reported.`, cites: ids });
  }
  // The reading record is the operator's: when it claims incremental value, the
  // note says in one sentence whose claim the comparison block is. Nothing is fitted.
  const record = RECORDED.has(kind) ? { mode: result.child.mode ?? null, intermediary_status: result.child.intermediary_status ?? null, identifiability: result.child.identifiability ?? null, comparison: result.child.comparison ?? null } : { mode: null, intermediary_status: null, identifiability: null, comparison: null };
  if (record.intermediary_status === "incremental_value" && record.comparison) {
    const c = record.comparison;
    findings.push({ text: `The comparison block (published covariate set: ${c.published_covariate_set.join(", ")}; added parameter: ${c.added_parameter}; locked metric: ${c.locked_metric}; threshold ${String(c.threshold)}, fixed before the run) is an operator record, not a bench result; no fit statistic was computed here.`, cites: ids });
  }

  const overOperatorBridge = result.bridges.some((id) => operatorBridges.has(id)) || path.some((id) => operatorBridges.has(id));
  const assumptions_used = overOperatorBridge ? [] : assumptionsFor(objects, programmes);

  const would_falsify =
    kind === "question"
      ? "a body appearing on the stub would be required before match/couple."
      : m
        ? `recomputing the token sets of ${ids.join(" and ")} and finding a different shared count than ${m.shared.length} of ${m.shared.length + m.onlyLeft.length + m.onlyRight.length}; or a re-rating of a cited assumption to contested.`
        : "a body appearing on each parent would be required before any reading.";

  const is_not = [
    ...IS_NOT_ALWAYS,
    kind === "question" ? "not a claim — a question pin asks" : "not a causal claim",
    "not a statement about any person",
    ...(overOperatorBridge ? [IS_NOT_OPERATOR_BRIDGE] : []),
  ];

  return {
    job: result.action,
    kind,
    ok: true,
    question,
    objects,
    compared: { ...(m ? { tokens: m } : {}), path, grants },
    findings,
    assumptions_used,
    would_falsify,
    is_not,
    appendix: { ...(m ? { jaccard: m.jaccard } : {}), snippets: result.parents.filter((p) => p.snippet).map((p) => ({ id: p.id, text: p.snippet! })), child_id: result.child.id },
    ...record,
  };
}

const RECORDED: ReadonlySet<JobKind> = new Set<JobKind>(["overlap", "match", "couple"]);

function questionFor(kind: JobKind, result: BenchOk, a?: AnalysisNote["objects"][number], b?: AnalysisNote["objects"][number], path: string[] = []): string {
  if (kind === "question" && result.question) return result.question;
  const along = path.length ? ` along ${path.join(" → ")}` : " within one field";
  if (kind === "overlap") return `Which identifiers and terms do “${a?.title}” and “${b?.title}” share${along}?`;
  if (kind === "match") return `How far do the bodies of “${a?.title}” and “${b?.title}” agree, token for token${along}?`;
  return `Read side by side${along}, what do “${a?.title}” and “${b?.title}” say about the same things?`;
}

/** Only labels already in programme metadata; only for the Programme Zero
 *  ledger/register stand-in pair. Other pairs: none. */
function assumptionsFor(objects: AnalysisNote["objects"], programmes: ProgrammeFile[]): AnalysisNote["assumptions_used"] {
  const roles = new Set(objects.map((o) => o.role));
  const pz = programmes.find((p) => p.id === "programme-zero");
  if (!pz || objects.length !== 2 || !roles.has("ledger") || !roles.has("register")) return [];
  if (!objects.every((o) => o.field === "autistikon-programme-zero")) return [];
  const bridge = pz.bridges.find((br) => pz.programme.bridges_used.includes(br.id));
  if (!bridge) return [];
  return [
    ...bridge.ledger.map((l) => ({ id: l.id, text: `assumption entry of ${bridge.id}; the fixture records a rating and no statement`, rating: l.rating })),
    ...bridge.register.map((f) => ({ id: f.id, text: `falsifier entry of ${bridge.id}; consequence: ${f.consequence}` })),
  ];
}
