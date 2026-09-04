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
npm test             # vitest (jsdom): landing honesty, reduced motion, fixture load, animation law
npm run check:loops  # the doctrine grep as a script
```

## Routes

| Route | What it shows |
|---|---|
| `/` | landing + viewport, readouts, legend, what this is not |
| `/lab` | console: load a fixture or paste `memory` / `pulse` / `net status` / session JSON → the scene redraws; read-only Monaco of the loaded session |
| `/timechain` | stacked rings, scars as sealed rim lesions |
| `/council` | seats + the proposal that docks only when approved and ratified |
| `/hearth` | the self-bond as a tensegrity; credits by reason (chronons, not a price) |
| `/farm` | pins as rods in a well; I3 is the only amber |
| `/gym` | DummyMind as a sealed box; attested compute |
| `/consortium` | how a research group joins: run the lab, read the law, propose + ballot |
| `/operator` | the loaded session's literal command log |

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
Components + Tailwind v4 · IBM Plex (bundled) · Monaco (bundled, read-only) ·
Lucide · vitest + Testing Library.
