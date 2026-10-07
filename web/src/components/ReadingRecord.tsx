/** The reading record form: the operator's claim about what a reading is —
 *  mode, intermediary_status, identifiability, and a comparison block that
 *  belongs only to incremental_value. Nothing here is filled in by default;
 *  an empty field is a refusal the actions report by code. The bench checks
 *  the record's shape and nothing else: it does not run the protocol. */
import type { Comparison, IdentifiabilityContrast, IntermediaryStatus, ReadingMode, ReadingRecord } from "../lib/programme";
import { INTERMEDIARY_STATUSES, READING_MODES } from "../lib/programme";

/** The form's own state: strings and a checkbox, turned into a ReadingRecord by toRecord(). */
export interface RecordDraft {
  mode: ReadingMode | "";
  status: IntermediaryStatus | "";
  identKind: "" | "contrast" | "not_identified";
  contrast: string;
  nominal: string;
  covariates: string; // one per ";"
  cmpCovariates: string; // one per ";"
  cmpParameter: string;
  cmpMetric: string;
  cmpThreshold: string;
  cmpLocked: boolean;
}

export const EMPTY_DRAFT: RecordDraft = { mode: "", status: "", identKind: "", contrast: "", nominal: "", covariates: "", cmpCovariates: "", cmpParameter: "", cmpMetric: "", cmpThreshold: "", cmpLocked: false };

const list = (s: string) => s.split(";").map((x) => x.trim()).filter(Boolean);

/** What the draft claims, as the child will carry it. Empty stays empty — no default. */
export function toRecord(d: RecordDraft): ReadingRecord {
  const identifiability: IdentifiabilityContrast | "not_identified" | null =
    d.identKind === "not_identified" ? "not_identified" : d.identKind === "contrast" ? { contrast: d.contrast.trim(), nominal_input_held_fixed: d.nominal.trim(), covariates_held_fixed: list(d.covariates) } : null;
  const cmpAny = d.cmpCovariates.trim() || d.cmpParameter.trim() || d.cmpMetric.trim() || d.cmpThreshold.trim() || d.cmpLocked;
  const comparison: Comparison | null = cmpAny
    ? { published_covariate_set: list(d.cmpCovariates), added_parameter: d.cmpParameter.trim(), locked_metric: d.cmpMetric.trim(), threshold: d.cmpThreshold.trim(), threshold_fixed_before_run: d.cmpLocked }
    : null;
  return { mode: d.mode || null, intermediary_status: d.status || null, identifiability, comparison };
}

const field = "readout border hair bg-ink p-2 text-xs text-ivory";
const label = "readout text-[11px] text-dim";

export function ReadingRecordForm({ draft, onChange }: { draft: RecordDraft; onChange: (d: RecordDraft) => void }) {
  const set = <K extends keyof RecordDraft>(k: K, v: RecordDraft[K]) => onChange({ ...draft, [k]: v });
  return (
    <div className="border hair bg-ink p-3" data-testid="reading-record">
      <p className="readout text-[11px] uppercase tracking-wider text-dim">reading record · an operator claim</p>
      <p className="mt-1 text-xs text-mute">What this reading is, in your words: its mode, the status of the intermediary, how the contrast is identified, and — only for incremental_value — the one comparison you declared before running. The bench checks the record's shape and refuses an incomplete or contradictory one. It does not verify the science and computes no fit. A question pin (a stub among the parents) needs none of this.</p>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className={label}>mode</span>
          <select value={draft.mode} onChange={(e) => set("mode", e.target.value as RecordDraft["mode"])} className={field} data-testid="record-mode" aria-label="reading mode">
            <option value="">—</option>
            {READING_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>intermediary_status</span>
          <select value={draft.status} onChange={(e) => set("status", e.target.value as RecordDraft["status"])} className={field} data-testid="record-status" aria-label="intermediary status">
            <option value="">—</option>
            {INTERMEDIARY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>identifiability</span>
          <select value={draft.identKind} onChange={(e) => set("identKind", e.target.value as RecordDraft["identKind"])} className={field} data-testid="record-identifiability" aria-label="identifiability">
            <option value="">—</option>
            <option value="contrast">a contrast (below)</option>
            <option value="not_identified">not_identified</option>
          </select>
        </label>
      </div>
      {draft.identKind === "contrast" && (
        <div className="mt-2 flex flex-wrap items-end gap-3" data-testid="record-contrast-block">
          <label className="flex min-w-[18rem] flex-col gap-1">
            <span className={label}>contrast (one sentence)</span>
            <input value={draft.contrast} onChange={(e) => set("contrast", e.target.value)} className={field} data-testid="record-contrast" aria-label="contrast" />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>nominal input held fixed</span>
            <input value={draft.nominal} onChange={(e) => set("nominal", e.target.value)} className={field} data-testid="record-nominal" aria-label="nominal input held fixed" />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>published covariates held fixed (one per “;”)</span>
            <input value={draft.covariates} onChange={(e) => set("covariates", e.target.value)} className={field} data-testid="record-covariates" aria-label="covariates held fixed" />
          </label>
        </div>
      )}
      <div className="mt-3 border-t hair pt-2" data-testid="record-comparison-block">
        <p className={label}>comparison · only when intermediary_status is incremental_value; empty otherwise</p>
        <div className="mt-1 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className={label}>published covariate set (one per “;”)</span>
            <input value={draft.cmpCovariates} onChange={(e) => set("cmpCovariates", e.target.value)} className={field} data-testid="record-cmp-covariates" aria-label="published covariate set" />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>added parameter (one)</span>
            <input value={draft.cmpParameter} onChange={(e) => set("cmpParameter", e.target.value)} className={field} data-testid="record-cmp-parameter" aria-label="added parameter" />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>locked metric</span>
            <input value={draft.cmpMetric} onChange={(e) => set("cmpMetric", e.target.value)} className={field} data-testid="record-cmp-metric" aria-label="locked metric" />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>threshold (yours)</span>
            <input value={draft.cmpThreshold} onChange={(e) => set("cmpThreshold", e.target.value)} className={field} data-testid="record-cmp-threshold" aria-label="threshold" />
          </label>
          <label className="flex items-center gap-2 text-xs text-mute">
            <input type="checkbox" checked={draft.cmpLocked} onChange={(e) => set("cmpLocked", e.target.checked)} data-testid="record-cmp-locked" />
            threshold fixed before the run
          </label>
        </div>
      </div>
    </div>
  );
}
