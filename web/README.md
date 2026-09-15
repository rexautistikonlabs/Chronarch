# web/ — RexMetrix landing + Chronarch (programme well, workbench)

**RexMetrix Technologies, LLC.** A static Vite app: the landing at `/` and
**Chronarch** — a local workbench for declared fields, pinned sources, and
syntheses that name their parents (`/chronarch`, `/chronarch/tech`).
**Continuum** is a separate, literature-informed biotensegrity and afferent-flow
teaching simulation at https://continuum.rexmetrix.com — model outputs, not
measurements of a person; not a programme ledger; not built or served here.
Laterion is not shipping here.

> Not a diagnostic. Not a medical device. Not Foundation-endorsed. Rex
> Autistikōn Labs (https://rexautistikonlabs.org) is a separate 501(c)(3);
> Labs does not sell these products and RexMetrix does not speak for Labs.
> This site spawns no process, opens no socket, reads no filesystem, calls no
> model. The Autistikon programme is the example corpus, an optional pack —
> not the product, never loaded until its chip is pressed, and not what a cold
> workbench opens on: that is a blank programme (`specs/NEW_PROGRAMME.md`).

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
| `/` | anyone | the **RexMetrix landing**: a shop window — the law in a compact strip (RexMetrix Technologies, LLC; not a diagnostic; not a medical device; the Labs split; the data sentence; credit, not endorsement) beside the company's catalogue — Chronarch (this product, running), Continuum (running at continuum.rexmetrix.com — a door that leaves this origin; not mounted here; source on GitHub) and Laterion (not shipping; not a diagnostic, not a person-score, not an assessment of anyone; a covered bench, no door); the landing honesty line; an indoor instrument lab (one canvas: an operator who walks to the product stations) when motion is allowed, an HTML station list otherwise |
| `/chronarch` | a visitor | **Chronarch** — the programme well: honesty sentence, four programme chips (*Untitled (blank)* selected on a cold load, *Classics* and *Toy programme* as optional starter packs, *Programme Zero* — the example corpus, an optional pack that loads only when pressed), four benches (**Fields, Bridges, Programmes, Synthesis**), readouts in programme words (fields, bridges, assumptions rated, falsifiers registered, items locked, stops on). No protocol names, no hex, no credits. |
| `/chronarch/about` | a visitor | what Chronarch is, the optional starter packs, Programme Zero as one appendix paragraph (example corpus, not required), what Chronarch will not ship; `/about` and `/consortium` redirect here |
| `/chronarch/tech` | a technician | **one workbench**, one column: filters (All \| Autistikon — loads the example pack on press \| Classics), a field–bridge graph of the loaded programme's live bridges only (a blank programme draws none), the project (name, Add field — the group's own fields, Declare bridge as a session amendment, Clear extra bridges), the works table with a Programme column and the upload model, Converge / Compare / Analyze that disable with a reason, the AnalysisNote, the notes library, Copy Markdown / Download .md, Download pack (the whole project as one .md) and Download project.json / import (saved in this browser only under `rexmetrix.project.v1`; no server); then the refuse glossary and a closed "substrate instrument" details block (programmes, fixtures, paste JSON, hashes; the research substrate under Chronarch, not offered as a feature). `/workbench`, `/tech`, `/lab`, `/council`, `/timechain`, `/hearth`, `/farm`, `/gym`, `/operator` redirect here. |

## Fixtures

- `fixtures/programme-blank.json` — **the default**: "Untitled programme", no
  fields, no bridges, no works, nothing locked, no clock. A group declares its
  own fields and bridges on the project (`specs/NEW_PROGRAMME.md`).
- `fixtures/programme-classics.json` — an optional starter pack: six fields
  and three bridges over public-domain / US-government excerpts;
  `fixtures/synthesis-child-classics.json` is its example child (Darwin and
  Mendel across the one shipped bridge, no grant needed).
- `fixtures/programme-toy.json` — an **invented** three-field demo with a path
  of two bridges; it stands for nothing real.
- `fixtures/programme-zero.json`, `fixtures/works-example-corpus.json`,
  `fixtures/synthesis-child.json` — **the optional example pack**: Programme
  Zero (Rex Autistikon / Kim 2026), two-field, one-bridge, **metadata only**
  — bridge id and junction, ledger and register counts, a locked-array size,
  a stop rule, an illustrative `license_grant`; its two structure-only
  stand-in works; its `question` child. Loaded only by
  `src/lib/examplePack.ts` (dynamic imports) when the chip labelled "example
  corpus — not the product" is pressed; no module on the default path imports
  them, and `npm run test:core` proves the suite passes without them.
- `fixtures/session-*.json` — the substrate's own operator-path records, for the
  technician room.

A cold load reads `field-count` 0 and `bridge-count` 0; Toy moves them to 3
and 2; Programme Zero, once loaded, to 2 and 1 (tested).

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
