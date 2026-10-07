/** Filling the reading record on the workbench, the way an operator would:
 *  nothing is filled by default, so a test that wants Converge or Compare to
 *  run must say what the reading is. The bench checks the shape only. */
import { fireEvent, screen } from "@testing-library/react";

export interface RecordOpts {
  mode?: "calibration" | "incremental" | "";
  status?: string;
  identifiability?: "contrast" | "not_identified" | "";
  contrast?: string;
  nominal?: string;
  covariates?: string;
  comparison?: { covariates?: string; parameter?: string; metric?: string; threshold?: string; locked?: boolean } | null;
}

const change = (id: string, value: string) => fireEvent.change(screen.getByTestId(id), { target: { value } });

/** A complete calibration record of a recovered known answer, unless overridden. */
export function recordReading(opts: RecordOpts = {}): void {
  change("record-mode", opts.mode ?? "calibration");
  change("record-status", opts.status ?? "recovered_known");
  const ident = opts.identifiability ?? "contrast";
  change("record-identifiability", ident);
  if (ident === "contrast") {
    change("record-contrast", opts.contrast ?? "the two excerpts are read with the author's own terms held as the nominal input.");
    change("record-nominal", opts.nominal ?? "the author's vocabulary");
    change("record-covariates", opts.covariates ?? "publication year; language");
  }
  if (opts.comparison) {
    const c = opts.comparison;
    if (c.covariates !== undefined) change("record-cmp-covariates", c.covariates);
    if (c.parameter !== undefined) change("record-cmp-parameter", c.parameter);
    if (c.metric !== undefined) change("record-cmp-metric", c.metric);
    if (c.threshold !== undefined) change("record-cmp-threshold", c.threshold);
    if (c.locked) fireEvent.click(screen.getByTestId("record-cmp-locked"));
  }
}

/** A complete incremental_value record with a locked comparison. */
export function recordIncremental(locked = true): void {
  recordReading({ mode: "incremental", status: "incremental_value", comparison: { covariates: "publication year; language", parameter: "shared-term count", metric: "jaccard", threshold: "0.10", locked } });
}
