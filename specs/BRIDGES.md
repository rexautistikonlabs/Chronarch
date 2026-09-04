# BRIDGES.md — bridges are first-class edges

A **bridge** joins exactly two fields whose vocabularies do not share units.
It is an object with a life of its own — a statement, a ledger, a register, a
status — not a line drawn during a job.

## Bridge object

```json
{
  "id": "bridge-mechanics-phenomenology",
  "left": "tissue-mechanics",
  "right": "autistikon-programme-zero",
  "junction": "which mechanical quantities may stand beside which descriptive terms, and under what reliability",
  "status": "live",
  "ledger": [{ "id": "assumption-1", "statement": "…", "rating": "conjectural" }],
  "register": [{ "id": "falsifier-1", "falsifier": "…", "consequence": "…", "anti_rescue": true }]
}
```

| Key | Meaning |
|---|---|
| `left`, `right` | the two field ids; a bridge has exactly two ends |
| `junction` | the **bridge statement**: in what sense a quantity on one side may stand beside a term on the other, given that they do not share units |
| `status` | `draft` → `live` → `retired`; only a **live** bridge carries a synthesis |
| `ledger[]` | the **assumption ledger**: every assumption the junction rests on, each with a rating — `conjectural`, `supported`, `contested`, `established`. **None defaults to `established`.** |
| `register[]` | the **falsification register**: what would falsify the junction, what it costs when it does (a consequence the programme must carry out), and `anti_rescue: true` — the bridge may not be saved after the fact by redefining its terms |

## The NO_BRIDGE rule

A child pin that names parents in two fields must declare how they connect:
either a **path** — an ordered list of live bridges where each consecutive pair
shares a field — or a **clique** — a set of live bridges covering every pair of
parent fields. Any missing edge, any `draft` or `retired` bridge on the way, or
a path that does not actually run from the first parent's field to the last,
is refused as **`NO_BRIDGE`**. There is no "all fields couple." A programme with
two fields and one bridge is valid; a programme with N fields is a graph, not a
blender.

## Amendments

Changing a bridge's junction, adding or re-rating a ledger entry, or adding a
register entry is an **amendment**: the previous version is kept beside the
new one with a date, and a job that ran against the old version says so. A
bridge that fails a register entry is `retired`, its consequence is recorded,
and it cannot be revived by renaming — a new bridge must be declared and pass
its own ledger.

See [SYNTHESIS.md](SYNTHESIS.md) for how children carry a path or a clique.
