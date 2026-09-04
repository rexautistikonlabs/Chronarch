# PROGRAMMES.md — a programme is a subgraph

A **programme** is a tenant's declared piece of the catalogue: which fields it
uses, which bridges it uses, what it has locked itself into measuring, what it
assumes, what would falsify it, and when it stops.

## Programme object

```json
{
  "id": "programme-zero",
  "label": "Programme Zero — Rex Autistikon (Kim 2026), the first filled template",
  "fields_used": ["autistikon-programme-zero", "tissue-mechanics"],
  "bridges_used": ["bridge-mechanics-phenomenology"],
  "array_lock": { "items": ["A1", "A2", "A3", "A4", "A5"], "locked_at": "2026-01-15" },
  "ledger_count": 6,
  "register_count": 4,
  "stop": { "date": "2027-06-30", "rule": "no register entry survives two pre-registered replications → abandon; the clock runs regardless of results" },
  "deviations": [{ "date": "…", "what": "…", "results_known_at_the_time": false }],
  "amendments": [{ "date": "…", "old": "…", "new": "…", "reason": "…" }]
}
```

## The wizard

Creating a programme walks six fields, in this order, and refuses to finish
without each:

1. **fields_used** — at least two fields from the catalogue (a two-field
   programme is valid).
2. **bridges_used** — live bridges among those fields. A field with no bridge
   to any other field in the programme is flagged; the programme may keep it
   only as an *observed* field, never a parent of a synthesis.
3. **array lock** — the locked array of what is measured. From the lock date,
   adding or removing an item is an **amendment**, never a silent edit.
4. **ledger** — the assumption ledger with ratings; none defaults to
   `established`.
5. **register** — the falsification register, each entry with a costly
   consequence and `anti_rescue: true`.
6. **stop** — an abandonment rule with a **clock**: a date by which the rule is
   applied whatever the results look like.

## Amendments versus silent edits

The programme record is append-only in spirit and in storage: the old claim is
kept beside the new one. An amendment names what changed, why, and when. A
**deviation** (doing something the programme did not pre-register) records
whether results were known at the time — yes or no — and that answer is part
of the record forever.

## The scale rule and anti-overreach

No programme may compute a **composite** its reliability cannot support: a
composite of items whose agreement is unmeasured or below the field's floor is
a hard error, not a caveat. Each field's anti-overreach pack applies to every
job in the programme that reads it. Forbidden computations are implemented as
errors ([SYNTHESIS.md](SYNTHESIS.md)), not as footnotes.

## What is portable from Programme Zero

The **method**: bridge statement, locked array, rated assumption ledger,
falsification register with costs and anti-rescue, stop rule with a clock,
deviations log, amendment register, scale rule, anti-overreach pack, forbidden
computations as errors. **Not** its content: another field does not inherit
eight sensorimotor interfaces, a corpus's measured array, or its vocabulary.
