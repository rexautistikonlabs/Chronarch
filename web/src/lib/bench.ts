/** The operator bench: three actions over selected works, each a synthesis
 *  job run through the same law as any other (specs/SYNTHESIS.md, WORKS.md).
 *
 *    Converge = overlap   shared identifiers / citations between selected works
 *    Compare  = match     agreement of two bodies
 *    Analyze  = question if any parent is only a stub, else couple
 *
 *  Nothing here calls a model or fetches anything: the bench builds a child
 *  pin from the selection, finds the declared bridges between the parents'
 *  fields, and lets validateChild accept or refuse it. */
import { validateChild, type Catalogue, type ChildPin, type JobKind, type LicenseGrant, type ProgrammeFile } from "./programme";
import { hasFullText, type Work } from "./works";

export type ActionKind = "converge" | "compare" | "analyze";

export const ACTIONS: readonly { key: ActionKind; label: string; help: string }[] = [
  { key: "converge", label: "Converge", help: "shared identifiers / citations between selected works." },
  { key: "compare", label: "Compare", help: "agreement of two bodies." },
  { key: "analyze", label: "Analyze", help: "couple models, or open a question if a parent is only a stub." },
];

export type BenchResult = { ok: true; child: ChildPin; walk: string[]; bridges: string[] } | { ok: false; code: string; detail: string };

/** Shortest path of live bridges between two fields, as bridge ids. Null when none. */
export function bridgePath(cat: Catalogue, from: string, to: string): string[] | null {
  if (from === to) return [];
  const prev = new Map<string, { field: string; bridge: string } | null>([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const at = queue.shift()!;
    for (const b of cat.bridges.values()) {
      if (b.status !== "live") continue;
      const next = b.left === at ? b.right : b.right === at ? b.left : null;
      if (next === null || prev.has(next)) continue;
      prev.set(next, { field: at, bridge: b.id });
      if (next === to) {
        const path: string[] = [];
        let cur: string | null = to;
        while (cur && prev.get(cur)) {
          const step: { field: string; bridge: string } = prev.get(cur)!;
          path.unshift(step.bridge);
          cur = step.field;
        }
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}

export function kindFor(action: ActionKind, parents: Work[]): JobKind {
  if (action === "converge") return "overlap";
  if (action === "compare") return "match";
  return parents.some((w) => !hasFullText(w)) ? "question" : "couple";
}

let seq = 0;

export function runAction(action: ActionKind, selected: Work[], cat: Catalogue, files: ProgrammeFile[], works: Map<string, Work>): BenchResult {
  if (selected.length < 2) return { ok: false, code: "NEED_PARENTS", detail: "select at least two works; a child needs parents" };
  const kind = kindFor(action, selected);
  const parents = selected.map((w) => ({ pin: `pin:${w.id}`, field: w.field ?? "", work: w.id }));
  for (const p of parents) {
    if (!p.field) return { ok: false, code: "UNKNOWN_FIELD", detail: `work ${p.work} is not shelved in a field; give it one before it parents a child` };
  }
  // The declared connection: shortest live path between consecutive parent fields.
  const fields = parents.map((p) => p.field);
  let path: string[] = [];
  let noBridge: string | null = null;
  for (let i = 0; i < fields.length - 1; i++) {
    const seg = bridgePath(cat, fields[i]!, fields[i + 1]!);
    if (seg === null) {
      noBridge = `${fields[i]} and ${fields[i + 1]}`;
      break;
    }
    path = path.concat(seg);
  }
  // Grants: any licensed parent field takes the programme's grant when one exists.
  const grants: LicenseGrant[] = [];
  for (const f of new Set(fields)) {
    const field = cat.fields.get(f);
    if (field?.license_required) {
      const g = files.find((pf) => pf.license_grant?.scope === f)?.license_grant;
      if (g) grants.push({ grantor: g.grantor, scope: g.scope, ref: `${files.find((pf) => pf.license_grant?.scope === f)!.id}.license_grant` });
    }
  }
  seq += 1;
  const child: ChildPin = {
    schema: "rexmetrix.child/1",
    id: `child-${action}-${String(seq).padStart(3, "0")}`,
    kind,
    parents,
    ...(noBridge === null ? { path } : {}),
    method: methodFor(action, kind, selected),
    grants,
    sector: "synthesis",
    subject: "cohort-level literature",
    writes_to: null,
  };
  if (noBridge !== null) return { ok: false, code: "NO_BRIDGE", detail: `no declared live path between ${noBridge}` };
  try {
    const r = validateChild(cat, child, works);
    return { ok: true, child, ...r };
  } catch (e) {
    const err = e as { code?: string; message: string };
    return { ok: false, code: err.code ?? "REFUSED", detail: err.message };
  }
}

function methodFor(action: ActionKind, kind: JobKind, selected: Work[]): string {
  const titles = selected.map((w) => w.id).join(", ");
  if (action === "converge") return `overlap: shared identifiers and citations between ${titles}`;
  if (action === "compare") return `match: agreement of the bodies of ${titles}, one to one, unmatched remainder listed`;
  return kind === "question" ? `question: what one parent could stand beside in the other, along the declared path — a stub among the parents, so a pin that asks and claims nothing (${titles})` : `couple: a joint reading of ${titles} along the declared path, at the reliability the ledger permits`;
}
