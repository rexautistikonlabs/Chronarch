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

## Phase 13 — durable node home + resume

A stopped node comes back as the **same organism**. `Node(..., home=DIR)` (CLI
`--home`) persists identity, farmed space, the pin lane, and the ledger; a node
with no home stays fully in-memory (tests stay fast). specs/HOME.md documents
the layout; pointers from FARMER.md and PINS.md.

- **Layout** (`chronarch_node.home.NodeHome`): `home/identity`,
  `home/space_units`, `home/space.cseal` (file-backed only — a byte copy),
  `home/pins/` (PinStore), `home/ledger/log.jsonl` (append-only sealed rings +
  block headers + slot headers) + `home/ledger/head.json` (the O(1) resume
  commitment), `home/boot.json` (the BootReport verbatim — **no extra keys**).
- **Persist**: after `produce_slot` and after applying gossip, every new ring /
  header / slot header is appended to the log and `head.json` is refreshed.
  In-memory nodes no-op, so nothing slows down.
- **Resume**: on an existing home the home is authoritative — identity loaded,
  `.cseal` reopened (or abstract `space_units` recovered), pin lane reopened,
  ledger replayed through the frozen Timechain (Ring 0 rebuilt from the current
  kernel; each stored ring re-sealed and hash-checked; O(1) `head.json`
  commitment checked last). An abstract home node mirrors its boot CAS onto
  `home/pins/` so it honors its own `cas_root`; a file-backed node's pin lane
  stays operator-managed.
- **Fail closed**: a truncated / corrupt log line, a hash-broken ring, or a
  `head.json` that disagrees with the replayed rings all raise `HomeError` and
  the node does not resume. A kernel / Ring 0 hash that drifts from `boot.json`
  is **`HOME_KERNEL_MISMATCH`** (and a genuinely different-kernel home also
  fails on the first ring's prev-link). Scars are carried forward, never wiped.
- **CLI**: `chronarch serve --home DIR [--space ...]` (space optional on an
  existing home) and `chronarch home inspect --home DIR` → `{identity, height,
  pins_ok, space_units}` (BAD_HOME on an uninitialized dir, which it never
  creates).

### Rejected (kept rejected)

- **Ledger inside a .cseal** — no. The ledger is JSONL node state under
  `home/ledger/`; a `.cseal` body stays reserved zeros and never holds rings
  (`log.jsonl` starts with JSON, never the `CSL1` magic). "Plots as a database"
  stays a category error.
- **Silent kernel drift on resume** — no. A home whose recorded kernel / Ring 0
  hash differs from the booting kernel is `HOME_KERNEL_MISMATCH`, never a quiet
  re-genesis onto a new kernel.
- **Wiping scars on resume** — no. Replay carries the sealed chain forward
  exactly (G5); resume never prunes history.
- **Rewards / chiapos here** — no. Reward issuance (Phase 14) and real
  plot/VDF backends stay out of scope.

16 new tests (316 total; 300 pre-existing still pass, 1 chiapos skipped).
Frozen files untouched (git diff proof); K18 AST scan clean.

## Phase 14 — Chronos issuance for space, pins, and compute

Chronos is **blood, not conscience** (G2). A flat per-winning-slot emission
credits real accounts for space, pins, and compute — and pays nothing for
judgment. specs/REWARDS.md; pointer from TOKEN.md §4. The existing
`chronarch_core.rewards` was **extended** (no second token): the abstract K12
`REWARD_ROUTER_BPS` + halving `route_slot_reward`/`slot_issuance_chronons` are
unchanged; Phase 14 adds `reward_slot` beside them.

- **Emission** (new constants in `chronarch_spec.constants`, NOT in the kernel
  manifest — genesis hashes unchanged): `SLOT_REWARD_CHRONONS = 64` chronos
  splits into `SPACE_SHARE=40` (leader), `PIN_SHARE=12` (pin-ok farmers),
  `COMPUTE_SHARE=8` (attested receipts), `TREASURY_SHARE=4` (sink). Integers
  only; a kernel-adjacent assert pins the sum.
- **Router** `reward_slot(slot, leader_id, pin_ok_ids=[], compute_receipts=[])
  -> list[Credit]`, `Credit={account, amount, reason∈{space,pin,compute,
  treasury}, slot}`. SPACE always to the leader; PIN split across pin-ok
  farmers (0 to any farmer when pins_ok is false); COMPUTE split across
  receipts' workers; unpaid pin/compute shares and floor-division dust fold
  into `chronos:treasury` (a sink, not a key), so every slot mints exactly
  SLOT_REWARD. `Credit(reason="ballot_yes")` is rejected outright.
- **Documented choice**: a slot with no compute receipt sends COMPUTE to the
  treasury (never left unissued).
- **Node/home ledger**: `produce_slot` credits the won slot into
  `node.reward_credits`; a home node also appends to `home/rewards.jsonl` and
  reloads it on resume. `submit_compute_receipt` buffers an attested receipt
  for the next won slot. The reward ledger is never gossiped, never sealed into
  the Timechain, and never replayed through the frozen chain (the economic ring
  body carries no credit list).
- **CLI**: `chronarch rewards inspect --home DIR` → `{totals, last_slot,
  credits}` (reads rewards.jsonl directly; BAD_HOME on an uninitialized dir).

### Rejected (kept rejected)

- **Chronos-for-Challenge** — no. `judge_challenge(challenge, replay, attestors)`
  has nowhere to put Chronos; a `chronos=`/`reward=` kwarg is a TypeError
  (tested). A reward can never flip a Challenge outcome (G2/G10).
- **Chronos-for-Ballot** — no. Ballot legality is unchanged; no reward reason
  names a vote, and `Credit(reason="ballot_yes")` is rejected. Rewards never
  enter vote weight or salience (Hearth position unchanged after a credit —
  tested), and never change lottery winners (tested).
- **Pin-fail-still-paid** — no. A pin-failing farmer is never in `pin_ok_ids`,
  so it earns SPACE but no PIN; the unpaid pin share folds to treasury.
- **Float emission** — no. Every share and split is integer chronons; dust to
  the sink, so nothing is minted or lost.
- **AMM / Hearth split change / chiapos / Council features / paying the
  prevention modality** — all out of scope.

23 new tests (339 total; 316 pre-existing still pass, 1 chiapos skipped).
Frozen files untouched (git diff proof on frozen paths); K18 AST scan clean.

## Phase 15 — attested compute receipts

COMPUTE_SHARE is paid only for a DummyMind or Immune Gym job that verifies.
specs/COMPUTE.md; pointer from REWARDS.md. New module
`chronarch_core.compute`; schemas.py, reward_slot, and the gym oracle are all
untouched (reused, not forked).

- **ComputeReceipt** (closed schema, validated locally like
  `verify_plot_commitment` — schemas.py is frozen):
  `{worker, job_kind, job_id, input_hash, output_hash, evidence_refs, slot?}`.
  K18-screened; any key outside the set is rejected (so no chronos/vote/seat/
  activate_faculty field can appear); `job_kind` ∉ {dummymind, gym} is refused.
- **attest_compute(receipt, node_or_fixture) -> {ok, code}**. DummyMind: job_id
  must be a LIVE-registry faculty; the input is fetched from the node CAS by
  input_hash and replayed via the frozen `run_faculty`; the recomputed
  `chash("ComputeOutput", output)` must equal output_hash. Gym: the named case
  runs in an ISOLATED Chronarch fixture (throwaway boot — its own chain/CAS/
  registry/Hearth, so attestation never mutates the attesting node) via
  `chronarch_gym.run_case`; the oracle must pass and the verdict must hash to
  output_hash. Never raises on a bad receipt — unverifiable → COMPUTE_UNATTESTED.
- **Foreign gym target → GYM_TARGET_FOREIGN, no receipt** — refused at build
  time by `make_compute_receipt` (the only sanctioned, backdoor-free builder;
  it does the work honestly and returns a receipt that re-verifies).
- **Node**: `submit_compute_receipt` MUST call `attest_compute`; unattested →
  NodeError, not buffered; attested → buffered until a win, then `reward_slot`
  credits the worker (no attested receipt → COMPUTE folds to treasury, Phase 14
  rule unchanged). The Phase-14 hand-built-receipt test now routes through
  `make_compute_receipt` (a genuine DummyMind attestation, not a backdoor flag).
- **CLI**: `chronarch compute submit --home DIR --job-kind dummymind|gym
  --job-id ID [--input HEX] [--worker W]` → JSON ok / COMPUTE_UNATTESTED /
  GYM_TARGET_FOREIGN / BAD_HOME.

### Rejected (kept rejected)

- **Pay-LLM** — no. An LLM draft is a string, not a live-registry faculty
  output; its hash never matches a faculty replay, and `job_kind="llm"` is not
  a payable kind. (Tested: a draft-shaped receipt is UNATTESTED.)
- **Pay-hats** — no. A `hat_run` black-catalog / `prevention_catalog` output is
  inert/non-executable and has no payable `job_kind`. The prevention modality
  is not paid.
- **Pay-unattested** — no. `submit_compute_receipt` gates on `attest_compute`;
  a receipt that does not replay/verify is rejected and never buffered.
- **Chronos-for-Challenge** — no. `judge_challenge` still takes no chronos
  parameter (a `chronos=` kwarg is a TypeError — tested); attestation never
  touches Challenge or Ballot legality.

29 new tests (368 total; 339 pre-existing still pass, 1 chiapos skipped).
Frozen files untouched (git diff proof on frozen paths); K18 AST scan clean.

## Phase 16 — the organism pulse

One command runs the whole organism on a home: farm a slot, check pins, attest
a DummyMind compute job, credit Chronos, and report. specs/PULSE.md; README
"Run a pulse"; pointers from HOME.md and REWARDS.md. New module
`chronarch_node.pulse` + CLI `pulse` verb + `python -m chronarch_cli`
entrypoint; everything else is reused (lottery, verify_pins, attest_compute,
reward_slot all unchanged).

- **`pulse(home, *, space_path=None, slots=3, identity="chronarch-pulse")`**:
  open/init the home (abstract TEST units with no `.cseal`; a file's farmer_id
  names a fresh organism), self-bond the node's own Hearth position, refresh
  the gym cadence with a self-challenge, then for each slot attest+submit a
  DummyMind receipt (a live seed faculty replayed on a CAS input) and
  produce_slot. Returns `{identity, height, won_slots, credits_by_reason,
  pins_ok, i3, head_hash}`. Deterministic — no wall clock, no randomness beyond
  the lottery. verify_pins/I3 is reported but never aborts the pulse.
- On resume, `--space` that disagrees with what the home recorded is
  **SPACE_UNITS_MISMATCH** (the home stays authoritative for space).
- **CLI**: `chronarch pulse --home DIR [--space path.cseal] [--slots N]` → JSON;
  error codes BAD_HOME / SPACE_UNITS_MISMATCH / BAD_SPACE / COMPUTE_UNATTESTED.

### Rejected (kept rejected)

- **Pulse-as-admin** — no. The pulse self-bonds its OWN Hearth position and
  drives only frozen machinery; there is no admin key, founder key, or helm
  override, and no privileged verb.
- **Pulse-self-enact** — no. It never registers a live faculty and never
  submits a proposal (tested: the registry holds only seed faculties and the
  ledger carries only economic rings). Upgrades stay Proposal + Ballot (G4/G15).
- **Credits-on-chain** — no. Credits go to home/rewards.jsonl only; the
  consensus log carries no `reason`/credit entry (tested). Chronos is never
  sealed into the Timechain.

13 new tests (381 total; 368 pre-existing still pass, 1 chiapos skipped).
Frozen files untouched (git diff proof on frozen paths); K18 AST scan clean.

## Phase 17 — two-home local net

Two (or N) durable homes gossip slots on the existing in-process bus and
converge on one head. Still not a public network — one process, N home dirs,
the InProcessBus. specs/NET.md; pointer from PULSE.md. New module
`chronarch_node.net` + CLI `net` verb; composes what exists (frozen
`slot_leader`, the Cluster gossip pattern, `Node(home=)`, attested DummyMind
receipts) and rewrites none of it.

- **`net_run(homes, slots=6)`**: plan each home (fresh → distinct identity
  `net-node-i` + distinct abstract units; existing → identity + units recovered
  from the home), share one HearthState/CouncilState/InProcessBus, self-bond and
  refresh each node's cadence, then run `slots` rounds — `slot_leader` elects a
  leader, the leader attests a DummyMind job and `produce_slot` seals + gossips,
  followers re-seal identically. Each home persists its own ledger + rewards.
  Returns `{homes:[{identity, height, won_slots, credits_by_reason, head_hash}],
  leaders, converged}`; `converged` = every home has the same head_hash AND
  height. Deterministic (only the lottery is stochastic, and it is deterministic
  per slot+table).
- **Resume**: a second net_run on the same dirs recovers identities/units and
  continues from the persisted height; a drifted kernel is still
  HOME_KERNEL_MISMATCH (fail-closed). Validating a net home in isolation needs
  the peer space table (the validator set) to replay peer-led slot headers —
  normal, and net_run supplies it.
- **CLI**: `chronarch net --homes DIR1,DIR2 [--slots N]` → JSON; codes BAD_HOME
  / SPACE_UNITS_MISMATCH / HOME_KERNEL_MISMATCH; exits non-zero if not converged.
- The single-home `pulse()` is untouched (net composes the same primitives).

### Rejected (kept rejected)

- **Public-mainnet** — no. In-process bus only; no TCP discovery, no internet.
  (The frozen TcpTransport speaks the same envelope as a later opt-in; tests
  stay on the in-process bus.)
- **Pulse-as-admin** — no. Each node self-bonds its OWN Hearth position and
  drives only frozen machinery; no key, no override, no privileged verb, no
  live-faculty registration, no proposal (upgrades stay Proposal + Ballot).
- **Credits-on-chain** — no. Credits go to each home's rewards.jsonl; the
  consensus log carries only economic rings (tested). SPACE credits land only
  in the actual leader's home; followers issue none.

13 new tests (394 total; 381 pre-existing still pass, 1 chiapos skipped).
Frozen files untouched (git diff proof on frozen paths); K18 AST scan clean.

## Phase 18 — persist the peer/space table

A net home now records its fleet in `home/peers.json`, so a bare
`Node(home=DIR)` resumes a net-produced ledger — one with peer-led slots —
without a conductor passing the space table in. specs/PEERS.md; pointers from
NET.md and HOME.md. New module `chronarch_node.peers` + a peers file in
NodeHome; `net_run` writes it; the lottery and slot-header verify read it. The
lottery math, HOME fail-closed replay, and the `net_run`/`pulse` observable JSON
keys are all unchanged (net_status adds new keys only).

- **peers.json** — a canonical list of `{identity, space_units}` sorted by
  identity: a closed schema (exact keys), K18-screened, integer units only,
  distinct identities. Every home in a fleet writes byte-for-byte identical
  bytes (`peers_bytes` = canonical_bytes of the sorted list).
- **Node(home=DIR)** without an explicit `space_table` adopts peers.json as its
  fleet BEFORE ledger replay (so peer-led slot headers verify). Fail closed as
  **PEERS_MISMATCH** when the home's own identity/units are absent or disagree,
  or the file is corrupt/schema-invalid.
- **net_run** always writes/refreshes peers.json on every home from the planned
  fleet; an existing peers.json that disagrees with the plan is PEERS_MISMATCH
  (no silent rewrite — the tampered file is left untouched).
- **CLI**: `chronarch net status --homes DIR1,DIR2` → JSON per home {identity,
  height, head_hash, peer_count, peers_ok} (read-only; boots no node). `net run`
  gains the PEERS_MISMATCH error code. `chronarch net --homes ...` (no
  subcommand) still runs the net.

### Rejected (kept rejected)

- **Silent peer rewrite** — no. net_run refuses to overwrite a peers.json that
  disagrees with the planned fleet, and a bare resume refuses a peers file that
  disagrees with the home's own identity/units (tested; the tampered file stays
  as-is).
- **Admin peer key** — no. peers.json is a closed `{identity, space_units}`
  schema; a forbidden key (admin_key & kin, a chronos/vote field) is rejected.
  No entry grants authority — the fleet is lottery weights, nothing more.
- **Public discovery** — no. The file lists a fleet the operators already
  agreed on; nothing is discovered over a network. Still in-process bus only.

18 new tests (412 total; 394 pre-existing still pass, 1 chiapos skipped).
Frozen files untouched (git diff proof on frozen paths); K18 AST scan clean.

## Phase 19 — a peer-set change is a proposal ring plus a vote

After genesis, the net fleet changes only through the Council: a Proposal ring
plus a slashing-backed ballot (G14), never an admin key and never an AI
self-enact. specs/PEERS.md gains "join is a vote". PeerChange logic in
chronarch_node.peers + net.ratify_peer_change + a `make_peer_grant` bridge on
the Council machine.

- **PeerChange body** (closed schema, K18): `{kind: peer_add|peer_remove,
  identity, space_units}`, integer units. It rides in a Council Proposal's
  free-form `changes` under `peer_change`, as an **M6** membership change — an
  EXISTING major class, so the kernel manifest / genesis hashes are unchanged (a
  new major class would alter K14 and re-hash genesis).
- **Ratification** — `CouncilState.make_peer_grant(proposal_id, at_slot=)`
  mirrors the M3 `make_activation_grant`: the peer body comes from Council
  storage (a forged proposal cannot reach it), gated on an `approved` outcome
  and the activation height. `net.ratify_peer_change(homes, council,
  proposal_id, at_slot=)` applies the add/remove to `home/peers.json` on every
  established member (identical bytes); the lottery then weighs the new fleet.
  An ILLEGAL peer change is caught in the existing `tally` (`check_legality`):
  outcome `invalid`, every yes-voter slashed, an I8 scar sealed (G16). Chronarch
  has no peer-apply verb — it can draft but never activate a PeerChange.
- **net_run** — already refuses to add an unknown home (the planned fleet
  disagrees with an existing peers.json → PEERS_MISMATCH); genesis first-run
  (no peers.json) still writes the initial lab-net fleet. After a ratified add,
  running the old home set now disagrees with the grown peers.json → the fleet
  really changed.
- **CLI** — `chronarch peers propose --home DIR --kind peer_add|peer_remove
  --identity ID --units N` → `{proposal_id, status: MAJOR_NEEDS_COUNCIL, …}` or
  PEERS_MISMATCH / BAD_HOME. It drafts + validates only; the ballot runs on the
  Council machine API (+ tests) and net.ratify_peer_change.

### Rejected (kept rejected)

- **Silent peer rewrite** — no. peers.json changes only via a ratified
  PeerChange or the genesis first-run; net_run refuses to overwrite a
  disagreeing file, and ratification without a passed ballot leaves it unchanged
  (tested).
- **Helm adds a validator** — no. Adding/removing a peer is M6, a Proposal +
  slashing-backed ballot at ≥2/3 weight and a seat majority; there is no admin
  key, no helm, no privileged verb that mutates the fleet.
- **AI rewrite of peers** — no. Chronarch may draft a PeerChange (inert) but has
  no verb that writes peers.json; an un-balloted / rejected / illegal proposal
  never applies, and an illegal one slashes its yes-voters and scars at I8.

18 new tests (430 total; 412 pre-existing still pass, 1 chiapos skipped).
Frozen genesis hashes unchanged; K18 AST scan clean. (machine.py extended with
make_peer_grant — a new proposal-kind bridge, no admin key, no self-enact.)

## Phase 20 — Council operator CLI (cast, tally, status)

An operator drives the Council from the CLI; the voting state persists in
`home/council.json` so ballots survive process exit. G14 is untouched — the CLI
only CALLS the frozen Council machine (submit_proposal / attach_reports /
cast_ballot / tally / make_peer_grant), never rewriting the lien/slash/tally
math. specs/COUNCIL.md §10 "Operator CLI". New module
`chronarch_node.council_home`; CouncilState extended with export_state /
import_state (additive serialization, no math change).

- **home/council.json** — a closed schema `{version, proposals, results,
  slash_log}`, K18-screened, floats banned; a corrupt/tampered file fails
  closed. Council is JSON node state — NEVER put inside a `.cseal` (the file
  starts with JSON, never CSL1). The fleet in peers.json is the steward set:
  bonds, durable slashes, and open ballot liens are reconstructed each session
  from the fleet + the persisted slash log; only the voting state is stored.
- **council_home**: `load_council`/`save_council`, and `council_propose`
  (submit + open voting), `council_cast` (the REAL cast_ballot path — weight,
  eligibility snapshot, lien, double-vote slash persisted), `council_tally`
  (the frozen tally(); illegal → invalid + slash + I8, no ratify; approved
  peer change → ratify_peer_change when `homes_to_ratify` given, else
  needs_ratify), `council_status` (read-only).
- **CLI**: `chronarch council status|ballot|tally --home DIR …` (+ `peers
  propose` now submits + persists). Codes MAJOR_NEEDS_COUNCIL, PEERS_MISMATCH,
  BAD_HOME, COUNCIL_UNAVAILABLE, plus existing Council errors.
- **Agent still cannot self-enact**: the tool surface keeps `propose`/`ballot`
  but has no `tally` or `execute_upgrade` (execute_upgrade stays FORBIDDEN).

### Rejected (kept rejected)

- **Admin tally key** — no. Tally runs the frozen tally() with the real turnout
  + weight + seat thresholds and slashing; there is no key that ratifies, and
  the CLI cannot approve what the ballots did not.
- **Agent auto-tally** — no. `tally`/`activate` are not in the agent's
  ALLOWED_VERBS; the agent may propose and ballot (a bonded steward votes) but
  can never tally or self-enact (tested).
- **Council-in-cseal** — no. Council persists as home/council.json (JSON), never
  inside a `.cseal`; a `.cseal` body stays reserved zeros.

17 new tests (447 total; 430 pre-existing still pass, 1 chiapos skipped).
Frozen genesis hashes unchanged; G14 verbatim; K18 AST scan clean. (machine.py
extended with export_state/import_state — serialization only, the frozen
lien/slash/tally math and make_peer_grant are untouched.)

## Phase 21 — the operator path is a test, not prose

The whole operator loop is now an executable sequence: pulse a home, stand up a
two-home net, propose a peer-set change, ballot it from each steward, tally +
ratify, read status. No new consensus primitive — this is docs + a test module
driving the existing CLI, nothing more.

- **specs/OPERATOR.md** — numbered `chronarch` commands with the JSON keys each
  returns, stated plainly as a **lab net, not mainnet** (in-process bus, no
  public network, no chiapos, no AMM, no DHT; no CHIP-48 / Chia-mainnet /
  consciousness claims).
- **tests/test_operator_path.py** — drives the same sequence through
  `chronarch_cli.main` and asserts the mechanics: two homes converge; a proposal
  enacts nothing until tallied; a passing ballot ratifies the PeerChange onto
  every home and the lottery sees the new units; the single-home pulse still
  works afterward. The illegal-ratification path is already covered
  (test_council_home / test_peer_change) and is not repeated.
- **README** — a short "Operator path" section pointing at OPERATOR.md, with the
  no-marketing disclaimer.
- Documented gotcha: a pulsed home is already ahead of a fresh peer, so the
  operator path pulses a home of its own and runs the net on fresh homes (a
  pulse-then-net on the SAME home fails SLOT_HEADER_INFUSION_MISMATCH by design).

### Rejected (kept rejected)

- **Marketing claims** — no. OPERATOR.md and the README say lab net, not
  mainnet, and make no CHIP-48 / Chia-mainnet / consciousness claim. The test
  asserts only mechanics that actually run.
- **Skipping the vote** — no. The operator path ratifies a peer change ONLY
  after a real ballot + tally (G14); the test asserts a bare proposal leaves
  peers.json untouched and shows `voting`/`outcome: null` until the fleet votes.

2 new tests (449 total; 447 pre-existing still pass, 1 chiapos skipped). No
consensus code touched (docs + a test module + README); frozen genesis hashes
unchanged; K18 AST scan clean.

## Phase 22 — pin gossip on the local net

A pin object the leader holds is offered to followers on the in-process bus, so
a follower that lacks a committed pin can fetch it. The CAS lane only — no ring,
no header, no lottery — and in-process only (no TCP, no DHT, no public net).
specs/PINS.md gains a "gossip" section.

- **PinOffer** `{kind: "pin_offer", from_id, object_hash, pin_kind, bytes,
  cas_root}` — `Node.make_pin_offers()` offers every object the leader's pin
  lane holds, carrying the object bytes (hex) because there is no DHT to fetch
  from. `net_run` broadcasts the leader's offers after each produced slot.
- **`Node._apply_pin_offer`** puts the object into the follower's PinStore iff
  K18 allows AND the bytes hash to `object_hash`. Fail soft: no pin lane,
  missing/malformed bytes, an integrity mismatch, or a K18-forbidden object all
  DECLINE the offer without crashing; a pin still lacking stays a local
  PIN_MISSING (I3) via verify_pins.
- Gossip HEALS a follower that lacks a committed pin (its I3 clears once the
  leader delivers it). A pin no home serves stays I3.

### Rejected (kept rejected)

- **Pins-inside-.cseal** — no. A pin object is never sealed into the Timechain
  and never put in a `.cseal` body; the ledger log carries only economic rings
  (tested). The CAS lane is a separate PinStore directory.
- **Pin-fail-flips-lottery** — no. A withheld pin is I3 on the retrieval
  interface only. Tested: a net with a pin withheld across the fleet converges
  on the same head_hash AND elects the identical leaders as a clean net over the
  same units.
- **DHT** — no. Offers carry the bytes on the in-process bus; a follower cannot
  fetch a bytes-less advertisement (no discovery, no network). This is not TCP
  and not a public network.

8 new tests (457 total; 449 pre-existing still pass, 1 chiapos skipped). Frozen
consensus math / genesis hashes / lottery / .cseal / attest_compute / council
tally untouched; K18 AST scan clean; agent still has no execute_upgrade /
tally-activate verb.

## Phase 23 — two-process loopback TCP net

The same slot headers, rings, and pin offers the in-process net gossips now also
travel over real TCP sockets as line-JSON (reusing the transport's
`_send_line`/`_recv_line` framing). Two homes on two OS threads (or two CLI
processes) converge on the same rule — same height AND head_hash — and over the
same fleet reach the IDENTICAL head as the in-process net. specs/NET.md gains
"loopback TCP". New module `chronarch_node.tcpnet`; the in-process `net_run` is
unchanged and stays the default.

- **`TcpGossipServer`** — a line-JSON gossip listener bound to a node
  (`127.0.0.1` only). Each accepted connection is a stream of gossip messages
  applied via `node.on_gossip` under a per-node lock. A garbled line (bad JSON,
  non-object) or a rejected gossip (forged/out-of-order) is counted (`garbled`)
  and skipped — never a crash, never a dropped connection, ledger still
  verifies.
- **`TcpPeer`** — a send-only line-JSON connection (lazy connect + reconnect).
  Each node autonomously runs its slot loop (`_node_loop`): elected leader
  produces and sends the slot's gossip + pin offers; a follower waits for its
  listener to apply the slot.
- **`tcp_net_run(homes, slots, garble=?)`** runs both nodes on threads with
  ephemeral ports (what tests use); **`tcp_serve(home, listen, peer, slots)`**
  runs ONE node (the CLI path), reading the fleet from the home's peers.json.
- **CLI**: `chronarch net tcp --home DIR --listen HOST:PORT --peer HOST:PORT
  [--slots N]` → JSON `{identity, listen, peer, height, head_hash, garbled,
  verify}`; a non-loopback `--listen` is `NOT_LOOPBACK`.

### Rejected (kept rejected)

- **Public discovery** — no. The peer address is given explicitly; there is no
  DHT, no discovery, no announce. This is not the internet.
- **Binding 0.0.0.0 as default** — no. The listener binds `127.0.0.1`; a
  non-loopback host (`0.0.0.0`, an external IP) is refused (`NOT_LOOPBACK`,
  tested). Loopback only.
- **chiapos** — no. Space is still the abstract/.cseal lottery; no plot format,
  no VDF, no networked physics.

7 new tests (464 total; 457 pre-existing still pass, 1 chiapos skipped). Frozen
consensus math / genesis hashes / lottery / .cseal / attest_compute / council
tally untouched; the in-process net_run still converges; K18 AST scan clean.

## Lab freeze — lab-v0

A research freeze of a working model. specs/STATUS.md states plainly that
Chronarch lab-v0 is a research organism on an in-process or loopback net — **not
a public blockchain, not Chia mainnet, not CHIP-48, not AGI** — with the
frozen/live table (kernel hashed; Council/Hearth/gym, agent, .cseal+pins+gossip,
home resume + rewards + attested compute, pulse/net/voted-peers/council-CLI,
operator-path-as-a-test, loopback TCP all live; chiapos an optional extra).
README points at STATUS.md and OPERATOR.md.

- **Optional chiapos wrap** — the EXISTING `chiapos_backend.py` seam is extended
  with `verify_pospace_extra`: `verify_pospace` / `verify_space_proof` stay the
  hash stand-in by default (byte-identical, signature unchanged — the additive
  guard still pins `(pospace, space_units)`), and only when `CHRONARCH_CHIAPOS=1`
  AND `chiapos` imports may the extra additionally reject a proof. It never
  changes the lottery inputs, never raises (an unwired backend returns None),
  and its opt-in test uses `pytest.importorskip("chiapos")` so default CI keeps
  skipping. Not vendored, not an interoperability claim (STATUS.md,
  PHASE6_POST.md, CHRONARCH_POST.md each say so in one sentence).

### Rejected (kept rejected)

- **Marketing claims** — no positive "mainnet ready" / "CHIP-48 compatible" /
  "Chia-compatible" language; the CHIP-48 guard and a new STATUS test enforce it.
- **DHT / 0.0.0.0** — unchanged from Phase 22–23: loopback only, no discovery.

Tagged `lab-v0`. 7 new tests (471 total; 464 pre-existing still pass, 2 chiapos
skipped by default). Genesis hashes unchanged; K18 AST scan clean; all frozen
paths untouched.

## Lab freeze — packaging + release hygiene

Make lab-v0 installable from a clean venv and document how a lab tag is cut. No
consensus primitives added — packaging, CI, docs, and one test.

- **Root `pyproject.toml`** — a real editable-installable distribution:
  `[build-system]` setuptools, a `chronarch` **console_script**
  (`chronarch = chronarch_cli.main:main`), `[project.optional-dependencies]`
  `dev = ["pytest>=7"]` (and an OFF-by-default `chiapos` extra), and
  `[tool.setuptools.packages.find]` over every `packages/*/src`. `pip install -e
  ".[dev]"` then exposes all eleven workspace packages and the `chronarch` CLI;
  the no-install conftest workflow still works (the pytest config is preserved).
  Zero third-party RUNTIME deps (G11).
- **CI** — the existing no-install `test` job stays; a new `package` job does
  `pip install -e ".[dev]"` and runs `python -m chronarch_cli pulse --home
  $RUNNER_TEMP/solo --slots 1` (and the `chronarch` entry point) to prove the
  clean-venv path.
- **docs/RELEASE.md** — how to cut a lab tag (pre-tag checklist, `git tag -a`,
  the frozen surface that never changes without a G14 vote) and what a lab tag
  is NOT.
- **tests/test_packaging_entry.py** — `import chronarch_cli`, the console-script
  target resolves, and the `pulse` helper returns `height >= 0`.

### Rejected (kept rejected)

- **"Production mainnet"** — no. lab-v0 is a research organism on an in-process
  or loopback net; STATUS.md and RELEASE.md say so, and no doc claims a public
  or production network.
- **"Industrial L1 ready"** — no. There is no readiness, throughput, or
  interoperability claim anywhere; a lab tag is a green-test freeze, nothing
  more.

1 new test module (3 tests; 474 total, 2 chiapos skipped by default). Genesis
hashes unchanged; K18 AST scan clean; all frozen paths untouched; no chia
vendored, no external bind.

## Lab excellence — `status` + `memory` verbs, docs/LAB.md

Lab excellence only. Not an L1. The door stays open; nobody walks through it.

**Why.** Pulse worked only after eleven editable installs; specs were files,
not a verb; and the Timechain + home + pins — the organism's persistent memory
— were not exposed as one lab command.

- **One install** — the root `pyproject.toml` (previous entry) already bundles
  all eleven packages (`spec core hearth nervous gym sim farm council node agent
  cli`) with `chronarch = chronarch_cli.main:main`; `tests/test_lab_packaging.py`
  now pins that (pyproject `where` → exactly eleven packages; after a real
  `pip install -e ".[dev]"` the dist's `top_level.txt` names them all; all
  eleven import).
- **`chronarch status`** — STATUS.md's first paragraph + `git describe --tags`
  (null when no checkout). JSON out. It cannot say "mainnet": a status
  paragraph naming it is refused (`STATUS_CLAIM_REFUSED`), never echoed.
- **`chronarch memory --home DIR`** — read-only. Resumes the home through the
  frozen fail-closed replay (Phase 13), re-walks the chain (`verify_full`),
  checks pins, and prints exactly `{identity, height, head_hash, ring_count,
  scar_count, pins_ok, i3, credits_by_reason}`. Rewrites no ring, wipes no scar
  (G5), refreshes no head, credits nothing; a missing home is `BAD_HOME` and is
  never created. Library: `chronarch_node.memory` (new module, additive).
- **CI** — the `package` job now runs `python -m pytest -q` against the
  installed distribution, then `pulse --home $RUNNER_TEMP/solo --slots 1`,
  then `memory --home $RUNNER_TEMP/solo`, then `chronarch status` via the
  console script.
- **docs/LAB.md** — one page: what a lab session is (install, pulse, memory,
  the operator path) and what it is not (a public chain). Pointed to from
  README.md and STATUS.md's reading order.

### Rejected (kept rejected)

- **Production L1** — no. Lab excellence only; no readiness, throughput, or
  interoperability claim anywhere.
- **Token listing** — no. Chronos is a node-local credit ledger — blood, not
  conscience (G2); no market, no listing, no issuance-schedule claim.
- **Public discovery** — no. In-process bus or loopback `127.0.0.1` only; no
  bootstrap peers, no `0.0.0.0`.
- **Wiping scars for "clean memory"** — no. `memory` reads; scars cannot
  vanish (G5) and are retired only by a new ring after review (M7).
- **LLM writes to the Timechain** — no. DummyMind by default; an LLM backend
  reads and proposes, and nothing it emits bypasses admission, K18, or
  Proposal + Ballot (G15).

3 new test modules (18 tests; 492 total, 2 chiapos skipped by default).
Genesis hashes unchanged; K18 AST scan clean; every frozen path untouched (the
only STATUS.md edit is a reading-order pointer — the "not a public blockchain"
sentence is verbatim).

## Lab journal — operator notes beside a home (off-chain)

Lab journal only. Off-chain. Not Timechain. Not L1.

- **`chronarch journal --home DIR append --text "..."` / `list`** — operator
  notes in `home/journal.jsonl`, one canonical JSON line per note
  (`canonical_bytes`: sorted keys, ASCII, floats impossible):
  `{slot_hint, ts_unix_int, text, text_hash}`. Integer time only; `slot_hint`
  defaults to the home's persisted height (read from `head.json`, the only
  thing the journal reads from the home). Library: `chronarch_node.journal`
  (new module, additive) — `journal_append`, `journal_list`, `JournalError`.
- **Off-chain by construction** — appending seals no ring, submits no tx,
  drafts no proposal, pins no object, boots no Node. An AST scan
  (`test_journal.py`) proves the module names no seal / submit_tx / propose /
  PinStore / Node API; a CLI test proves the ledger log is byte-identical and
  `memory` reports the same height, head_hash, ring_count and credits after
  three appends.
- **The K18 screen, reused** — a note that parses as JSON (whole or embedded)
  runs through `screen_keys`, the same forbidden-key screen every consensus
  object gets; a tool-call shape (`name`+`arguments`, `tool_calls`, ...) or a
  Proposal body (`proposal_id`, `major_class`, ...) is `JOURNAL_REJECTED`.
  Prose that merely mentions those words is a note.
- **Fail closed** — a missing home is `BAD_HOME` and is never created; a
  tampered, non-canonical, or non-integer line makes `list` raise
  `BAD_JOURNAL` rather than skip it.
- **docs** — LAB.md §4 (journal is operator notes, not memory, not
  consensus); HOME.md layout + "what the home is not".

### Rejected (kept rejected)

- **A journal ring** — no. Notes are not consensus; nothing an operator types
  is sealed into the Timechain.
- **A journal as memory** — no. Memory is the Timechain + home + pins, read by
  `memory`; the journal is what the operator wrote about it.
- **Float timestamps** — no. Integer seconds; the codec refuses floats.
- **Proposals via the journal** — no. A Proposal body is refused; a proposal
  goes to the Council (`peers propose`, ballot, tally).

2 new test modules (14 tests; 506 total, 2 chiapos skipped by default).
Genesis hashes unchanged; K18 AST scan clean; every frozen path untouched.

## web/ — Lab + consortium landing (static Vite app)

A scientific-instrument UI, not a crypto marketing site. Lives entirely under
`web/`; no Python package touched.

- **State-driven scene.** `ring_count`, `scar_count`, `head_hash`, `pins_ok`/`i3`,
  `peer_count`, `height` seed the rest pose through a hash PRNG (sfc32 over the
  head hash). Same head → same pose; two heads → visibly different poses
  (tested). Timechain = stacked rings, scars = sealed amber rim lesions, pins =
  rods in a well (one raised amber rod only on a real I3), Hearth = tensegrity
  two legs + lock, Council = seats + a proposal that docks only on approved +
  ratified, DummyMind = a sealed box that opens and closes once on an attested
  receipt. No logos, nothing spins.
- **Animation law.** Events are GSAP timelines built with `ONE_SHOT`
  (`repeat: 0`), then the scene is still; `frameloop="demand"` so the GPU idles
  at rest; no per-frame hook anywhere. `prefers-reduced-motion` → no motion.
  Tests grep `web/` for repeating-animation literals (empty) and assert every
  timeline spreads `ONE_SHOT`.
- **STATUS honesty on every page.** Banner + footer + landing above the fold
  say "not a public blockchain"; a banned-phrase screen (`src/lib/banned.ts`)
  runs over the UI's copy, fixtures and README in tests, and over any session
  text before display.
- **Fixtures are literal CLI output.** `web/fixtures/session-opa.json` is the
  operator path captured from `python -m chronarch_cli` (height 4, head
  `ecdbe6b0…`, `peer_count` 3, `peer-peer_add-net-node-2` approved + ratified);
  `session-solo.json` is one pulsed home. The browser spawns nothing and reads
  no filesystem: sessions are fixtures or pasted JSON, parsed fail-closed.
- Routes: `/`, `/lab` (paste JSON → drive the scene; read-only Monaco),
  `/timechain`, `/council`, `/hearth`, `/farm`, `/gym`, `/consortium`,
  `/operator`. Stack: Vite, React 19, R3F + drei, GSAP one-shot, React Aria +
  Tailwind v4, IBM Plex (bundled), Monaco (bundled), Lucide, vitest + Testing
  Library. `web/docs/VISUAL.md` is the doctrine.

### Rejected (kept rejected)

- **Looping hero animation / idle drift** — no. A loop cannot be state-driven,
  and idle motion reads as life the organism does not have. A still
  instrument tells the truth: nothing happened.
- **Wallet button** — no. There is nothing to connect to.
- **Timechain as an NFT gallery** — no. Rings are consensus objects with a
  closed schema, not items to browse or own.
- **Browser-spawned nodes** — no. `web/` is a static viewer of session JSON.
- **An editor on the critical path** — no (fix-up). Monaco's workers failed
  under `vite dev` and, with no error boundary, `/lab` unmounted to black.
  Monaco is removed; the loaded JSON is a `<pre>`; every route, the scene
  canvas and the viewer render inside error boundaries that fail closed to a
  still ivory panel. The lab is an instrument, not an IDE.

## web/ — one lab floor for visitors, a technician room for the rest

The eight-item protocol nav is gone for the default audience. Every protocol
object is kept; a normal person meets it differently.

- **`/` is the lab floor.** Two links in the chrome (*Lab floor*, *Technician*),
  no protocol names. One plain-English STATUS sentence including "not a public
  blockchain". The same instrument scene; two record chips (*Quiet pulse* =
  `session-solo.json`, *The vote* = `session-opa.json`); four benches — Memory,
  Vote, Body, Pulse — a click eases the camera once and opens one card in
  everyday language, then still. Readouts as human nouns (beats, pages
  remembered, marks that stay, files ok, seats at the table); hex and credits
  live only in the technician room. Hash-PRNG rest pose and the animation law
  are unchanged; reduced motion = instant cut + card.
- **`/tech` is the technician room.** The console (paste JSON, fixtures by
  filename), raw session, hashes, credits, the operator path's command log, the
  Immune Gym case catalogue, the consortium line, links to the protocol views.
  Not the default landing; `/lab` redirects into it. Error boundaries stay.
- Tests: no primary nav item on the floor reads Timechain|Council|Hearth|Farm|
  Gym|Operator; the floor says "not a public blockchain"; *Quiet pulse* → *The
  vote* moves `ring-count` 4 → 5 and `height` 3 → 4; benches focus the
  viewport and open one card; `/tech` still has paste + fixtures; the old
  suites (reduced motion, resilience, animation law, honesty) still pass.

### Rejected (kept rejected)

- **Theme-park loop** — no. A "fun" idle (particles, drift, a looping hero)
  would make the floor feel alive between records. Nothing happened, so
  nothing moves; the floor moves once when a bench or a record is chosen.
- **Hide the disclaimer** — no. Plain words are how "not a public blockchain"
  is said on the floor, not whether. Banner and footer say it again.
- **Live dashboard** — no. Nothing fetches a home, spawns a node or opens a
  socket. Two saved records and a paste box.

## web/ — the well: phosphor HUD, pointer-live camera, clock-dead

The docs-site chrome is replaced by one fixed, full-viewport well with a
phosphor HUD. Two audiences stay: the floor (`/`) and the technician room
(`/tech`, a scrolling panel over the same well). web/ only; no kernel work.

- **Chrome** on the floor: the well, a `⌘K` button, a "Technician" text
  button. No multi-link bar of protocol names. The STATUS line is the top
  strip; the plain honesty sentence ("not a public blockchain") is under the
  brand, above the fold.
- **Look**: phosphor HUD (`#9EF0B4`), steel rings, amber only on a scar or a
  real I3, a static 4 % scanline overlay (a CSS gradient, not a time shader).
- **Benches** are hoverable in the well: edge + label on hover, edge off on
  unhover; click = one-shot iris + plain-language card. HUD bench buttons
  mirror them for keyboards and for browsers without WebGL.
- **Fluid = pointer-driven camera damping + one-shot event energy.** The rig
  damps toward the seeded rest pose plus the pointer (parallax, drag orbit,
  wheel zoom); `frameloop="demand"` at rest, `"always"` only while the pointer
  moves the rig, back to `"demand"` 300 ms after pointer-stop. Bloom and grain
  spike on an event and decay to rest. `useFrame` exists only in the rig and
  reads `delta`; nothing under `src/scene` or `src/hud` reads a clock (tested).
- **`⌘K` palette** (cmdk): Pulse / Memory / Vote / Body, the two records,
  "Paste session", "Lab floor". Navigates or opens cards; never fetches, never
  spawns. Reduced motion: no camera follow, no spike, no iris — cards only.
- `/tech`: same well behind a panel with paste JSON, fixtures by file, hashes,
  credits, gym list, operator log. Error boundaries stay; no Monaco.

### Rejected (kept rejected)

- **Matrix rain loop** — no. Any clock-driven overlay or shader makes the well
  look busy while nothing happens. Scanlines are static; grain and bloom decay
  to rest; the only per-frame code follows the pointer and sleeps.
- **Wallet** — no. There is nothing to connect to.
- **Live dashboard** — no. Two saved records and a paste box; no fetch, no
  socket, no spawned node.
- **Hide the disclaimer** — no. Plain words above the fold, the STATUS strip
  at the very top, the footer again.

## web/ — smooth the well: a render policy, not an idle loop

Bug: camera ease, iris, record switch and bloom spike looked stepped.
`frameloop="demand"` does not paint GSAP ticks unless `invalidate()` runs on
every one; toggling demand↔always mid-gesture hitched; the EffectComposer made
the few frames that did paint expensive.

- **Render policy** (`web/src/scene/renderPolicy.ts`): one ledger of holds.
  The loop is `always` while anything holds it — pointer down, pointer moving
  in the well, the focus tween, a record-switch settle, the iris, a bloom spike,
  damping still converging — and returns to `demand` plus one final
  `invalidate()` 200 ms after the last release. Every camera/iris/bloom tween
  holds the ledger and invalidates on every tick (tested).
- **No remount**: the Canvas camera prop is a stable ref, so a HUD re-render
  (card open, bench hover, record switch) never re-applies it or touches the gl
  (tested: same DOM node across all three).
- **Cheap compositor**: EffectComposer mounts only during a spike and unmounts
  after; plain render at rest. `dpr [1, 1.5]`, no shadows, multisampling 0.
- Reduced motion unchanged: no holds, instant cuts, cards only.

### Rejected (kept rejected)

- **An idle loop as a smoothness cheat** — no. Leaving `frameloop="always"` on
  would make every tween smooth and every idle second a lie: a still well must
  draw nothing. Smoothness comes from holding the loop *for the duration of a
  thing that is happening* and invalidating on every tick, then sleeping.

## RexMetrix — the product: fields, bridges, programmes, synthesis

The product is named: **RexMetrix**, institutional research software for
hypothesis-led groups and institutions. Code name *Chronarch* stays on the
Python packages and the git remote this turn. Nothing under `packages/`
changed; genesis hashes, kernel/codec/covenant/schemas, admission, Council
machine, Hearth, lottery and agent hats/silos are untouched.

- **Specs**: `specs/PRODUCT.md` (SaaS programme infrastructure; quota not coin;
  tenants = institutions; Autistikon = Programme Zero; Council/chain leftover is
  internal code, not product), `FIELDS.md` (field object, unbounded catalogue,
  anti-overreach per field), `BRIDGES.md` (first-class edges, the NO_BRIDGE
  rule, path/clique), `PROGRAMMES.md` (programme = subgraph; wizard; amendments
  vs silent edits; scale rule; what is portable from Programme Zero — the
  method, not the content), `SYNTHESIS.md` (jobs overlap|match|couple|question;
  child pin schema; refusals NO_BRIDGE / LICENSE_MISSING /
  INDIVIDUAL_SCORE_FORBIDDEN / CROSS_SECTOR_WRITE as hard errors), `LEGAL.md`
  (what the volume allows — MIT/CC BY when published, testing welcomed, no index
  license; what RexMetrix will not ship).
- **web/ rename**: RexMetrix in title, banner, HUD, README, VISUAL. Honesty
  sentence on `/`: research software for programmes; not a diagnostic; not
  Foundation-endorsed; not a public chain. `/about` (visitor) and the
  technician's institutions page: RexMetrix product, Autistikon as example
  programme, Kim's copyright on the volume's prose. Visitor benches read
  Fields / Bridges / Programmes / Synthesis; the visitor well draws the
  catalogue as a graph. The technician room keeps the substrate instrument,
  Quiet pulse / The vote, hashes and credits. Well unchanged: pointer-live,
  clock-dead, render policy, rest still, reduced motion, no remount, no Monaco.
- **Fixtures**: `programme-zero.json` (two fields, one bridge, ledger 6 /
  register 4, array of 5, stop clock, illustrative grant; no scores, no
  chapters), `programme-toy.json` (invented three-field demo, two bridges),
  `synthesis-child.json` (a question child, parents in both, a three-bridge
  path). Programme Zero → toy moves field-count 2 → 3 and bridge-count 1 → 2.
- **Law in code**: `web/src/lib/programme.ts` refuses NO_BRIDGE,
  LICENSE_MISSING, INDIVIDUAL_SCORE_FORBIDDEN, CROSS_SECTOR_WRITE, BAD_KIND,
  UNKNOWN_FIELD; `requestIndividualScore()` only refuses. `banned.ts` carries
  the visitor ban list; tests run it over the rendered floor and about page.

### Rejected (kept rejected)

- **Smearing the eight zones onto all science** — no. Programme Zero's method
  is portable; its content is that programme's. No other field inherits eight
  interfaces or a corpus's measured array.
- **All fields implicitly couple** — no. A synthesis needs a declared path or
  clique of live bridges; a missing edge is NO_BRIDGE. N fields are a graph,
  not a blender.
- **Foundation endorsement** — no, stated or implied; the only permitted form
  is the negation in the honesty sentence, and the ban list enforces it.
- **An individual index / score / assessment instrument** — no. There is no
  derived index and no index license; demo code refuses.
- **A token storefront** — no. Quota per tenant, not coin; no wallet-style
  account, no listing, no price.
- **Deleting the Council kernel this turn** — no. It is frozen internal code;
  the product simply does not expose it.
- **Pasting the book into the repo** — no. Control-document structure in our
  own words and short cited phrases only; the prose is the author's copyright.

## RexMetrix — works: only legal works enter

- **specs/WORKS.md**: the Work object (id, title, doi?, licence, oa, source,
  bytes as a flag, programme?); full text flagged present only under cc-by-4.0,
  cc0, mit, public-domain or arxiv-nonexclusive; `FULLTEXT_FORBIDDEN`,
  `LICENSE_MISSING` (reused), `STUB_NO_FULLTEXT`; preload / upload (model only)
  / index stubs. Pointers from PRODUCT.md and LEGAL.md; SYNTHESIS.md gains the
  two codes.
- **web/fixtures/works-preload.json**: seven hand-written rows — two Programme
  Zero control-document stand-ins (structure only), a toy stand-in, a
  public-domain named work (metadata only), an arXiv-style row under
  arxiv-nonexclusive with no bytes, two metadata stubs. Every row has a licence
  and `source: "preload"`; no bytes anywhere.
- **web/src/lib/works.ts**: `validateWork`, `acceptUpload` (reserved + bytes →
  FULLTEXT_FORBIDDEN; no licence → LICENSE_MISSING; bytes without the rights
  declaration → RIGHTS_UNDECLARED; else an upload-source record in memory).
  `programme.ts`: parents may cite a work; overlap|match|couple need a body,
  a question may cite a stub; forbidden full text refuses.
- **web**: floor readout "starter works" + one line ("A few legal starter
  works. You add what you have rights to."); /tech works list, upload form
  (title, licence, rights checkbox), refuse codes. No file binary stored, no
  fetch, no bibliographic client, no PDF ingest. Honesty sentences and well law
  unchanged.

### Rejected (kept rejected)

- **A wholesale literature dump** — no. A few legal starter works; a tenant
  adds what it has rights to. Not a world corpus.
- **Paywalled PDF fixtures** — no. `bytes` is a flag; no PDF or full text is
  ever committed; all-rights-reserved with bytes present is refused in code.
- **Scrape adapters** — no. No URL fetch, no live bibliographic client, no
  publisher or shadow-library ingest.
- **"Public knowledge = public files"** — no. A public-domain *work* is a
  metadata row here until someone with rights adds a body under a licence that
  allows it; knowing a paper exists is not having its bytes.

## RexMetrix — one app: the technician room is one room

Bug: the technician room still exposed a second product — /council,
/timechain, /hearth, /farm, /gym, /operator and a protocol sub-nav.

- One operator route, `/tech` (alias `/lab`). The protocol pages and the
  sub-nav are removed as surfaces; their paths redirect into `/tech`
  (`/consortium` into `/about`) so old links do not 404 and nothing stands as
  an equal nav item. ⌘K carries no protocol commands.
- `/tech` sections, in order: works (list + upload), programmes and fixtures,
  paste session JSON, hashes, refuse codes. Then a closed `<details>` —
  "substrate instrument · internal code name Chronarch — not the product" —
  with credits, the raw session, the command log, the self-test case list and
  the shape legend. No heading in the main column teaches G14/G15/G16 or a
  "proposal prism".
- Visitor `/` unchanged; About stays. Well law unchanged.
- Python untouched: no Council/Hearth/Timechain code deleted; `packages/`,
  genesis hashes, STATUS.md frozen.

### Rejected (kept rejected)

- **Two products: the well plus a protocol museum** — no. RexMetrix is one
  app. The substrate's readouts are one closed block in the operator's room,
  labelled internal; they are not a nav, not a page each, and not a product.

## RexMetrix — /tech is a flat operator bench

- No well on the operator route: no canvas, no pointer rig, no scanlines. The
  Shell mounts the well only for the visitor (and About). `/tech` is HTML: the
  works table with checkboxes → **Converge / Compare / Analyze** → the result
  (child JSON or refuse code) → programmes and fixtures → paste JSON → hashes →
  refuse glossary → the closed substrate `<details>`.
- `web/src/lib/bench.ts`: Converge = overlap, Compare = match, Analyze =
  question if any parent is only a stub, else couple. Parents are the selected
  works (shelved in fields; `field` added to the Work object and the preload
  fixture); the declared path is the shortest live path between the parents'
  fields; the programme's grant rides along for a licensed field. Everything
  then runs through `validateChild`: NO_BRIDGE, LICENSE_MISSING,
  INDIVIDUAL_SCORE_FORBIDDEN, CROSS_SECTOR_WRITE, FULLTEXT_FORBIDDEN,
  STUB_NO_FULLTEXT, UNKNOWN_FIELD; fewer than two works → NEED_PARENTS.
  Parents in one field need no bridge (SYNTHESIS.md). Results accumulate in
  memory. No model is called, nothing is fetched.

### Rejected (kept rejected)

- **The well as tech wallpaper** — no. A 3D column behind an operator's
  table is decoration that costs a GPU and says nothing the table does not.
  The well is the visitor's instrument; the operator gets a bench.

## RexMetrix — the bench result is readable

- Preload works with bytes present carry a body (`text`): three structure-only
  stand-ins written for this repository, ≤ 80 words each — no book prose. Stubs
  stay text-less. `acceptUpload` may take optional `text`; giving one is a
  claim of full text and meets the same licence and rights rules.
- `web/src/lib/metrics.ts`: lowercase `[a-z0-9]+` tokens, set Jaccard,
  shared / onlyLeft / onlyRight, sorted. Same inputs → same outputs; the two
  Programme Zero stand-ins are pinned at 15 shared of 95 (0.15789…, "16%").
- The result card: action + kind + ok|code; two parent columns (title, field,
  licence, 160-char snippet); an SVG bar of shared vs unique tokens with the
  Jaccard percent — only when both parents have bodies; "lexical overlap only —
  not a fitted model." on a couple; the question sentence and no bar on a
  stub-bearing question. Child JSON under a closed details. The session list
  shows titles, kind and the percent, or "—".
- /tech: works → actions → readable result → refuse glossary → programmes; the
  header is in flow on the bench (nothing overlays the glossary); session
  fixtures, the paste box and the hashes sit under the closed substrate
  details. Still 0 canvases.

### Rejected (kept rejected)

- **Invented findings** — no. A percent appears only when two bodies exist
  and it is a token ratio the reader can recompute; a stub yields no number,
  and a couple says in its caption that it is lexical overlap, not a model.
- **LLM copy** — no. No model writes a summary, a snippet or a sentence here;
  snippets are the first 160 characters of a body, the question sentence is a
  template over the parents' titles and the declared path.

## RexMetrix — the result is an AnalysisNote

- `web/src/lib/analysisNote.ts` + `specs/ANALYSIS.md`: after a successful
  Converge / Compare / Analyze the default result is a scientific note built in
  code from the works, the metrics already computed and the accepted child:
  question · objects (with roles ledger/register/note/body/stub) · what was
  compared (path, grants, metric line) · findings (every sentence cites a work
  id or `metric:jaccard`; no causal language) · assumptions used (only labels
  already in programme-zero.json, only for the ledger/register pair; else
  "none declared on these pins") · what would falsify this reading · what this
  is not (always: not a fitted model, not peer review, not a clinical claim,
  not an individual score) · appendix (bar + closed JSON). A stub-bearing
  question has no findings. A refusal has no note body.
- Copy law on notes is code (`NOTE_BANS`, `noteBanHits`) and tested.
- The bench card renders the eight sections; the session list adds "note".

### Rejected (kept rejected)

- **LLM-authored findings** — no. No model writes a sentence here. Findings
  are templates over counts the reader can recompute and ids the reader can
  open; the one question sentence is a template over titles and the declared
  path.
- **"PhD analyzes everything"** — no. The note says only what two bodies and a
  token ratio can support, names what would falsify that, and lists what it is
  not. Where the bodies cannot support a section, the section says so.

## RexMetrix — a base of legal works (catalogue and rules)

- `web/fixtures/programme-classics.json`: six fields for public-domain and
  U.S. government works — natural-history, heredity, optics, electricity,
  electromagnetism, metrology — with three declared bridges
  (natural-history—heredity, electricity—electromagnetism,
  optics—electromagnetism). Metrology stands alone: a one-field compare needs
  no bridge. Nothing claims all fields couple.
- `us-government` licence tag (17 U.S.C. § 105), documented in WORKS.md;
  `source_url` (a citation — never fetched) and `attribution` on works; the
  upload form takes title, licence, field, source URL, a text excerpt and the
  rights checkbox. A URL without text is a stub.
- The six base rows (work-darwin-1859, work-newton-opticks,
  work-faraday-ere-v1, work-maxwell-elem, work-mendel-1866-de,
  work-nist-tn1297) take their excerpt, URL and attribution **only** from the
  operator brief's works table. That table was not attached to this turn and
  is not in the repository, so the rows are not composed from memory; WORKS.md
  lists the six ids and fields, and the tests that govern them run over
  whatever rows carry a `source_url`.

### Rejected (kept rejected)

- **Heath's Euclid** — no. Heath's translation and commentary carry their own
  copyright questions; a public-domain Euclid would have to be a specific
  verified edition, and none is in the brief.
- **A live crawler** — no. The browser never downloads the web; a URL is a
  citation and nothing in the works, bench or note code calls fetch (tested).
- **A full-text dump of Project Gutenberg books** — no. A row carries the
  specified excerpt only, never the book; bodies are short by test.
- **Excerpts from memory** — no. Quoting a historic text or its URL from
  recollection risks a misquotation with a real author's name on it; the rows
  wait for the brief's table.

## RexMetrix — the base rows, from the brief

- The operator brief's works table arrived and is carried exactly: Darwin 1859
  (natural-history, PG #1228), Newton *Opticks* (optics, PG #33504), Faraday
  *Experimental Researches in Electricity* vol. 1 (electricity, PG #14986),
  Maxwell *An Elementary Treatise on Electricity* (electromagnetism, PG #69914),
  Mendel *Versuche über Pflanzenhybriden* 1866 (heredity, PG #40854), NIST TN
  1297 (metrology, us-government). The Darwin stub is replaced by the body row
  (same id). Each row: the brief's excerpt as `text`, its `source_url`, its
  `attribution` (with https), `bytes: "present"`, `source: "preload"`; twelve
  preload rows in all. Programme Zero stand-ins stay.
- A body job (overlap | match | couple) now refuses a missing body before it
  asks for a bridge, so Darwin + the arXiv stub is STUB_NO_FULLTEXT, not
  NO_BRIDGE.
- Pinned: Compare Darwin + Mendel across natural-history—heredity and Faraday +
  Maxwell across electricity—electromagnetism yield match notes with both
  excerpts and Jaccards computed from these exact texts (tests carry the
  counts). NIST TN 1297 stands alone: metrology has no bridge.
- Tests: the six rows equal the brief's strings (whitespace-normalised only),
  https in source_url and attribution, public-domain or us-government; no
  fetch anywhere under src/.

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
