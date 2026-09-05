/** Workbench filters and the Programme column. The two Programme Zero
 *  stand-ins are always listed under All and under Autistikon; Classics hides
 *  them. Nothing here decides law — it decides what the table shows. */
import type { Work } from "./works";

export type FilterKey = "all" | "autistikon" | "classics";
export const FILTERS: readonly { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "autistikon", label: "Autistikon · example corpus — not the product" },
  { key: "classics", label: "Classics" },
];

export const CLASSICS_FIELDS: ReadonlySet<string> = new Set(["natural-history", "heredity", "optics", "electricity", "electromagnetism", "metrology"]);
export const AUTISTIKON_FIELD = "autistikon-programme-zero";
export const STAND_INS: ReadonlySet<string> = new Set(["work-pz-ledger-structure", "work-pz-register-structure"]);

export type ProgrammeLabel = "Autistikon (example corpus)" | "Classics" | "Upload" | "Toy (demo)" | "Stub";

export function isAutistikon(w: Work): boolean {
  return w.programme === "programme-zero" || w.field === AUTISTIKON_FIELD || STAND_INS.has(w.id) || /\((structure only)\)/.test(w.title) && /ledger|register/i.test(w.title);
}

export function isClassics(w: Work): boolean {
  return !!w.field && CLASSICS_FIELDS.has(w.field);
}

export function programmeLabel(w: Work): ProgrammeLabel {
  if (w.source === "upload") return "Upload";
  if (isAutistikon(w)) return "Autistikon (example corpus)";
  if (isClassics(w)) return "Classics";
  if (w.programme === "programme-toy" || (w.field ?? "").startsWith("toy-")) return "Toy (demo)";
  return "Stub";
}

export function applyFilter(works: Work[], filter: FilterKey, field: string | null): Work[] {
  let out = works;
  if (filter === "autistikon") out = out.filter(isAutistikon);
  else if (filter === "classics") out = out.filter(isClassics);
  if (field) out = out.filter((w) => w.field === field);
  return out;
}
