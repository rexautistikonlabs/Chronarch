# web/ — RexMetrix landing + Chronarch (programme well, technician room)

A static Vite app: the visitor's **programme well** for RexMetrix, and the
**technician room** for whoever runs the substrate. It draws static JSON
fixtures — two programmes and one synthesis child; two technical session
records — and holds still.

> RexMetrix is research software for hypothesis-led programmes: fields, the
> bridges a group declares between them, programmes as subgraphs, and syntheses
> that name their parents. It is not a diagnostic, not Foundation-endorsed, and
> not a public chain. This site spawns no node and reads no filesystem.

## Dev

```
cd web
npm i
npm run dev          # http://localhost:5173
```

```
npm run build        # typecheck + vite build → dist/
npm test             # vitest (jsdom): product law + honesty, programme refusals, chips 2→3 fields, benches, ⌘K, technician console, reduced motion, animation law, render policy, resilience
npm run check:loops  # the doctrine grep as a script
```

## The well

The page is one fixed, full-viewport canvas with a phosphor HUD. A visitor
sees the **catalogue as a graph**: every field a disc on a ring, every bridge a
line between exactly two of them (the loaded programme's are bright), the
synthesis child a prism above the centre with lines down to its parents along
its declared path. Hover a bench for its edge and label; click for a one-shot
iris and a plain-language card. The camera is pointer-live (parallax on hover,
orbit on drag, zoom on wheel) and clock-dead: `frameloop="demand"` at rest,
awake only while something holds the render policy and for 200 ms after. See
[docs/VISUAL.md](docs/VISUAL.md).

## Two rooms

| Route | Who | What |
|---|---|---|
| `/` | anyone | the **RexMetrix landing**: the company's catalogue — Chronarch (this lab, running), Continuum and Face mapping (one-sentence placeholders); the landing honesty line; flat HTML, no canvas |
| `/chronarch` | a visitor | **Chronarch** — the programme well: honesty sentence, two programme chips (*Programme Zero*, *Toy programme*), four benches (**Fields, Bridges, Programmes, Synthesis**), readouts in programme words (fields, bridges, assumptions rated, falsifiers registered, items locked, stops on). No protocol names, no hex, no credits. |
| `/chronarch/about` | a visitor | what Chronarch is, Programme Zero as the example programme, what Chronarch will not ship; `/about` and `/consortium` redirect here |
| `/chronarch/tech` | a technician | **one workbench**, one column: filters (All \| Autistikon \| Classics), a field–bridge graph of live bridges only, the project (name, Declare bridge as a session amendment, Clear extra bridges), the works table with a Programme column and the upload model, Converge / Compare / Analyze that disable with a reason, the AnalysisNote, the notes library, Copy Markdown / Download .md, Download pack (the whole project as one .md) and Download project.json / import (saved in this browser only under `rexmetrix.project.v1`; no server); then the refuse glossary and a closed "substrate instrument" details block (programmes, fixtures, paste JSON, hashes; the research substrate under Chronarch, not offered as a feature). `/tech`, `/lab`, `/council`, `/timechain`, `/hearth`, `/farm`, `/gym`, `/operator` redirect here. |

## Fixtures

- `fixtures/programme-zero.json` — Programme Zero (Rex Autistikon / Kim 2026): a
  two-field, one-bridge programme, **metadata only** — bridge id and junction,
  ledger and register counts, a locked-array size, a stop rule, an illustrative
  `license_grant`. No chapters, no measured array, no scores.
- `fixtures/programme-toy.json` — an **invented** three-field demo with a path
  of two bridges; it stands for nothing real.
- `fixtures/synthesis-child.json` — a `question` child with parents in both
  programmes and a declared three-bridge path.
- `fixtures/session-*.json` — the substrate's own operator-path records, for the
  technician room.

Loading Programme Zero vs the toy programme moves `field-count` 2 → 3 and
`bridge-count` 1 → 2 in the readouts (tested).

## Works

Only legal works enter: `fixtures/works-preload.json` ships a few starter
works (metadata + licence on every row, `bytes` as a flag, never bytes);
`/tech` has the upload model (title, licence, rights declaration) that refuses
`FULLTEXT_FORBIDDEN` / `LICENSE_MISSING` / `RIGHTS_UNDECLARED` and keeps an
accepted record in memory only; a metadata stub is `STUB_NO_FULLTEXT` — a
question may cite it, overlap/match/couple refuse it. See `specs/WORKS.md`.

## Product law in code

`src/lib/programme.ts` implements the refusals from `specs/SYNTHESIS.md` as
hard errors — `NO_BRIDGE`, `LICENSE_MISSING`, `INDIVIDUAL_SCORE_FORBIDDEN`,
`CROSS_SECTOR_WRITE`, `BAD_KIND`, `UNKNOWN_FIELD` — and
`requestIndividualScore()` only ever refuses. `src/lib/banned.ts` carries the
visitor ban list from `specs/LEGAL.md`; `tests/rexmetrix-honesty.test.tsx`
runs it over the rendered floor and about page and the visitor sources.

## Stack

Vite · React 19 · react-three-fiber + drei · GSAP (one-shot only) ·
@react-three/postprocessing (event-only bloom/grain) · cmdk · React Aria
Components + Tailwind v4 · IBM Plex (bundled) · Lucide · vitest + Testing
Library. No editor; JSON is shown as text.
