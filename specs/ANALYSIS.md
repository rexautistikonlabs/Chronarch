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
  "is_not": ["not a fitted model", "not peer review", "not a clinical claim", "not an individual score", "…"],
  "appendix": { "jaccard": 0.1578, "snippets": [{ "id": "…", "text": "…" }], "child_id": "child-…" }
}
```

`role` is `ledger`, `register`, `note`, `body` or `stub` (a stub has no body).

## Findings law

Every finding sentence **cites** a work id or a metric id (`metric:jaccard`).
No causal language anywhere.

| kind | findings |
|---|---|
| `overlap` | shared-token count with only-left / only-right counts and the Jaccard percent; whether the works sit in one field (no bridge needed) or across declared bridges; whether a licence grant was present or not needed |
| `match` | the Jaccard integer percent plus only-left / only-right counts, captioned "lexical overlap only" |
| `couple` | as `match`, plus "no numeric coupling was fitted" |
| `question` (a stub among the parents) | **no findings**; the question sentence only; `would_falsify` is "a body appearing on the stub would be required before match/couple." |

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
([SYNTHESIS.md](SYNTHESIS.md), [WORKS.md](WORKS.md)).

## Copy law on notes

The question, findings, would-falsify and is-not texts may not carry: a public
chain as product, a Foundation endorsement, diagnostic or treatment language,
an individual score (except its negation in `is_not`), "the framework is
confirmed", or fascia therapy. Tested (`web/tests/analysisNote.test.ts`).

## Rendering

The bench renders the note as eight sections: Question · Objects · What was
compared · Findings · Assumptions used · What would falsify this reading ·
What this is not · Appendix (the shared-token bar and the child JSON, closed).
