# PRODUCT.md — Chronarch, a RexMetrix product

## Brand

- **RexMetrix** is the company: a product house, and the landing site at `/`
  for all of its products. Its honesty line: *RexMetrix is a product house.
  Chronarch is research software. Not a public chain. Not Foundation-endorsed.
  Not a diagnostic.*

  **Product map** (name and link only — the codebases are not merged):

  | Product | Where | On the landing |
  |---|---|---|
  | **Chronarch** | this repository, `/chronarch` | RUNNING · the lit lab block · the one door |
  | **Continuum** | `https://continuum.rexmetrix.com` (its own deployment; source at `https://github.com/rexautistikonlabs/scientificlab`) | RUNNING · the shed, lit · a door: the door tween, then this origin is left for its address · never mounted inside this app · "Continuum is a simulation; its numbers are model outputs, not measurements of any person." |
  | **Laterion** | a separate codebase, not in this repository | FORTHCOMING · NOT A DIAGNOSTIC · a windowless block · "Laterion records facial kinematics including partial trials and laterality. It is not a diagnostic, not a person-score, and not an assessment of anyone." · no route, no camera, no image, no landmark code here |

  This repository never claims Laterion is shipping, never claims
  scientificlab is embedded, and never adds scientificlab as a submodule or
  copies face-landmark, action-unit or trial-payload code.

  **The gate.** The landing's first paint is a still panel: *RexMetrix is a
  product house. Chronarch and Continuum are research software. / Not a public
  chain. Not Foundation-endorsed. Not a diagnostic. Not a medical device. /
  Continuum is a simulation; its numbers are model outputs, not measurements
  of any person. / Laterion is not shipping here.* — with two attributions
  (rexautistikonlabs.org; cyberphysics.ai — credit, not endorsement), a
  checkbox and a button. `rexmetrix.gate.v1` remembers acceptance in that
  browser. Then the campus, straight away — no title beat.
- **Chronarch** is this product: the programme well (`/chronarch`), the
  technician's workbench (`/chronarch/tech`), About (`/chronarch/about`). Its
  name is on the title, the workbench heading, the pack footer, the first-run
  panel and the honesty sentence on the app. `/tech` and the retired paths
  redirect to `/chronarch/tech`; `/about` and `/consortium` to
  `/chronarch/about`.
- Chronarch is *one product of* RexMetrix. Neither name stands for the other,
  and no page says the Foundation endorses any product.
- Each product keeps its own engine and its own refusals. Continuum and
  Laterion have no code in this repository.

The sections below describe the product — Chronarch. Where older text says
"RexMetrix" for the product, read Chronarch; the company name stays on the
landing, the pack footer ("a RexMetrix product") and the storage keys.

**Chronarch** is institutional research software for hypothesis-led groups and
institutions. A tenant (a group, a department, an institute) maintains an
**array of fields** — the literatures it works in — declares **bridges**
between chosen pairs of fields, and runs **programmes** that are subgraphs of
that catalogue. Synthesis jobs write **child pins** with explicit parents and a
declared path or clique of bridges.

It is programme infrastructure, delivered as software-as-a-service:

| RexMetrix is | RexMetrix is not |
|---|---|
| a catalogue of fields, each with units, a sector and an anti-overreach pack | a public blockchain, a token, a wallet, or a coin |
| first-class bridges between fields that do not share units | a "digital organism" or a claim about minds |
| programmes: fields used, bridges used, a locked array, a ledger, a register, a stop rule with a clock | a diagnostic, therapeutic or clinical tool, and not endorsed by any Foundation |
| synthesis jobs (overlap, match, couple, question) that produce child pins with parents | an index, a score, or an assessment instrument |
| quota per tenant (jobs, pins, storage) — **quota, not coin** | governance by a council, a vote market, or on-chain anything |

## Tenants and quota

A tenant is an institution or a group. What a tenant can do is bounded by
**quota** — how many programmes, jobs and pins it may hold — set by its plan.
There is no currency, no balance to trade, nothing to mine. (Billing and
multi-tenant authentication are not part of this specification version.)

## Programme Zero

The first filled template is **Programme Zero**: Rex Autistikon / Kim 2026,
*Tissue Mechanics…* — a two-field programme with its method and control
documents. It is the **example programme and first corpus**. It is not the
product and not the only science: RexMetrix carries an unbounded array of
fields, and Programme Zero's specific content (its measured array, its eight
sensorimotor interfaces) is **not** copied into other fields. What is portable
is the *method*: see [PROGRAMMES.md](PROGRAMMES.md).

## Internal code, not product

This repository grew from a research codebase (code name *Chronarch*): an
append-only Timechain of rings, a Council upgrade machine, a Hearth bond, a
space lottery, an agent runtime. That code remains in `packages/` as internal
substrate — it stores pins durably, proves append-only history, and screens
forbidden keys — and its kernel, hashes, admission, Council machine, Hearth and
lottery are frozen. **None of it is the product.** RexMetrix exposes fields,
bridges, programmes and synthesis. It does not expose Council governance, rings
as coins, a token, or a network. Operators may still read hashes and the
operator path in the technician room; a visitor meets programmes.

## One app

RexMetrix is **one application** with two rooms: the programme well (`/`) for a
visitor, and one operator room (`/tech`) for a technician — works, programmes
and fixtures, a paste box, hashes, refuse codes, and a closed "substrate
instrument" details block labelled *internal code name Chronarch — not the
product*. There is no second product beside it: no Council page, no Timechain
page, no protocol museum. Retired paths (`/council`, `/timechain`, `/hearth`,
`/farm`, `/gym`, `/operator`, `/lab`) resolve into `/tech`; `/consortium` into
`/about`. Nothing 404s, and nothing stands as an equal nav item.

## The operator bench

`/tech` is one flat HTML room — no 3D, no well on that route: the works table
with a selection, three actions that each write one child pin through the
synthesis law or refuse (**Converge** = overlap, **Compare** = match,
**Analyze** = question if any parent is only a stub, else couple), the result
as the child's JSON or a refuse code, then the programmes and fixtures, a paste
box for session JSON, the hashes when a session is loaded, and the refuse
glossary. Fewer than two selected works is `NEED_PARENTS`. The bench calls no
model and fetches nothing. The well is the visitor's instrument, not the
operator's wallpaper.

A successful result is an **AnalysisNote** ([ANALYSIS.md](ANALYSIS.md)): a
scientific note built in code — question, objects, what was compared,
findings that each cite a work or a metric, assumptions used, what would
falsify the reading, what it is not, and an appendix. No model writes it.

A successful result is **readable before it is JSON**: a card with the action,
kind and verdict; the two parents with title, field, licence and the first 160
characters of each body; a bar of shared versus unique tokens with the Jaccard
ratio as a whole percent — deterministic token counts, never a finding, and
shown only when both parents have bodies; on a `couple`, the caption "lexical
overlap only — not a fitted model."; on a stub-bearing `question`, the question
sentence and no bar. The child's JSON sits under a closed details. The session
list shows titles, kind and the percent (or none).

## Workbench

`/tech` is a **professional workbench**: one column, no chrome over content.
The honesty banner is a single full-width strip in flow (never fixed over the
column); the title row reads "RexMetrix · Technician · workbench"; the nav is
⌘K, About, Programme well. Below a one-line strip for a first-time user
("Pick two or more works → choose Converge, Compare, or Analyze → read the
note."), the column runs in this order:

1. **Filters** — chips All | Autistikon | Classics. All lists every preload
   and this session's uploads; Autistikon lists the Programme Zero stand-ins;
   Classics lists the six public-domain fields and hides the stand-ins. The
   Autistikon rows are always in the works list under All.
2. **Field–bridge graph** — a static SVG (no 3D): nodes are the fields of the
   loaded catalogues, edges are declared **live** bridges only. Selected works
   light their fields; a field pair the selection needs but no bridge joins is
   drawn dashed with the caption "missing: A — B". Clicking a node filters the
   table. The graph never adds a bridge.
3. **Works** — the table with a Programme column ("Autistikon (example)" |
   "Classics" | "Upload"), the licence, the body state, and the upload model.
4. **Actions** — Converge, Compare, Analyze are enabled only when the current
   selection would pass the bench law for that job; otherwise the button is
   disabled (`aria-disabled`) and names the first blocking code and, for
   `NO_BRIDGE`, the missing pair ("no path natural-history — optics").
5. **Result** — the AnalysisNote card and the session's result list.
6. **Export** — on a successful note, **Copy Markdown** and **Download .md**:
   the eight sections, each parent's attribution and source URL, the Jaccard
   line, and the is_not list. Built locally; no network.
7. **Refuse glossary** — compact; then the closed substrate details (internal
   code name Chronarch — not the product) with the programmes, fixtures,
   paste box, hashes and instrument readouts.

## Project

A **Project** ([PROJECT.md](PROJECT.md)) is what a group takes home: the works
used, the live bridges the notes ran over, the AnalysisNotes, and one Markdown
pack to download. `/tech` holds one ("Untitled project", editable); uploads,
declared bridges and successful notes append to it; filters never touch it.
It is saved in this browser only (`localStorage`, key `rexmetrix.project.v1`,
no cookies, no server, no analytics), survives a reload, and travels as
**project.json**: Download project.json writes the canonical JSON; a file
input imports one through a fail-closed guard (bad JSON or no name is
`IMPORT_INVALID`; bridges not marked operator-declared are stripped; works
outside the preload enter only under the upload law). **Clear project** wipes
memory and storage after a confirm checkbox.

**Declare bridge** (left field, right field, "amendment, not evidence.") adds
a live, operator-declared bridge to the project only — never to a programme
file. A note that runs over it carries `is_not: "bridge was
operator-declared"` and an empty assumptions ledger. **Clear extra bridges**
removes them. The **notes library** lists the project's notes in time order
and re-opens any card. **Download pack** writes the whole project as one
Markdown file, closing with: not a fitted model; not peer review; not
Foundation-endorsed; not a public chain.

## First run

An amateur should finish one real Compare and one Autistikon Converge without
reading the glossary; a professional should be able to wave it away. On
`/tech`, while the flag `rexmetrix.seenFirstRun.v1` is absent from this
browser, a three-step panel sits **above the filters** — an aside in the
column, not a modal; nothing traps focus:

1. "Filter Classics. Tick Faraday and Maxwell. Compare."
2. "Filter Autistikon. Tick both stand-ins. Converge."
3. "Download pack."

Each step ticks itself when the matching note exists in the project (steps 1
and 2 read the project's notes by job and parent ids; step 3 by the pack
download). "I'm a professional — skip", Esc, or finishing writes the flag and
the panel stays away on every later load. The panel repeats the honesty
sentence and nothing else: no "AI scientist", no dashboard, no plot. It adds
no science engine — the three steps are the bench as it is.

Pasted bodies are excerpts: `acceptUpload` refuses more than 20 000
characters with `TEXT_TOO_LONG` and adds no row ([WORKS.md](WORKS.md)).

## Works

Only legal works enter RexMetrix: a few preloaded starter works with a licence
on every record, uploads a tenant has rights to (licence required; full text
under a disallowed licence is refused), and metadata-only index stubs. No world
corpus, no scraping, no PDF ingest. See [WORKS.md](WORKS.md).

## Reading order

[FIELDS.md](FIELDS.md) → [BRIDGES.md](BRIDGES.md) →
[PROGRAMMES.md](PROGRAMMES.md) → [SYNTHESIS.md](SYNTHESIS.md) →
[WORKS.md](WORKS.md) → [ANALYSIS.md](ANALYSIS.md) → [LEGAL.md](LEGAL.md).
