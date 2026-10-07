/** Reading records for engine tests: complete, so a refusal in a test is the one the test asked for. */
import type { Comparison, ReadingRecord } from "../src/lib/programme";

export const CALIBRATION: ReadingRecord = {
  mode: "calibration",
  intermediary_status: "recovered_known",
  identifiability: { contrast: "the two excerpts are read with the author's own terms held as the nominal input.", nominal_input_held_fixed: "the author's vocabulary", covariates_held_fixed: ["publication year", "language"] },
  comparison: null,
};

export const COMPARISON: Comparison = { published_covariate_set: ["publication year", "language"], added_parameter: "shared-term count", locked_metric: "jaccard", threshold: "0.10", threshold_fixed_before_run: true };

export const INCREMENTAL: ReadingRecord = {
  mode: "incremental",
  intermediary_status: "incremental_value",
  identifiability: { contrast: "the added parameter is read against the published covariate set.", nominal_input_held_fixed: "the published covariates", covariates_held_fixed: ["publication year"] },
  comparison: COMPARISON,
};
