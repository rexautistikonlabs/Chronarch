# PROJECT.md — the Project

A **Project** is the unit a professional takes home and an amateur understands:
the works used, the live bridges the notes ran over (shipped, plus any session
amendments), the AnalysisNotes, and one pack they can download.

## Shape

```json
{
  "schema": "rexmetrix.project/1",
  "id": "project-1",
  "name": "Untitled project",
  "programme_ids": ["programme-zero", "programme-classics"],
  "works": ["Work[] — works a note cites (by id) and this session's uploads"],
  "extra_bridges": ["Bridge[] — session-only amendments, origin: operator"],
  "notes": [{ "seq": 1, "result": "BenchOk", "note": "AnalysisNote" }],
  "created_at": "ISO string in a fixture only; in the app a monotonic counter (tick:n)"
}
```

`created_at` is an ISO string in `web/fixtures/project-example.json`. In the app
it is `tick:<n>` from a counter: the well bans clock reads and the workbench
needs no wall clock either. (Date.now would be allowed on `/tech` HTML only; it
is not used.)

## Session project

`/tech` holds one project in memory. Its name defaults to "Untitled project"
and is editable. Every accepted upload, every declared bridge and every
successful note appends to it. Switching the works filter (All | Autistikon |
Classics) does not touch the project. Nothing persists across a reload, and
the page says so. (If a later turn adds localStorage it is the project JSON
only, under `rexmetrix.project.v1`, and it is never sent anywhere.)

## Session bridge amendment

**Declare bridge** takes a left field, a right field and the checkbox
"amendment, not evidence." It adds a live bridge with `origin: "operator"`,
an empty ledger and an empty register to `extra_bridges` **on the project
only**. It never writes `programme-classics.json` or any other programme
file; the shipped catalogue is not mutated (the bench reads a new Map that
overlays the amendments). Refused: the checkbox unticked, the same field twice,
an unknown field, a pair a shipped bridge already joins, a duplicate.

After natural-history — optics is declared, Darwin + Newton **Analyze**
enables. The note it writes carries `is_not: "bridge was operator-declared"`
and `assumptions_used: []` — an amendment is not evidence and has no rated
entries to cite. **Clear extra bridges** removes every amendment; the action
disables again.

The graph draws an operator bridge dotted, in a different colour, with
`data-origin="operator"`; shipped bridges are `data-origin="shipped"`.

## Notes library

The project's notes in time order (title, kind, percent). Clicking one
re-opens its eight-section card. Memory only.

## Pack export

**Download pack** builds one Markdown file locally: the project name; a works
table (id, title, license, source_url, attribution); the extra bridges, each
marked operator-declared; every note in full (the eight sections, attributions
and source URLs, the Jaccard line, the is_not list); and the closing
negations — not a fitted model; not peer review; not Foundation-endorsed; not
a public chain. No zip, no network, no model.

## What a Project is not

- not a programme file: amendments never merge into a shipped catalogue
- not evidence: a declared bridge is an operator's amendment and the note says so
- not persistent: memory only until downloaded
- not a score of anything or anyone
