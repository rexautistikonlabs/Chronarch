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

## Phase 5 — agent runtime (`packages/chronarch-agent`)

AI agents as the primary builders — the interface is optimized, consensus is
not touched. The agent **wears** a node (boots one, drives it through the
frozen machinery); it does not fork the kernel.

- **Machine protocol**: every verb is JSON→JSON with one envelope
  `{ok, error_code, result, ring_hash, evidence_refs}` and a closed error-code
  set documented in [specs/AGENT.md](specs/AGENT.md). No prose-only APIs.
- **Closed tool surface**: `packages/chronarch-agent/tools.json` ships
  OpenAI-style schemas for exactly `init, recall, pin, challenge, seal,
  propose, ballot, health, turn, task_open, task_resume`. There is no
  `activate_faculty`, `execute_upgrade`, `edit_ring`, or `helm_override`
  tool — requesting one returns `FORBIDDEN_TOOL`.
- **Wear loop** (DummyMind default): load identity head → recall + re-verify
  every evidence CAS hash → run only live-registry faculties → attach
  advisory `self_poq` (6×0–255) as **metadata** → seal or propose. Authored
  faculty stays inert; M3 still needs Proposal + Ballot.
- **LLM gate**: a backend implements `complete(prompt)->str`, active only
  when `CHRONARCH_LLM=1` AND a backend is injected. Its output is a draft
  string in a payload — never code, never an upgrade, never a Challenge
  verdict. Unset env → DummyMind; the whole suite passes with zero keys.
- **Continuum**: `task_open` makes a separate task chain + a pointer ring on
  identity; `task_resume` appends to the task chain. Task work never splices
  into identity (G8).

### Rejected: "LLM as consensus"

The tempting shortcuts, all rejected and now tested against:

- *The chain is the model* — no. The Timechain is memory; the mind is a
  replaceable wearer. DummyMind is the default and is required.
- *Put the LLM in the validator* — no. No backend appears in any judgment,
  admission, or election signature; grep confirms it.
- *`eval()` the model's text* — no. An LLM draft is a string in a payload; a
  test proves a `FakeLLM` draft cannot become a live faculty.
- *self_poq / salience / Chronos buys a seal or a verdict* — no. `self_poq`
  is advisory metadata; a maxed 255×6 cannot flip a Challenge (G2/G10).

25 new agent/CLI tests (174 total green). Frozen files untouched (git diff
proof); the K18 AST scan covers the new package and stays clean.

## Phase 5 (extended) — silos, hat pipeline, prevention modality

Added on top of the agent runtime: four silos (`silo.codex`, `.antihacker`,
`.llm`, `.commons`) of inert artifacts; a white/red/black **hat pipeline**
(schema+K18 / Immune-Gym on an isolated fixture / prevention-catalog only),
Chronarch fixtures only (G12); `propose_release` gated on all three hats then
the Council (M3, G14); and the safeguards S1–S10 as code. New verbs:
`silo_open`, `silo_put`, `silo_list`, `hat_run`, `propose_release`. New
forbidden verbs: `release_now`, `eval`, `instruct_agent`, `whisper`,
`convey`. See [specs/SILOS.md](specs/SILOS.md).

### Rejected ideas (now with teeth)

- **"Black-hat agent."** Rejected. Black-hat is a `prevention_catalog_modality`
  with exactly three ops (list attack classes / propose an inert case / score
  a fixture run) and nothing else — the class holds no agent, ledger, hearth,
  council, socket, or peer reference, so messaging, sealing, ballots,
  activation, and moving Chronos are *unrepresentable*, not merely forbidden.
  A test introspects its dispatch table to prove the surface is exactly three.
- **"Peer conveyance."** Rejected. Agents cannot instruct agents: there is no
  inbox/outbox, any conveyance key is `CONVEYANCE_DENIED` + an I6 scar on the
  sender (never delivery), and recalled evidence is tool-call-fenced and
  quarantined (S3/S4/S10). The only inter-agent channel is a sealed ring a
  peer chooses to recall — pull, hash-verified, never push.
- **"Silo auto-release."** Rejected. No `Chronarch.release()`, no
  `release_now`. Authored code reaching the protocol path is a major change;
  the hats gather evidence, the Council decides (G14/S8).

The black-hat modality was deliberately kept out of the protocol faculty
registry: it is a hat-run-only analysis tool, so G3/G4 stay clean (it never
touches the protocol path) and releasing an authored artifact still needs
Council. The agent package imports no socket/DNS module — a test scans its
imports (S7).

17 new tests (191 total green). Frozen files untouched (git diff proof);
K18 AST scan clean.

## Phase 6 — Chia-family body (verifier body only)

Replaced the farm plot-proof *verification body* with a real-enough,
deterministic local Proof-of-Space verifier, and added the Chia-family body
fields to a node-level SlotHeader. Additive: `verify_plot_proof(proof,
commitment)` keeps its signature (call-site test), the lottery math is
untouched (equal units still elect identical leaders), and nothing in the
kernel, admission, Council, Hearth, or the agent silo/hat layer changed.

- `chronarch_farm.pospace`: `ProofOfSpace` + `verify_pospace` (quality =
  SHA256(domain‖plot_id‖challenge‖proof_bytes); valid iff quality <
  `difficulty_from_space_units`), stable error codes, deterministic nonce
  walk. Plus a typed `VDFRecord` with an integrity-only stub check.
- `chronarch_node.slotheader`: a research-fork SlotHeader
  (`plot_commitment_hash, pospace_challenge, pospace_quality/pospace,
  vdf_placeholder`) attached by the leader; a follower rejects the slot if
  the ProofOfSpace fails or the plot commitment is missing. The SlotHeader
  is separate from the frozen kernel `Header`.

### Rejected (kept rejected, now Phase-6-specific)

- **Plots as a database** — still no. A plot proves space; the SlotHeader
  carries a commitment *hash*, never rings/weights/vectors, and no ring goes
  inside a `.plot`.
- **Vendoring chia-blockchain** — no. No submodule, no CHIP-48, no mainnet
  compatibility claim. This is a local stand-in, documented as such
  ([PHASE6_POST.md](PHASE6_POST.md)); real Chia tables + real VDF are a
  Phase-7 non-goal.
- **VDF-as-consensus** — no. The VDF is a typed stub record and the
  `vdf_placeholder` is ignored by the lottery (tested: same winners with and
  without it). The VDF does not vote; slot time is not wall-clock.
- **Stake-in-draw** — no. The election stays space-weighted and
  prestress-gated; PoSpace is a per-slot gate on the already-elected leader,
  adding no weight (G2/G10).

13 new tests (204 total green). Frozen files untouched (git diff proof);
K18 AST scan clean.

## Phase 7 — Chia-family time and infusion (research fork)

Wraps the Phase-6 local PoSpace stand-in (still the default backend) with an
infused challenge chain, a plot filter, and a sequential-time VDF, plus an
optional real-tables backend seam. Additive: the lottery is untouched
(equal units still elect identical leaders), and `verify_plot_proof` /
`verify_pospace` signatures are unchanged.

- `chronarch_farm.infusion`: `infuse_challenge` (slot n challenge =
  SHA256(domain‖prev_quality‖prev_challenge‖slot)), `genesis_challenge` for
  slot 0, `plot_filter_ok` (>= `FILTER_PREFIX_BITS` leading zero bits, fail
  closed), and a `SequentialVDF` (H∘H∘…∘H, pinned iteration bound).
- `chronarch_farm.pospace.make_pospace` gained an additive
  `filter_prefix_bits` param (default 0 = Phase-6 behavior).
- `chronarch_farm.chiapos_backend`: `active_backend()` returns the Phase-6
  stand-in unless `CHRONARCH_CHIAPOS=1` AND `chiapos` imports; a pip extra,
  never a CI dependency; chiapos tests use `pytest.importorskip`.
- `chronarch_node.slotheader`: SlotHeader += `infused_challenge`,
  `prev_quality`, `plot_filter_ok`, and a SequentialVDF `vdf`. Followers
  recompute the infusion against their own predecessor and reject a mismatch,
  a filter failure, a bad ProofOfSpace, or a bad VDF. The node keeps the full
  slot-header chain.

### Rejected (kept rejected)

- **Chia submodule / vendored tree** — no. Optional `chiapos` pip extra only;
  no git submodule, no multi-hundred-MB vendor.
- **VDF-as-vote** — no. The SequentialVDF is a required header artifact but
  never changes the elected leader (tested: identical winners with/without
  it). It does not vote.
- **Wall-clock slots** — no. Slots stay discrete; the VDF proves sequential
  work, not elapsed time.
- **Stake-in-draw** — no. The election stays space-weighted +
  prestress-gated; infusion/filter/VDF are per-slot gates on the
  already-elected leader (G2/G10).
- **Plots-as-DB** — still no. A plot stores space proofs only.

14 new tests + 1 chiapos test skipped without the extra (218 total green,
204 pre-existing still pass with zero extra deps). Frozen files untouched
(git diff proof); K18 AST scan clean.

## Phase 8 — research-grade proof-of-time + CHIP-48-shaped fields

Adds a test-group Wesolowski VDF, CHIP-48-shaped header field names (layout
only), and a VDF time chain. Additive: the lottery is untouched (equal units
still elect identical leaders), the SequentialVDF stays the default header
time check, and the frozen signatures/backends are unchanged.

- `chronarch_farm.wesolowski`: a genuine Wesolowski `prove`/`verify`
  (y = x^(2^T); pi = x^q, q = 2^T // l, l = hash-to-prime; verify
  pi^l·x^r ≡ y) over a **tiny documented prime modulus** (Mersenne 2^127−1,
  group_id `prime-mod-mersenne127`) — NOT 2048-bit RSA, NOT a class group.
- SlotHeader += `wesolowski_proof` (OPTIONAL; absent = still valid),
  `plot_filter_bits`, `quality_string`, `extra_delta` (uint, inert),
  `prev_vdf_output`. The SequentialVDF input now commits to the previous
  slot's VDF output (time chain); followers recompute and reject a mismatch.
- Docs: specs/PHASE8_POST.md (real test-group Wesolowski verify vs CHIP-48
  naming vs Phase-9 non-goals); notes added to PHASE7/6.

### Rejected (kept rejected)

- **VDF-as-vote** — no. Wesolowski, the SequentialVDF, and `extra_delta` are
  header artifacts; none changes the elected leader (tested: identical winners
  with/without them).
- **Wall-clock slots** — no. The time chain links VDF outputs across discrete
  slots; there is still no wall clock.
- **Stake-in-draw** — no. Election stays space-weighted + prestress-gated.
- **Chia submodule / vendored tree** — no. `chiapos` optional pip extra only.
- **"We are CHIP-48 compatible"** — no. The field names *rhyme* with CHIP-48 /
  PoST 2.0 research notes; this is not a CHIP-48 implementation and claims no
  Chia mainnet compatibility. The Wesolowski group is a toy stand-in.
- **Plots-as-DB** — still no.

16 new tests (233 total; 217 pre-existing still pass, 1 chiapos skipped).
Frozen files untouched (git diff proof); K18 AST scan clean.

## Phase 9 — Chronarch-native farm/time body (names + façade)

Makes the space/time body Chronarch's own. Additive: no lottery math, no
difficulty/infusion byte changes, no frozen-signature changes.

- `specs/CHRONARCH_POST.md`: canonical primitives in our names — SpaceSeal
  (PlotCommitment), SpaceProof (ProofOfSpace), Pulse (infused challenge
  chain), Filter (quality prefix bits), TimeSeal (SequentialVDF), TimeProof
  (optional Wesolowski), `extra_weight` (lottery-inert). The law in one
  paragraph.
- `chronarch_farm.post`: a thin farmer-facing façade — make/verify space
  seal, space proof, pulse, time seal, time proof — composing the frozen
  pospace / infusion / wesolowski internals. No new lottery math.
- SlotHeader canonical field rename: `plot_filter_bits → filter_bits`,
  `extra_delta → extra_weight`, `wesolowski_proof → time_proof`. The
  deprecated **kwargs** (`extra_delta=`, `with_wesolowski=`) still work as
  aliases; the emitted header carries only canonical names.
- Docs scrubbed: PHASE6/7/8 point at CHRONARCH_POST.md for canonical names;
  ATTRIBUTION credits Chia for the concept and states Chronarch owns the
  objects and **does not implement CHIP-48**. A test greps specs/README and
  fails on any positive CHIP-48 / PoST 2.0 / Chia-mainnet compatibility claim.

### Rejected (kept rejected)

- **Chia submodule / vendored tree** — no. Optional `chiapos` pip extra only.
- **"CHIP-48 / mainnet compatible"** — no. Chia inspired the body; Chronarch
  owns the objects and implements no CHIP-48; no mainnet/testnet peering. A
  grep test guards the claim.
- **Plots-as-DB** — still no. A SpaceSeal stores space proofs only.
- **VDF-as-vote** — still no. TimeSeal/TimeProof/`extra_weight` are inert to
  the lottery.

10 new tests (243 total; 233 pre-existing still pass, 1 chiapos skipped).
Frozen files untouched (git diff proof); K18 AST scan clean.

## Phase 10 — on-disk SpaceSeal files (.cseal) + farmer CLI

Chronarch's OWN on-disk space format. Additive: no lottery/difficulty/
infusion/frozen-signature changes.

- `chronarch_farm.spacefile`: the `.cseal` format — 4-byte magic `CSL1`, a
  4-byte big-endian header length, a canonical-codec SpaceSeal header
  (`plot_id, k_size, space_units, farmer_id, cas_root, index`), and a
  reserved zero body of `file_body_bytes(space_units)` (one TEST unit =
  4096 bytes). `write_space_seal` / `read_space_seal` / `inspect_space_seal`
  / `prove_from_file`. Reading rejects bad magic, a bad/oversized/forbidden-key
  header (K18 + plot_id recompute), a wrong file size (short body OR appended
  payload), and any non-zero body byte (stuffed rings/jsonl/blobs).
- Proving loads the file → SpaceSeal → the frozen `make_pospace`; an optional
  `cas_root` is a commitment only (a missing CAS object never invalidates the
  file).
- CLI: `chronarch farm init|inspect|prove`, JSON out. No farm verb writes
  rings into a file.
- Docs: specs/SPACEFILE.md; pointers from CHRONARCH_POST.md and DUAL_FARM.md.

### Rejected (kept rejected)

- **Plots-as-DB** — no, with teeth: a `.cseal` body is reserved zeros and the
  reader rejects any non-zero byte, any appended payload, and any ring/jsonl
  stuffed after the header. A `.cseal` stores space, never memory.
- **Chia plot format** — no. `.cseal` is Chronarch's own layout; not a Chia
  plot, not chiapos, not CHIP-48.
- **k32 in CI** — no. Only the TEST size class (1 unit, 4096-byte body) is
  written in tests; no real gigabyte plots.

17 new tests (261 total; 244 pre-existing still pass, 1 chiapos skipped).
Frozen files untouched (git diff proof); K18 AST scan clean.

## Phase 11 — node farms from a .cseal space file

A node boots from an on-disk SpaceSeal (`.cseal`) or from abstract units.
Additive: no lottery/difficulty/frozen-signature changes; abstract units stay
valid for any node/test that passes no file.

- `Node(identity, space_path=..., space_seal=...)`: reads/validates the file,
  derives the SpaceSeal + `space_units`, and registers those units with the
  existing lottery. The file is the source of truth; if abstract units are
  also passed they must match, else **`SPACE_UNITS_MISMATCH`**. A missing/bad
  file raises `NodeError` and the process does not farm.
- `produce_slot` uses the file-backed SpaceSeal for the PlotCommitment /
  SpaceProof; followers reject a bad proof/Pulse as before. `Node.verify_space()`
  re-reads the file; the slot loop calls it before `produce_slot`, so a file
  that went invalid mid-run means the node **skips leadership this slot**
  rather than crashing or forging a proof.
- `Cluster(space_seals=..., space_paths=...)`: one file-backed node per file;
  a fleet of `.cseal` files elects the same winners as abstract units of the
  same integers.
- CLI: `chronarch serve --space path.cseal` (a `.cseal` path when it ends in
  `.cseal`, else integer units); `chronarch cluster --space-dir DIR`. Bad/
  missing file → JSON `BAD_SPACE`. specs/FARMER.md; pointers from SPACEFILE.md
  and CHRONARCH_POST.md.

### Rejected (kept rejected)

- **Silent unit override** — no. A file and mismatching abstract units fail
  loudly (`SPACE_UNITS_MISMATCH`); the node never quietly farms different
  space than the operator declared.
- **Rings-in-file** — still no. The node reads only the SpaceSeal header; the
  `.cseal` body is reserved zeros (Phase 10), and a stuffed file is rejected
  at read time, so it never farms.
- **chiapos** — not wired; that stays a separate opt-in task.

17 new tests (278 total; 261 pre-existing still pass, 1 chiapos skipped).
Frozen files untouched (git diff proof); K18 AST scan clean.

## Phase 12 — on-disk CAS pin lane bound to SpaceSeal.cas_root

An on-disk pin store (the CAS lane on disk), bound to a farmer's SpaceSeal by
the `cas_root` commitment. Additive: no lottery/space-proof/frozen changes.

- `chronarch_core.PinStore(dir)`: `put(bytes, kind="object"|"opaque") -> hash`
  (K18-screens any bytes that parse as a consensus object — a forbidden object
  cannot be smuggled in even as opaque), `get -> bytes|None`, `verify`,
  `pins`, `cas_root`, `withhold`. `pinset_root(hashes) = chash("CasRoot",
  {"pins": sorted})` — a domain-separated sorted-list hash matching the frozen
  `cas_root_of`, so a PinStore binds to the SpaceSeal it commits to.
- `chronarch_farm.verify_pins(space_seal, pin_store, slot=)`:
  `PINS_OK` / `PIN_MISMATCH` (tampered object) / `PIN_MISSING` (withheld pin).
  A failure emits an **I3 RestrictionState** (nervous) and never invalidates
  the `.cseal`, never changes lottery winners, never slashes space.
- `Node(..., pin_dir=)`: optional; `health()` gains a `pins` block. Withholding
  a pin after boot → next health is `PIN_MISSING` + I3; the node keeps running
  and keeps farming space.
- CLI: `chronarch pins put|get|verify` (the group is `pins`; `pin` is already a
  node-RPC verb). specs/PINS.md; pointers from DUAL_FARM.md, SPACEFILE.md,
  FARMER.md.

### Rejected (kept rejected)

- **CAS inside a .cseal body** — no. The pin lane is a separate directory; a
  `.cseal` body is reserved zeros and never holds blobs; the Timechain is not
  a hidden plot in the pin dir.
- **Pin failure slashing space** — no. A withheld/tampered pin is an I3
  nervous event only; the space proof and the `.cseal` are untouched.
- **Pin failure flipping the lottery** — no. The pin lane is never consulted
  by the space-weighted draw (tested: identical winners present vs withheld).

22 new tests (300 total; 278 pre-existing still pass, 1 chiapos skipped).
Frozen files untouched (git diff proof); K18 AST scan clean.

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
