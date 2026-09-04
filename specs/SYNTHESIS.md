# SYNTHESIS.md — jobs write children with explicit parents

A **synthesis job** reads pins in two or more fields and writes one **child
pin**. The child names its parents, the path or clique of live bridges that
joins their fields, the method, and the grants it relies on. A child never
overwrites a parent and never writes into a parent's field across a sector.

## Jobs

| kind | what the child says |
|---|---|
| `overlap` | where two fields' locked arrays measure the same thing under different names — a mapping, with the bridge's ledger ratings carried along |
| `match` | which items in one field's array correspond to which in another's, one to one, with the unmatched remainder listed |
| `couple` | a joint reading of two fields' results along a bridge, at the reliability the bridge's ledger permits — never a composite the scale rule forbids |
| `question` | a question one field puts to another along a declared path — a pin that asks, and claims nothing |

## Child pin schema

```json
{
  "id": "child-q-001",
  "kind": "question",
  "parents": [
    { "pin": "pin:autistikon:0007", "field": "autistikon-programme-zero", "work": "work-pz-ledger-structure" },
    { "pin": "pin:toy-acoustics:0003", "field": "toy-acoustics" }
  ],
  "path": ["bridge-mechanics-phenomenology", "bridge-materials-mechanics", "bridge-materials-acoustics"],
  "method": "question: …",
  "grants": [{ "grantor": "…", "scope": "autistikon-programme-zero", "ref": "programme-zero.license_grant" }],
  "sector": "synthesis",
  "subject": "cohort-level literature",
  "writes_to": null
}
```

Exactly one of `path[]` (ordered bridges, consecutive ones sharing a field,
running from the first parent's field to the last) or `clique[]` (a set of
live bridges covering every pair of parent fields) is required.

## Refusals — hard errors, not footnotes

| code | when |
|---|---|
| `NO_BRIDGE` | the declared path or clique does not join every parent field through **live** bridges; a `draft` or `retired` bridge counts as missing |
| `LICENSE_MISSING` | a parent's field has `license_required` and no grant in `grants[]` covers it (the Programme Zero corpus is at arm's length: a `license_grant` must exist before its pins parent a RexMetrix child) |
| `INDIVIDUAL_SCORE_FORBIDDEN` | the job's `subject` is an individual, or its method asks for a person-level score, index or assessment, and any parent field's anti-overreach pack forbids it — the Programme Zero corpus always does. There is no derived index, scoring algorithm or assessment instrument in RexMetrix, and a helper that would request one refuses |
| `CROSS_SECTOR_WRITE` | `writes_to` names a field whose `sector` differs from the child's declared `sector` |
| `FULLTEXT_FORBIDDEN` | a parent names a work flagged `bytes: "present"` under a licence that does not allow full text ([WORKS.md](WORKS.md)) |
| `STUB_NO_FULLTEXT` | an `overlap`, `match` or `couple` job names a work with no body (a stub, `oa: false`, or no bytes); a `question` may cite it |
| `BAD_KIND` | `kind` is not one of the four jobs |
| `UNKNOWN_FIELD` | a parent names a field not in the catalogue |

A refused job writes nothing. Refusals are the product's law: the same checks
run in the web instrument (`web/src/lib/programme.ts`) and are tested.
