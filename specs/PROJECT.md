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

`created_at` is an ISO string in `web/fixtures/project-example.json`; an
imported project keeps whatever string it carried. In the app
it is `tick:<n>` from a counter: the well bans clock reads and the workbench
needs no wall clock either. (Date.now would be allowed on `/tech` HTML only; it
is not used.)

## Session project

`/tech` holds one project. Its name defaults to "Untitled project" and is
editable. Every accepted upload, every declared bridge and every successful
note appends to it. Switching the works filter (All | Autistikon | Classics)
does not touch the project.

## Persistence

The project survives a reload **on the same browser** and can be handed
around as JSON. Memory-only is no longer the story.

- **Key:** `rexmetrix.project.v1` in `localStorage`. The value is the
  canonical JSON of the Project object above (sorted keys). Nothing else is
  stored. No cookies, no backend, no analytics, no accounts; the value is
  never sent anywhere.
- **Write:** after any successful note, upload, rename, declared bridge or
  clear of extra bridges (every change to the project object is written back).
  A browser that refuses storage (quota, private mode) leaves the project in
  memory and the page says so.
- **Read:** on `/tech` mount, the key is parsed through the same fail-closed
  guard an import gets (below). Corrupt JSON, a missing name or a wrong shape
  is ignored and the project starts Untitled — never a crash.
- **Clear project:** wipes memory and the key, after a confirm checkbox. Clear
  extra bridges (above) is narrower and keeps the notes.
- The page carries one line under the project name: "Saved in this browser
  only."

## Export project.json

**Download project.json** writes the canonical JSON of the Project — sorted
keys, no functions — next to Download pack. It is the file a colleague
imports; the pack is the file a reader reads.

## Import

A file input (`application/json`). The guard is fail-closed:

- bad JSON or a missing `name` → `IMPORT_INVALID`; the project is unchanged;
- `extra_bridges` entries without `origin: "operator"` (or malformed) are
  **stripped** and counted; they are never applied as shipped bridges;
- `works` that are preload ids are references to the shipped rows; any other
  work enters only as a session upload that `acceptUpload` would accept
  (licence required; full text only under an allowing licence with rights
  declared), otherwise it is dropped and counted ("2 works skipped");
- `notes` need an ok result with a child id and parents and a note body with
  question, findings and is_not; others are dropped and counted.

`web/fixtures/project-example.json` is an importable example: a name, two
preload works by id, one operator-declared natural-history — optics bridge,
no notes. Importing it restores the name and the bridge; Darwin + Newton
Analyze enables on the imported project.

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
- not a server record: saved in this browser only, portable as project.json
- not a score of anything or anyone
