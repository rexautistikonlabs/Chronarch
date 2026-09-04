# FIELDS.md — the array of fields

A **field** is one literature a tenant works in: a vocabulary with its own
units and its own limits. The catalogue of fields is **unbounded**; a tenant
adds fields as its work grows. Nothing couples two fields by default — see
[BRIDGES.md](BRIDGES.md).

## Field object

```json
{
  "id": "tissue-mechanics",
  "label": "Tissue mechanics literature",
  "units": "Pa, strain, Hz",
  "sector": "biomechanics",
  "anti_overreach": [
    "no inference from a tissue measurement to a person's traits",
    "no clinical claim from bench mechanics"
  ],
  "license_required": false
}
```

| Key | Meaning |
|---|---|
| `id` | stable, kebab-case; a pin's parent refers to a field by id |
| `label` | what a person calls it |
| `units` | the units the field's measurements come in; "descriptive" is a valid answer and matters for bridges |
| `sector` | the sector the field belongs to; a child pin may not write across sectors ([SYNTHESIS.md](SYNTHESIS.md), `CROSS_SECTOR_WRITE`) |
| `anti_overreach[]` | the field's **anti-overreach pack**: claims this field's data may never be made to carry; each entry becomes a refusal, not a footnote |
| `license_required` | when true, pins of this field may be parents of a child only under a `license_grant` ([LEGAL.md](LEGAL.md), `LICENSE_MISSING`) |

## Rules

- **Membership is not silent.** Adding or removing a field from a programme's
  locked array is an *amendment* ([PROGRAMMES.md](PROGRAMMES.md)).
- **No implicit coupling.** Two fields in the same catalogue are unrelated until
  a bridge between them is declared and live.
- **Anti-overreach is per field and per sector.** A field's pack is checked on
  every job that reads it. The Programme Zero corpus field carries, among
  others: no individual-level score on its eight-interface construct; no
  clinical, diagnostic or therapeutic claim; it is not a fascia framework;
  listening material is not an intervention; predictive-coding language is
  inert scaffolding, not an engine. Those entries are that field's, not a
  template for every field.

## Fixtures

Two fixture fields ship with the web instrument (`web/fixtures/`):

- `autistikon-programme-zero` — the Programme Zero corpus field (Rex
  Autistikon / Kim 2026), sector `sensorimotor-phenomenology`, units
  `descriptive`, `license_required: true`. Metadata only: no chapters, no
  measured array, no scores.
- `toy-materials` (with `toy-acoustics`) — an **invented demo** field, sector
  `materials`, units `MPa`. It is not a paper and stands for nothing real; it
  exists so the second fixture programme has a graph of its own.

Both fixtures also share the `tissue-mechanics` field so that a declared path
between them can exist at all.
