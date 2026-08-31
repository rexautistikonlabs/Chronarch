# BUILD_LOG

Decisions made while building Chronarch, and the ideas we rejected on
purpose. If a choice conflicts with Genesis Law, Genesis Law wins; G14 wins
over convenience.

## Rejected ideas (kept here so they stay rejected)

| Rejected idea | Why it is wrong | What we did instead |
| --- | --- | --- |
| **Plots as a database** | PoST plots prove space; stuffing rings/embeddings/weights into them destroys both the proof and the data model | Dual farm: PLOT LANE proves space, CAMBIUM/CAS LANE pins objects (K4) |
| **PoQ as mining** | Self-scored "quality" as consensus weight is vanity turned into money | Advisory 6-D self-PoQ (G10); consensus uses challenge attestations only |
| **Chronos buys conscience** | A judgment market means the richest actor owns truth | G2 by construction: `judge_challenge` has no payment parameter; salience clamps to retrieval ranking only |
| **Chronarch as dictator** | A helm that can enact is an admin with extra steps | G15: Chronarch drafts and proposes; activation requires Council tally + height gate |
| **Council as silent admin** | Stewards who can override law are a committee-shaped admin key | G16: illegal ratification is invalid + slashes yes-voters + seals a Scar at I8 |
| **Admin key / founder key / helm override** | Every recovery backdoor becomes the attack surface | K18 reject list; closed schemas; admission chokepoint scars + slashes any override claim; AST test forbids override identifiers in source |
| **AI-rewrite upgrade path** | Self-modifying consensus bytecode is unbounded and unauditable | G14/G17: Proposal ring + slashing-backed Ballot + height activation is the ONLY path; authored code registers inert (G4) |
| **Rex as diagnosis** | Importing autism claims or scoring instruments would be a fake medical product | NERVOUS.md imports the *method* (measure restriction → predict transmission → falsify) as engineering instrumentation, G18 |
| **External blackhat tooling** | An immune system that attacks strangers is a weapon | G12: GymCase target classes are Chronarch-only, enforced at the schema layer; widening beyond them is illegal even by vote |
| **Tempre skills as validators** | Python skill code as consensus logic imports a whole runtime as attack surface | Primitives rebuilt as protocol objects: audited opcode menu (K5) + DummyMind interpreter (K16) |
| **Invented 40/40/20 consensus weight** | Made-up weight formulas are numerology | MVP: abstract PoST lottery among identities meeting prestress floors; attestations/pins/gym act as filters/reputation |

## Decisions

- **Language: Python 3.11, no install step.** Matches the Chia-family and
  Tempre lineage; `conftest.py` wires `packages/*/src`, mirroring G11's
  "no privileged setup" for the dev loop.
- **Canonical codec bans floats.** All ratios are integer bps; JSON with
  sorted keys, ASCII escapes, minimal separators; domain-separated SHA-256
  (`chronarch/v0/<type>\n` prefix) so object types can never collide.
- **Closed schemas + recursive forbidden-key screen.** `admin_key` and kin
  are rejected wherever they appear, at any nesting depth, in any object,
  tx, or node config. The screen once caught our own kernel field
  (`reads_admin_private_key`, a boolean *about* not reading keys) — renamed
  rather than whitelisted, because whitelists are how backdoors start.
- **Kernel manifest binds structured content, not spec prose.** Doc edits
  don't move consensus hashes; changing an actual parameter does, and the
  golden-fixture test (`tests/fixtures/genesis_hashes.json`) makes that a
  deliberate, reviewed act (M1 / hard fork).
- **Admission has no "drill mode".** Boot-time gym smoke sends a real
  fake-admin tx through the real chokepoint, so healthy boot chains carry
  the I8 scars of their own drills. A skip-scarring flag would itself be a
  bypass.
- **Tally denominators are ELIGIBLE totals.** Yes weight ≥ 2/3 of eligible
  bond weight AND yes seats > 1/2 of eligible seats — abstention counts
  against a proposal; there is no quorum trick with a small turnout.
- **Slashing takes the bond leg only.** The liquidity leg unwinds after the
  delay even for slashed positions: punishment targets judgment abuse, not
  liquidity (G13).
- **Reward router remainder goes to treasury.** Integer floor-division dust
  is neither lost nor minted; the router conserves issuance exactly.
- **Gym drills seal `immune` evidence rings; real events seal scars.** The
  exception is the admission chokepoint (above), which cannot distinguish
  drills by design.
- **License:** MIT (already present in the repository, owner's choice).

## Adversarial review round 1 (six lenses, refuters per finding)

Confirmed and fixed:

- **`verify_full` array-desync blind spot.** The ring and hash arrays were
  only zipped; a one-array desync left the tail unverified while `head_hash`
  reported a hash covering no real ring. Now a length mismatch is a
  `ChainError`.
- **Slash-escape via unbond.** A yes-voter could `request_unbond` and
  `release` inside the 128-slot voting window (delay is 32) and dodge the
  G16 slash — "slashing-backed vote" was escapable. Fixed with **ballot
  liens**: casting a ballot liens the Hearth position; release is refused
  until the tally clears it. Slash loops are also defensive now: a
  vanished/pre-slashed position seizes 0 and is logged, so a tally can
  never wedge half-slashed with the I8 scar unsealed.
- **Solvency tautology.** `solvent` compared inventory to a term of itself
  and could never be False; it now compares inventory to liabilities.
- **`check_legality` normalization gap.** G16 matching was raw-substring on
  top-level paths only; `genesis_law_g1`, `genesislaw.g1`, or a nested
  `{"apply": {...}}` slipped past. Now normalized like the K18 screen and
  recursive over nested values — with a digit boundary so `genesis_law.g14`
  (M1-amendable) never false-matches `genesis_law.g1`.
- **Quarantine did not block release**; it does now (`lift_quarantine`
  added), matching HEARTH.md.
- **Spec-code drift**: NERVOUS.md's transmission column now quotes the
  code's `ADJACENCY` verbatim; COUNCIL.md's state diagram gained the
  `Tally -> Expired` edge (the brief lists approve|reject|expire as tally
  outcomes).

Reviewed and left as-is (refuted on threat-model scope): `CAS.withhold` and
`FacultyRegistry.hibernate` are local-process operations with no tx/ring
path — withholding your own disk is always physically possible; the
protocol's defense is challenge/detection, not API prevention.
`faculty_code_hash` deliberately omits `status`: the hash names code
identity, the registry is the authority on lifecycle state.

## Phase 2 — sim attacks (`packages/chronarch-sim`)

A deterministic multi-node fixture (`SimWorld`: N nodes booted from the same
kernel, a shared bonded-steward Council + Hearth, an explicit slot counter,
no wall clock or randomness), the full 12-case Immune Gym catalog run across
every node, and the seven named Phase-2 attacks each with an explicit oracle:
helm-override tx, admin-key tx (plain/camelCase/nested), Chronarch self-enact
M3, Chronos bribe to flip a Challenge, Chronos bribe to flip Ballot legality,
pin withhold, and HearthDrain (instant-exit + vote-then-flee).

`SIM_REPORT.md` is generated from the sim (`python -m chronarch_sim.report`),
never hand-edited, so it cannot drift from what the tests prove.

**Result: all seven defenses held and all 60 gym cases passed. No sim test
proved a hole**, so — per the task constraint — nothing in the frozen kernel,
admission, or Council was changed. The sim builds only on the kernel's public
APIs; it holds no key and reaches no protocol path.

One naming note: the AST guard "no source identifier implements an override"
scans every package, so the attack functions are named `attack_forged_helm_tx`
and `attack_forged_adminkey_tx` (the attack labels `helm_override_tx` /
`admin_key` live in string data, which the guard correctly ignores). The guard
was left covering the sim package rather than exempted — a real override
identifier sneaking into sim code should still turn it red.

## Phase 3 — node + CLI (`packages/chronarch-node`, `packages/chronarch-cli`)

The SimWorld loop wired to real transports.

- **Consensus ledger vs boot chain.** Each node's *boot* chain diverges by
  construction — the S5 announce ring carries the node's own id — so it can
  never be the replicated log. Phase 3 introduces a separate **consensus
  ledger** that starts from the identical Ring 0 on every node; the leader
  seals slot rings + headers into it and gossips them, and followers re-seal
  identically. A gossiped ring whose recomputed hash ≠ the claimed hash is
  rejected as a fork (tampering is detectable), so convergence is verified,
  not trusted.
- **Abstract-PoST slot leader** (`leader.py`): a deterministic,
  space-proportional, peer-verifiable lottery — a hash of the slot folded
  over the cumulative space table, gated by the prestress floors. No
  randomness, no stake or PoQ weight in the draw (G2/G10), no invented
  40/40/20.
- **Gossip** of headers / rings / challenges over an `InProcessBus`
  (deterministic, for the cluster and tests) and a real line-JSON **TCP**
  transport (`RpcServer` / `rpc_call`) so a node runs as an actual process.
- **Eight RPC verbs** — init, seal, verify, pin, challenge, propose, ballot,
  health — each routing through the frozen machinery. `seal` validates every
  ring (an `admin_key` body is rejected by the schema screen); there is no
  verb that activates a faculty, edits history, or bypasses admission/Council.
  A `submit_tx` verb is exposed too, so the CLI can prove override rejection
  end to end.
- **CLI**: `chronarch serve` runs a node process, `chronarch cluster` runs
  the in-process demo, and the RPC verbs drive a running node over TCP.

**Result: 32 new node/CLI tests (133 total green). No node test proved a
hole**, so genesis hashes, admission, Council, and Hearth are untouched —
verified by git diff. The node is not a bypass: an illegal proposal ratified
via the `propose`/`ballot` verbs is still ruled invalid and slashed (G16),
and a forged gossip ring is rejected fleet-wide.

**CI**: `.github/workflows/ci.yml` runs `pytest -q` on every push and PR to
`main` (Python 3.11 and 3.12), no install step (G11).

## Phase 4 — dual-farm docs + abstract-to-plot adapter (`packages/chronarch-farm`)

Scope held deliberately narrow: [specs/DUAL_FARM.md](specs/DUAL_FARM.md)
(plot lane vs CAS lane, what is/is not in a plot, the size table, the
adapter contract) plus typed `PlotCommitment`/`PlotProof` objects, a
FROZEN-MVP size table (`test`=1 unit; `k32`=1014 units ≈ a documented
~101.4 GiB — no real-farming claims), a both-ways adapter, and a
**structural stub verifier**. No VDF, no Chia header fork, no CHIP-48, no
chia-blockchain submodule — Phase 6 replaces the stub recomputation behind
the same `verify_plot_proof` signature.

The load-bearing property, tested slot-by-slot over hundreds of slots: for
identical units, the plot world and the abstract world elect **identical
leaders**. The adapter adds no weight, no denomination bonus, and no new
power; prestress floors gate contention exactly as before.

**"Plots as a database" stayed rejected** — and got teeth: a plot's only
bridge to memory is the optional `cas_root` commitment. A missing CAS
object does not invalidate a plot proof (space was still proven); the
missing pin is an I3 nervous event on the CAS lane. Timechain JSONL inside
a `.plot` file is a category error, not an optimization.

16 new tests (149 total green). Frozen files untouched (git diff proof);
the K18 AST scan covers the new package automatically and stays clean.

## Open questions (for future Proposal + Ballot, not for quiet edits)

- Mainnet issuance schedule (sim halving is FROZEN-MVP; real one is M4).
- Witness rule beyond 3-of-5 (K11) once real networking exists (Phase 3).
- Real PoST plot format + VDF clock (Phase 4/6, Chia-family research fork).
- AXON counter-asset design for the Hearth AMM beyond the simulated quote.
- Governance for `hibernate` (a MINOR change today with no usage-accounting
  check that the faculty is actually "unused"; hibernation of a
  protocol-path faculty fails closed, but cadence rules belong in Phase 3).
- Council seat registration currently trusts self-asserted pinset size and
  challenge-pass recency; Phase 3 nodes must derive both from sealed
  PinSet rings and ChallengeResults.
