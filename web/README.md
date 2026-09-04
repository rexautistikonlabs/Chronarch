# web/ — Chronarch Lab + consortium landing

A static Vite app: the instrument UI for a Chronarch lab session, and the
landing for research groups. It draws the state of one session — a checked-in
fixture or JSON you paste — and holds still.

> Chronarch lab-v0 is a research organism on an in-process or loopback net.
> It is **not a public blockchain**. This site is a viewer: it spawns no node
> and reads no filesystem.

## Dev

```
cd web
npm i
npm run dev          # http://localhost:5173
```

```
npm run build        # typecheck + vite build → dist/
npm test             # vitest (jsdom): floor chrome + honesty, chips 4→5, benches, technician console, reduced motion, animation law, resilience
npm run check:loops  # the doctrine grep as a script
```

## The well

The page is one fixed, full-viewport canvas — the well — with a phosphor HUD
over it. Primary chrome on the floor: the well, `⌘K`, and a "Technician" text
button. Hover a bench for its edge and label; click for a one-shot iris and a
plain-language card. The camera is pointer-live (parallax on hover, orbit on
drag, zoom on wheel, damped) and clock-dead: `frameloop="demand"` at rest,
awake only while the pointer moves the rig and for 300 ms after it stops.
Bloom and grain spike on an event and decay to rest. Static 4 % scanlines.
See [docs/VISUAL.md](docs/VISUAL.md).

## Two rooms

| Route | Who it is for | What it shows |
|---|---|---|
| `/` | a visitor | **the lab floor**: the well, ⌘K, a Technician button; one plain STATUS sentence; two record chips (*Quiet pulse*, *The vote*); four benches (Memory, Vote, Body, Pulse — hover: edge + label; click: one-shot iris + one card in everyday language, then still); readouts in human words. No protocol names in the chrome, no hex, no credits. |
| `/tech` | a technician | **the console**, a scrolling panel over the same well: paste `memory` / `pulse` / `net status` / session JSON or load a fixture by filename → the well redraws; the raw session as text; every hash and credit; the operator path's command log; the Immune Gym case list; the consortium line; links to the protocol views. `/lab` redirects here. |
| `/timechain` `/council` `/hearth` `/farm` `/gym` `/operator` `/consortium` | a technician | the protocol views, linked from `/tech` (never from the floor's chrome) |

## Fixtures

`fixtures/session-opa.json` is the operator path (`specs/OPERATOR.md`) captured
verbatim from `python -m chronarch_cli`: two homes on the in-process bus,
height 4, head `ecdbe6b0…`, `peer_count` 3, proposal
`peer-peer_add-net-node-2` approved and ratified. `fixtures/session-solo.json`
is one pulsed home (height 3). A session file is `{schema, label, focus_home,
steps: [{cmd, home?, output}]}` — each `output` is exactly what the CLI printed.

## Doctrine

[docs/VISUAL.md](docs/VISUAL.md): state-driven rest pose from a hash PRNG,
one-shot events then stillness, no repeating animation, no motion under
`prefers-reduced-motion`, amber only on a real fault, STATUS honesty on every
page, and the rejected ideas (idle drift, looping hero, wallet button,
Timechain-as-gallery, browser-spawned nodes).

## Stack

Vite · React 19 · react-three-fiber + drei · GSAP (one-shot only) · React Aria
Components + Tailwind v4 · @react-three/postprocessing (event-only bloom/grain) · cmdk · IBM Plex (bundled) · Lucide · vitest + Testing Library.
No editor: the loaded JSON is a `<pre>` — an instrument, not an IDE.

## Fail-closed rendering

Every route renders inside an error boundary, and so does the scene's canvas
and the console's JSON viewer. A crash in any of them shows a still ivory
"failed closed" panel in its place; the STATUS banner, nav, readouts and the
rest of the page stay. `/lab` cannot go black because of its viewer
(`tests/lab-resilience.test.tsx`).
