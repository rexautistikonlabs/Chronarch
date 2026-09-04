# VISUAL.md — RexMetrix: the well's visual doctrine

`web/` is the instrument UI for **RexMetrix**, research software for
hypothesis-led programmes. It is not a marketing site for anything, and it
sells nothing: no chain, no coin, no treatment, no endorsement. Every visual decision below follows from that, and the
ones marked **law** are enforced by tests (`web/tests/`).

## 000. What a visitor sees: the catalogue as a graph

The visitor's well draws the **product**, not the substrate. Every field in
the catalogue is a steel disc on a ring; a bridge is a phosphor line between
exactly two discs — the loaded programme's bridges are bright, the rest dim,
a non-live bridge dashed; the loaded programme's fields wear a phosphor
plinth; the synthesis child is a small prism above the centre with lines down
to its parents along its declared path. Where a disc sits is seeded from the
programme id through the same hash PRNG. Switching programmes settles the
subgraph once, then still.

The four benches read **Fields, Bridges, Programmes, Synthesis** — the
product's nouns, not Vote/Council as governance. The two chips are
**Programme Zero** (`programme-zero.json`) and **Toy programme**
(`programme-toy.json`). Readouts are programme words: fields, bridges,
assumptions rated, falsifiers registered, items locked, stops on. The
technician room keeps the substrate's instrument (rings, scars, rods,
tensegrity, seats, sealed box), its session records (*Quiet pulse*, *The
vote*), hashes and credits.

**Product law on copy** (`specs/LEGAL.md`, `src/lib/banned.ts`,
`tests/rexmetrix-honesty.test.tsx`): every visitor-facing string is screened
for the banned phrases — no public chain talk, no coin, no wallet-style
account, no council-as-governance, no "digital organism", no treatment or
diagnostic language, no Foundation endorsement (the only permitted form is the
negation in the honesty sentence). The honesty sentence on `/` names RexMetrix
and says: not a diagnostic, not Foundation-endorsed, not a public chain.

## 00. The well + phosphor; pointer live, clock dead

The docs-site chrome is gone. The page **is** the well: one fixed, full-viewport
canvas, and over it a phosphor HUD. Two audiences still: the visitor's floor
(`/`) and the technician room (`/tech`, a scrolling panel over the same well).

- **Primary chrome on the floor** is the well, a `⌘K` button, an "About"
  button and a "Technician" text button. No multi-link bar of protocol names (**law:**
  `tests/floor.test.tsx`). The STATUS line is the very top strip; the plain
  honesty sentence, including "not a public blockchain", sits under the brand,
  above the fold.
- **Phosphor HUD, steel rings, amber scars.** HUD labels and readouts are
  phosphor (`#9EF0B4`, a faint text-shadow); rings stay steel; amber is still
  only a scar or a real I3. A **static 4 % scanline overlay** is a CSS
  repeating gradient — not a scrolling time shader; it never ticks.
- **Hover a bench** (in the well, or its HUD button) = a phosphor edge box and
  a label; unhover = edge off. **Click** = a one-shot iris and the plain-language
  card. Then still.
- **Records** are still *Quiet pulse* and *The vote*; a switch is a one-shot
  settle, then still. The hash-PRNG rest pose is unchanged.
- **Event energy.** Bloom and grain (postprocessing) spike on an event — a
  record switch, a bench choice — and decay to rest in one GSAP one-shot: bloom
  to a faint phosphor base, grain to zero. Nothing in the effect stack is
  driven by a clock; at rest no frame is drawn, so nothing can shimmer.
  Anything that would need `sin(time)` forever is not here.
- **`⌘K` palette** (cmdk): Pulse / Memory / Vote / Body, the two records,
  "Paste session" (→ the technician room), "Lab floor". It navigates or opens a
  card. It never fetches and never spawns a process (**law:**
  `tests/palette.test.tsx`).

### Pointer live, clock dead

Fluid means **pointer-driven camera damping plus one-shot event energy**. The
camera damps toward a goal: the focus's seeded rest pose, plus what the hand is
doing — a small parallax while hovering the well, an orbit while dragging, a
zoom on wheel. That damping is the only per-frame code in `web/`, and it reads
`delta`, never the clock.

- `frameloop="demand"` at rest. The rig switches to `"always"` while the
  pointer is moving it (or a focus tween runs) and back to `"demand"` **300 ms
  after the pointer stops** — held a little longer only until the damping has
  converged, capped at six checks, then it lands exactly and draws one last
  frame. With no pointer and no event, no frame is drawn.
- **Render policy — invalidate on every tween tick.** `frameloop="demand"`
  alone does not paint GSAP ticks: a tween that changes the camera, the iris or
  the bloom must call `invalidate()` from `@react-three/fiber` on *every*
  `onUpdate`, or it steps. And toggling demand↔always mid-gesture hitches. So
  one ledger (`src/scene/renderPolicy.ts`) owns the loop: the loop is `always`
  while anything **holds** it — pointer down, pointer moving in the well, the
  camera focus tween, a record-switch settle, the iris, a bloom spike, the
  damping still converging — and goes back to `demand` plus one final
  `invalidate()` **200 ms after the last hold is released**. Every tween both
  holds the ledger for its duration and invalidates on each tick (**law:**
  `tests/no-loops.test.ts`, `tests/render-policy.test.ts`). The loop mode is
  the Canvas `frameloop` prop itself, following the ledger — R3F re-applies that
  prop on every render, so a runtime `setFrameloop()` would be undone by the
  next HUD re-render and the loop would die mid-damping (it did). The Canvas
  and its gl are never remounted by any of this: the loop *mode* changes,
  nothing else;
  a card opening or a bench hover re-renders the HUD, not the well
  (`tests/remount.test.tsx`).
- **Cheap compositor.** No EffectComposer at rest: it is mounted only while a
  bloom/grain spike runs and unmounted when the spike ends, so the resting
  frame is a plain render. `dpr` is capped at `[1, 1.5]`, shadows are off, the
  composer's multisampling is 0.
- **Law** (`tests/no-loops.test.ts`): the repeating-animation grep is still
  empty; `useFrame` exists only in `src/scene/PointerRig.tsx` and its signature
  reads `delta`; no file under `src/scene` or `src/hud` reads a clock
  (`clock`, `elapsedTime`, `performance.now`, `Date.now`), sets an interval or
  runs its own rAF loop; the `always` frameloop is never written as a JSX
  literal — only the rig sets it at runtime, and only while the pointer moves.
- **prefers-reduced-motion:** no camera follow (the pointer does nothing), a
  focus change is an instant cut, no bloom spike, no iris — cards only.

## 0. Two rooms: visitor and technician

The same organism is met twice.

- **The lab floor (`/`)** is for a normal person. Its chrome has two links —
  *Lab floor* and *Technician* — and no protocol name: nothing in the primary
  nav reads Timechain, Council, Hearth, Farm, Gym or Operator (**law:**
  `tests/floor.test.tsx`). One plain-English STATUS sentence sits at the top and
  includes "not a public blockchain". The scene is the same instrument; under it
  are **four benches** — Memory, Vote, Body, Pulse — and two **record chips** —
  *Quiet pulse* (`session-solo.json`) and *The vote* (`session-opa.json`).
  Clicking a bench eases the camera once to that subsystem and opens one card
  in everyday language; then the floor is still. Switching a record is a
  one-shot settle, then rest; the hash-PRNG rest pose is unchanged. Readouts
  are human nouns — *beats*, *pages remembered*, *marks that stay*, *files ok*,
  *seats at the table* — and no hex, credit or protocol field name appears.
- **The technician room (`/tech`)** keeps every protocol object by its real
  name: the console (paste JSON, fixtures by filename), the raw session, every
  hash and credit, the operator path's command log, the Immune Gym case list,
  the consortium line, and links to the protocol views (`/timechain`, `/council`,
  `/hearth`, `/farm`, `/gym`, `/operator`, `/consortium`). It is not the
  default landing; `/lab` redirects into it.

Both rooms wear the same STATUS banner and footer. The floor never hides the
disclaimer to feel friendlier: plain words are how it is said, not whether.

## 1. State drives the scene

The viewport draws **one lab session** — a checked-in fixture or JSON the
operator pastes — and nothing else. Six readouts plus the head hash seed the
scene: `ring_count`, `scar_count`, `head_hash`, `pins_ok` (and `i3`),
`peer_count`, `height`.

- **Rest pose is a pure function of state** (`src/lib/pose.ts`). The head hash
  seeds a hash PRNG (sfc32 over the hash's first 128 bits); the PRNG decides the
  stack's lean and yaw, every ring's seam and radius jitter, where each scar sits
  on its rim, the rod positions in the well, the seat arc's yaw, the box's yaw,
  and the camera's rest azimuth. **Law:** the same head yields the same pose;
  two different heads yield visibly different poses (`tests/pose.test.ts`).
- **Counts are data, not seed.** `ring_count` is the number of rings drawn;
  `scar_count` is the number of amber lesions; `pins_ok`/`i3` decide whether a
  rod is raised; the proposal docks only when a ballot is approved and ratified.
  The one seeded count is the rod total, because the pinset size is not in the
  CLI's output and the UI does not invent readouts.

## 2. The mapping

| Subsystem | Shape | Reading |
|---|---|---|
| Timechain | stacked torus rings on a thin spine; Ring 0 thick and paler | one ring per sealed ring; height is a count, not a clock |
| Scar | a small amber box sealed onto a rim (never on Ring 0) | G5: scars cannot vanish; a review retires one with a *new* ring |
| Pins | rods standing in an open well | all seated = PINS_OK; one raised amber rod = a real I3 restriction |
| Hearth | two compression legs, tension cables, a lock node | the self-bond; prestress keeps the legs apart — the clamp is the geometry |
| Council | seats in an arc, a hex prism | the prism docks at the centre only on approved + ratified; otherwise it is parked, still |
| DummyMind | a sealed box with a lid | the lid opens and closes once when a session carries an attested compute receipt |

No logos. Nothing spins.

## 3. Animation law

**Events are one-shot, then the scene is still.** There is no idle, no
breathing, no drift, no orbit-by-itself, no looping shader time.

- Every timeline is `gsap.timeline({ ...ONE_SHOT, ... })` where
  `ONE_SHOT = { repeat: 0, yoyo: false }` (`src/lib/motion.ts`). **Law:**
  `tests/no-loops.test.ts` asserts every `gsap.timeline(` call spreads
  `ONE_SHOT`, that no stray `gsap.to/from/fromTo` exists outside a timeline, and
  that no `useFrame` per-frame hook exists anywhere.
- **Law:** the following literals may not appear anywhere under `web/`
  (outside `node_modules`): an infinite or negative GSAP repeat, drei's
  auto-rotate prop, three's animation mixer, GSAP yoyo, and CSS infinite
  iteration counts. `npm run check:loops` is the same grep as a script.
- The canvas runs `frameloop="demand"`: a frame is drawn only when a one-shot
  tween updates, the operator orbits by hand, or the window resizes. At rest the
  GPU is idle. OrbitControls have damping off so releasing the mouse stops the
  view exactly where it is.
- Route changes move the camera once (a 0.9 s ease) to the subsystem in focus.
- The loaded JSON is plain text in a `<pre>`: no editor, no blinking cursor,
  no worker, no lazy chunk. An instrument, not an IDE.

### prefers-reduced-motion

Under `(prefers-reduced-motion: reduce)` there is **no motion**: every event
jumps to its final pose (rings at full scale, prism docked, lid closed, camera
at its goal), the CSS layer disables transitions, and the badge reads
"motion: off". **Law:** `tests/reduced-motion.test.tsx` — the query never
throws (jsdom has no `matchMedia`; a throwing `matchMedia` is caught) and
every route renders under it.

## 4. Palette and type

- Void `#07090C` background; ink `#0D1117` panels; ivory `#E8E4DA` text;
  mute `#8A949E`; ring steel `#9AA3AD`; genesis `#C8CFD6`; verdigris `#7FB3A6`
  for a docked (ratified) proposal and an attested receipt.
- **Scar amber `#E0A32E` appears only on a scar or a real I3 fault.** No
  warning banners, no accent buttons, no hover glows in amber. Parse errors in
  the console are ivory with a mono `refused —` prefix.
- IBM Plex Sans for prose, IBM Plex Mono (`.readout`, tabular numerals) for
  every number, hash, identifier and command. Fonts are bundled
  (`@fontsource`), not fetched.

### Fail-closed rendering

A viewer, scene or page crash is caught by an error boundary and shown as a
still ivory "failed closed" panel where the failed part was; the banner, nav,
readouts and the rest of the page stay. **Law:** `tests/lab-resilience.test.tsx`
— with the JSON viewer mocked to throw, `/lab` still has its banner, nav,
fixture buttons, readouts and viewport. The panel is never amber: a viewer
failure is not a scar and not an I3.

## 5. STATUS honesty

The sentence "not a public blockchain" is on every page (the status banner and
the footer) and above the fold on the landing. **Law:**
`tests/landing.test.tsx`.

Language the UI refuses, in its own copy, its fixtures and README, and in any
session text it renders (`src/lib/banned.ts` screens session text before
display): the name of Chia's production network; a CHIP-48 compatibility claim;
a wallet-connect call to action; a token price; a TVL figure; the phrase "live
network". **Law:** `tests/honesty.test.ts`.

## 6. Rejected (kept rejected)

- **Idle drift / breathing / slow orbit** — no. It reads as life the organism
  does not have and as activity the lab does not have. A still instrument tells
  the truth: nothing happened.
- **Looping hero animation** — no. Same reason; and a loop cannot be
  state-driven.
- **A wallet button** — no. There is nothing to connect to.
- **Timechain as an NFT gallery** — no. Rings are consensus objects with a
  closed schema, not items to browse or own.
- **Browser-spawned nodes** — no. `web/` is a static viewer; it never spawns
  `chronarch` and never reads a filesystem. Sessions arrive as fixtures or paste.
- **Spinning logos, partner carousels** — no.
- **Amber as an accent colour** — no. Amber means a scar or a fault.
- **Matrix rain / any clock-driven loop** — no. A shader or overlay that
  scrolls with time would make the well look busy while nothing happens. The
  scanlines are a static gradient; grain and bloom spike on an event and decay
  to rest; the only per-frame code follows the pointer and sleeps 300 ms after
  it stops.
- **Selling the substrate** — no. Rings are not coins, seats are not a
  governance product, the Hearth is not a stake. The visitor never meets those
  words; the technician meets them as an operator's readouts.
- **Smearing Programme Zero onto every field** — no. Its method travels (bridge
  statement, locked array, rated ledger, register, stop clock); its content —
  eight sensorimotor interfaces, a corpus's array — does not become a template.
- **A theme-park loop** — no. A "fun" idle — particles, drift, a looping
  hero — would make the floor feel alive between records. Nothing happened, so
  nothing moves. The floor is still until a bench or a record is chosen, then
  it moves once.
- **Hiding the disclaimer for visitors** — no. The floor says "not a public
  blockchain" in plain English above the scene, and the banner and footer say
  it again. Friendliness changes the words, never the claim.
- **A live dashboard** — no. Nothing fetches a home, spawns a node or opens a
  socket. Two saved records and a paste box; the floor is a reading of what
  was, not a feed of what is.
- **An editor on the critical path** — no. Monaco's workers failed under
  `vite dev` and, with no boundary, blanked `/lab`. The console shows JSON as
  text; nothing a viewer does can take the page down.
