/** Works: only legal works enter RexMetrix (specs/WORKS.md).
 *
 *  A work is a record — title, licence, flags — never bytes. Full text may be
 *  flagged present only under an allowing licence; a stub is a citation, not a
 *  body. The software does not decide a courtroom question: it requires a
 *  licence on every record and refuses the cases it can decide. */
import { Refusal } from "./programme";

export const LICENSES = ["cc-by-4.0", "cc0", "mit", "public-domain", "arxiv-nonexclusive", "stub-metadata", "all-rights-reserved"] as const;
export type License = (typeof LICENSES)[number];

/** Licences under which `bytes: "present"` is allowed. */
export const FULLTEXT_LICENSES: ReadonlySet<License> = new Set<License>(["cc-by-4.0", "cc0", "mit", "public-domain", "arxiv-nonexclusive"]);

export type WorkSource = "preload" | "upload" | "index";

export interface Work {
  id: string;
  title: string;
  doi?: string | null;
  year?: number;
  license: License;
  oa: boolean;
  source: WorkSource;
  bytes?: false | "present";
  programme?: string;
  field?: string; // the catalogue field the work is shelved in; a parent needs one
  rights_declared?: boolean;
}

export interface WorksFile {
  schema: "rexmetrix.works/1";
  note?: string;
  works: Work[];
}

export function isLicense(v: unknown): v is License {
  return typeof v === "string" && (LICENSES as readonly string[]).includes(v);
}

export function allowsFullText(license: License): boolean {
  return FULLTEXT_LICENSES.has(license);
}

/** A work has a body only when it is flagged present under an allowing licence and is open. */
export function hasFullText(w: Work): boolean {
  return w.bytes === "present" && allowsFullText(w.license) && w.oa;
}

/** Validate one record. Throws FULLTEXT_FORBIDDEN or LICENSE_MISSING; returns
 *  "body" or "stub" (STUB_NO_FULLTEXT is a status here — a stub may exist; it
 *  is the job that needs a body which refuses). */
export function validateWork(w: Partial<Work>): "body" | "stub" {
  if (!isLicense(w.license)) throw new Refusal("LICENSE_MISSING", `work ${w.id ?? w.title ?? "?"} has no licence; every record carries one`);
  if (w.bytes === "present" && !allowsFullText(w.license)) {
    throw new Refusal("FULLTEXT_FORBIDDEN", `work ${w.id ?? w.title ?? "?"} claims full text under ${w.license}, which does not allow it`);
  }
  if (!w.id || !w.title) throw new Refusal("LICENSE_MISSING", "a work needs an id and a title beside its licence");
  return hasFullText(w as Work) ? "body" : "stub";
}

export interface UploadRequest {
  title: string;
  license?: string | null;
  claimsBytes: boolean;
  rights?: boolean;
  doi?: string | null;
  year?: number;
  programme?: string;
  field?: string;
}

export type UploadResult = { ok: true; work: Work } | { ok: false; code: "FULLTEXT_FORBIDDEN" | "LICENSE_MISSING" | "RIGHTS_UNDECLARED"; detail: string };

let uploadSeq = 0;

/** Accept or refuse an upload. Model only: the accepted record is returned for
 *  the session catalogue in memory; no file is written anywhere. */
export function acceptUpload(req: UploadRequest): UploadResult {
  if (!isLicense(req.license)) return { ok: false, code: "LICENSE_MISSING", detail: "a licence is required on every record" };
  if (req.claimsBytes && !allowsFullText(req.license)) return { ok: false, code: "FULLTEXT_FORBIDDEN", detail: `full text may not be claimed under ${req.license}` };
  if (req.claimsBytes && !req.rights) return { ok: false, code: "RIGHTS_UNDECLARED", detail: "declare that you have rights to this file before claiming its full text" };
  const title = req.title.trim();
  if (!title) return { ok: false, code: "LICENSE_MISSING", detail: "a title is required beside the licence" };
  uploadSeq += 1;
  const work: Work = {
    id: `work-upload-${uploadSeq}`,
    title,
    doi: req.doi ?? null,
    ...(req.year !== undefined ? { year: req.year } : {}),
    license: req.license,
    oa: allowsFullText(req.license),
    source: "upload",
    bytes: req.claimsBytes ? "present" : false,
    ...(req.programme ? { programme: req.programme } : {}),
    ...(req.field ? { field: req.field } : {}),
    rights_declared: !!req.rights,
  };
  return { ok: true, work };
}

export function worksMap(list: Work[]): Map<string, Work> {
  return new Map(list.map((w) => [w.id, w]));
}

export const REFUSAL_CODES_WORKS = ["FULLTEXT_FORBIDDEN", "LICENSE_MISSING", "STUB_NO_FULLTEXT", "RIGHTS_UNDECLARED"] as const;
