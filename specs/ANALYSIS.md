# ANALYSIS.md — the AnalysisNote

After a successful **Converge / Compare / Analyze**, the default result is an
**AnalysisNote**: a scientific note built in code from the works, the metrics
already computed and the child pin the synthesis law accepted. It is not raw
JSON and not an essay; no model writes it, nothing is fetched.

## Shape

```json
{
  "job": "converge", "kind": "overlap", "ok": true,
  "question": "Which identifiers and terms do “…” and “…” share within one field?",
  "objects": [{ "work_id": "…", "title": "…", "field": "…", "license": "…", "role": "ledger" }],
  "compared": { "tokens": { "…": "PairMetrics" }, "path": [], "grants": ["autistikon-programme-zero"] },
  "findings": [{ "text": "…", "cites": ["work-…", "metric:jaccard"] }],
  "assumptions_used": [{ "id": "assumption-1", "text": "…", "rating": "conjectural" }],
  "would_falsify": "…",
  "is_not": ["not a fitted model", "not peer review", "not a clinical claim", "not an individual score", "not a nested model comparison", "not a measurement of a person", "not evidence the architecture generalises", "…"],
  "appendix": { "jaccard": 0.1578, "snippets": [{ "id": "…", "text": "…" }], "child_id": "child-…" },
  "mode": "calibration",
  "intermediary_status": "recovered_known",
  "identifiability": { "contrast": "…", "nominal_input_held_fixed": "…", "covariates_held_fixed": ["…"] },
  "comparison": null
}
```

`role` is `ledger`, `register`, `note`, `body` or `stub` (a stub has no body).

## The reading record — a ledger of an operator claim

The last four fields are the **reading record**. They are a ledger of what the
operator claims to have done around this reading; the bench does **not** run
the protocol they describe. It checks their shape, refuses an incomplete or
contradictory record, and copies the record onto the note unchanged. It does
not verify that the science is true, does not fit anything, and computes no
fit statistic. The workbench is a ledger of readings, not a test.

| field | values | law |
|---|---|---|
| `mode` | `"calibration"` \| `"incremental"` | required on `overlap`, `match` and `couple`; absent or `null` on `question` |
| `intermediary_status` | `recovered_known` · `candidate_confound` · `not_identified` · `untested_prediction` · `incremental_value` · `dropped` | required on the same kinds; a `calibration` reading cannot carry `incremental_value` |
| `identifiability` | `{ "contrast", "nominal_input_held_fixed", "covariates_held_fixed": [] }` or `"not_identified"` | required on the same kinds; `"not_identified"` blocks any comparison |
| `comparison` | `null`, or `{ "published_covariate_set": [non-empty], "added_parameter": "one string", "locked_metric": "…", "threshold": string \| number, "threshold_fixed_before_run": true }` | `null` unless `intermediary_status` is `incremental_value`; then every key is required, and `threshold_fixed_before_run: false` is a refusal |

That status vocabulary is exact and appears nowhere else. The bridge ledger's
assumption ratings (`conjectural`, `supported`, `contested`, `established`)
stay on the bridge ([BRIDGES.md](BRIDGES.md)); neither list maps onto the
other, and a bridge's `status: live` sets, implies or defaults none of these.
A **question pin stays legal with none of the four**, and nothing invents a
default to fill one in: the UI form starts empty and an empty field stays
`null`.

## Findings law

Every finding sentence **cites** a work id or a metric id (`metric:jaccard`).
No causal language anywhere.

| kind | findings |
|---|---|
| `overlap` | shared-token count with only-left / only-right counts and the Jaccard percent; whether the works sit in one field (no bridge needed) or across declared bridges; whether a licence grant was present or not needed |
| `match` | the Jaccard integer percent plus only-left / only-right counts, captioned "lexical overlap only" |
| `couple` | **never written**: a couple whose only number is Jaccard is refused `COUPLE_IS_LEXICAL`, record or no record — the bench must be able to say "no numeric coupling was fitted", and it can only say that by refusing; Compare (`match`) is the lexical reading |
| `question` (a stub among the parents) | **no findings**; the question sentence only; `would_falsify` is "a body appearing on the stub would be required before match/couple." |

`overlap` and `match` may succeed with the record filled; their findings stay
captioned lexical overlap only. If and only if `intermediary_status` is
`incremental_value`, the findings carry **one** more sentence, saying that the
comparison block (its covariate set, added parameter, locked metric and
threshold, named) *is an operator record, not a bench result*, and that no fit
statistic was computed. No finding reports a fit, a likelihood, a nested-model
comparison or an incremental predictive value: none exists here.

If the bodies cannot support a section, the section says so: no metric is
reported without two bodies; `assumptions_used` reads "none declared on these
pins" unless labels already exist.

## Assumptions

Only labels already present in programme metadata may be copied, and only when
both parents are the Programme Zero ledger and register stand-ins (ids
`assumption-n` with their fixture ratings, `falsifier-n` with their fixture
consequences). No rating is invented; no new scientific claim is added. Any
other pair carries `assumptions_used: []`.

## Refusals

A refused job has no note body: the refuse code is shown as before
([SYNTHESIS.md](SYNTHESIS.md), [WORKS.md](WORKS.md)). The reading record adds
these hard errors, checked in `validateChild` after the bridge, licence and
sector law, in this order:

| code | when |
|---|---|
| `MODE_REQUIRED` | an `overlap`, `match` or `couple` reading with no `mode` |
| `STATUS_REQUIRED` | the same kinds with no `intermediary_status` |
| `CALIBRATION_CANNOT_INCREMENT` | `mode: calibration` with `intermediary_status: incremental_value` |
| `IDENTIFIABILITY_REQUIRED` | the same kinds with no `identifiability`, or a contrast record missing `contrast`, `nominal_input_held_fixed` or `covariates_held_fixed[]` |
| `COMPARISON_BLOCKED` | `identifiability: "not_identified"` with any `comparison` present |
| `COMPARISON_REQUIRED` | `intermediary_status: incremental_value` without a complete `comparison` (an empty covariate set, a missing parameter, metric or threshold) |
| `COMPARISON_FORBIDDEN` | any other status with a `comparison` present |
| `THRESHOLD_NOT_LOCKED` | `incremental_value` with `threshold_fixed_before_run: false` — false is a refusal, not a caption |
| `COUPLE_IS_LEXICAL` | a `couple` whose only number is Jaccard — i.e. every couple on this bench, the four fields filled or not |

None of these says the record is scientifically valid when it passes: the
bench checked a shape.

## Copy law on notes

The question, findings, would-falsify and is-not texts may not carry: a public
chain as product, a Foundation endorsement, diagnostic or treatment language,
an individual score (except its negation in `is_not`), "the framework is
confirmed", or fascia therapy. Nor may they carry a result label — **PASS**,
**HIGH-POTENTIAL PASS**, "new experimentally separable variable", "discovery
opportunity" — or any sentence saying the bench fitted, proved or discovered an
intermediary. The default `is_not` always carries: not a fitted model, not a
nested model comparison, not a measurement of a person, not evidence the
architecture generalises. Tested (`web/tests/example-pack/analysisNote.test.ts`,
`web/tests/reading-record.test.ts`).

## Rendering

The bench renders the note as eight sections: Question · Objects · What was
compared · Findings · Assumptions used · What would falsify this reading ·
What this is not · Appendix (the shared-token bar and the child JSON, closed).
Where a surface renders the four fields — the card's "What was compared", the
Markdown export — it renders the status string and, on refusal, the refuse
code, under the line *operator record, not a bench result.* No surface scores
a note as PASS.
