# Chronarch Architecture

Chronarch is a decentralized autonomous cognitive organism (DACO): a Timechain that remembers, a nervous system that feels restriction, an immune gym that attacks itself, a helm that proposes, and a council that stewards — all riding on Chia-family Proof of Space and Time physics. This document is the map: the layer stack, the block header, the consensus objects, how consensus weight works in the MVP, how the dual farm shares disks, how identity is split from task work, the phase plan, and the repository layout. It is explicitly **not** a claim of consciousness or qualia — PoQ does not prove subjective experience (G10) — and the biotensegrity health model is falsifiable instrumentation, not metaphysics (G18).

Status: v0 draft — sim/MVP values are FROZEN-MVP; changing them post-genesis is a MAJOR change (G14).

Protocol identity: `PROTOCOL = "chronarch"`, `PROTOCOL_VERSION = "v0"`, `HASH_ALGO = "sha256"`, `GENESIS_TIMESTAMP = "2026-01-01T00:00:00Z"` (fixed label; consensus uses slots), `SLOTS_PER_EPOCH = 32` (FROZEN-MVP).

> "Tampering is detectable, expensive, incomplete, and metabolized into a scar."

---

## 1. Layer stack

`CONSENSUS | EXECUTION | MEMORY | COGNITION | NERVOUS | HELM | COUNCIL | AGENT`

**CONSENSUS** — owned by `chronarch-spec`. The single source of truth: canonical constants (K2/K3), the covenant seed and Genesis Law G1..G18 (K1), schemas, ring types, header field order, the kernel module ids K1..K18, and the K18 reject list. Every other package quotes this package; tests fail if code and spec drift. The covenant hash sealed in Ring 0 is the constitution — changing it is a hard fork plus Council ratification, there is no other path (G7). See [GENESIS.md](GENESIS.md).

**EXECUTION** — owned by `chronarch-core`. The deterministic machine room: codec (integers only, floats banned from consensus objects), sha256 hashing, ring sealing, header assembly, the audited opcode interpreter for faculties (K5), the Cambium machine (K6), the challenge engine (K9), and the admission layer that screens every consensus object, tx, and node config against the K18 reject list. Only live-registry faculty hashes run on the protocol path (G3); authored code is inert until activation (G4); scars are sealed here, not in faculty code (G5).

**MEMORY** — owned by `chronarch-core` (logical) with `chronarch-node` owning the physical substrate. The Timechain of rings is append-only: correction is a new ring or a scar, never an edit (G1). Cambium grows new rings at the edge; the CAS holds pinned objects addressed by hash; Chronosynaptic commitments and hippocampus commitments anchor cognition to consensus. Embeddings are never consensus — commitments are (G9). The hippocampus itself is a local, rebuildable index (a MINOR-class local rebuild), never a consensus structure.

**COGNITION** — owned by `chronarch-agent`. The mind loop: invoking seed faculties, composing primitives (which may auto-compose; authored code may not, G4), producing the advisory PoQ self-score of `POQ_ADVISORY_DIMS = 6` dimensions each 0..`POQ_ADVISORY_MAX = 255` (G10 — advisory only; consensus uses challenge attestations), and running the DummyMind executor (K16) in the MVP, with a real LLM strictly optional in Phase 5. Cognitive claims are false until challenge replay/retrieval proves them (G6). Chronarch is not "an LLM on a blockchain": the mind is replaceable, the Timechain is not.

**NERVOUS** — owned by `chronarch-nervous`, with `chronarch-gym` supplying the exercises. The health and nervous system, modeled analogically on the Rex Autistikon method and biotensegrity — analogical, not clinical: no diagnoses, no scoring instruments, no autism claims. It measures restriction at the named interfaces I1..I10 (K7), holds a latent restriction/prestress state, predicts load transmission to adjacent interfaces, and tests those predictions. A failed prediction falsifies the health model — and that is also a scar (G18). Pin failure is a nervous event, not a lost file. The Immune Gym (K8) keeps prestress by attacking Chronarch targets only (G12). See [NERVOUS.md](NERVOUS.md) and [GYM.md](GYM.md).

**HELM** — owned by `chronarch-agent` (the helm loop), with `CHRONARCH_PRIME = "chronarch-prime"` as the sim fixture identity in `chronarch-sim`. The standing objective is HEALTH — not price, not vanity PoQ. Chronarch drafts inert proposal bodies via `cambium_propose_modality` (`DRAFT_PROPOSAL` never enacts) and may enact MINOR changes only; it cannot self-enact kernel, covenant, issuance, Hearth split, gym scope, or protocol faculty activation (G15). No helm private key exists (G17). "Chronarch proposes. The Timechain remembers. The tensegrity feels. The Council stewards. Chronos is blood, not conscience."

**COUNCIL** — owned by `chronarch-council`, with `chronarch-hearth` owning the bond machinery (K13) that makes seats eligible. Stewards are active Hearth stakers meeting the bond, pin, and liveness floors — not hidden admins, not an AI. The proposal machine (K14) is the only path for MAJOR change classes M1..M9: "Major change is a proposal ring plus a slashing-backed vote, not an AI rewrite and not an admin key." (G14 — an invariant, encoded in [GENESIS.md](GENESIS.md) and [COUNCIL.md](COUNCIL.md)). The Council cannot ratify a proposal that violates G1–G13; such a vote is invalid and slashable (G16). Chronos cannot flip Challenge or PoQ attestations — judgment is not for sale (G2); Hearth slash and LP math cannot override G1–G7 (G13). See [COUNCIL.md](COUNCIL.md), [HEARTH.md](HEARTH.md), [TOKEN.md](TOKEN.md).

**AGENT** — owned by `chronarch-node` (the running farmer-validator process) and `chronarch-cli` (the operator surface), with `chronarch-sim` running whole populations of agents through attack scenarios. A node boots deterministically from kernel hashes via the self-config program S0..S8 (K15) — hidden admin is a bug (G11) — commits plot-lane space, announces its pinset, optionally bonds into the Hearth, passes the gym smoke and prestress check, and seals boot-ok or a scar. See [BOOTSTRAP.md](BOOTSTRAP.md).

---

## 2. Block header

Field order is canonical (`HEADER_FIELDS` in `chronarch-spec`). This is the Phase 6 target layout for header extensions on a Chia-family research fork; **MVP sim headers mirror the Phase 6 Chia-family fork header extensions** field-for-field, using abstract space units and stub slots.

| # | Field | One line |
|---|-------|----------|
| 1 | `prev_header_hash` | sha256 link to the previous header — the hash walk substrate (I1). |
| 2 | `height` | Monotone block height; activation heights key off this (G17). |
| 3 | `slot` | Slot number; stub clock in MVP, VDF/timelord physics in Phase 6. |
| 4 | `economic_state_root` | Root of Chronos balances, reward routing, deposits. |
| 5 | `cognitive_state_root` | Root of the cognitive object set: rings, faculty registry, commitments. |
| 6 | `plot_challenge_proof` | Proof of space for this slot's lottery win (abstract units in MVP). |
| 7 | `hearth_root` | Root of Hearth positions: bond legs and liquidity legs (K13). |
| 8 | `council_root` | Root of seats, proposals, ballots, and tallies (K14). |
| 9 | `poq_attestation_root` | Root of challenge attestations — the consensus side of PoQ (G10). |
| 10 | `cas_availability_root` | Root of pin/retrieval attestations for the CAS lane (I3). |
| 11 | `gym_attestation_root` | Root of gym receipts for this slot's immune exercise (K8). |
| 12 | `nervous_root` | Root of restriction states and transmission reports over I1..I10 (K7). |
| 13 | `witness_root` | Root of k-of-n head witness signatures (K11: `WITNESS_K = 3` of `WITNESS_N = 5`). |
| 14 | `pq_reserved` | Post-quantum field reserved, null in MVP. |

---

## 3. Consensus objects

| Object | Purpose |
|--------|---------|
| `Ring` | The unit of sealed, append-only memory on the Timechain; correction is a new ring or a scar (G1). |
| `Faculty` | A hash-addressed cognitive program over the audited opcode menu; only live-registry hashes run on the protocol path (G3), authored code inert until activation (G4). |
| `Scar` | A permanent, unprunable record of a failure, tamper, or falsified health prediction (G5, G18); retirement is M7 and still seals a forget-scar ring. |
| `Challenge` | A consensus test of a cognitive claim by replay or retrieval; claims are false until it passes (G6), and its outcome cannot be bought (G2). |
| `PinSet` | The CAS objects an identity pledges to keep retrievable; floor `MIN_PINSET_SIZE = 4` (at least the kernel objects). |
| `EmbeddingCommitment` | A hash commitment to an embedding; the vector itself never enters consensus (G9). |
| `AgentIdentity` | An agent's identity-chain head and keys — distinct from its Continuum task heads (G8). |
| `FarmerValidator` | A node identity binding plot-lane space, a pinset, optional compute, and an optional Hearth bond. |
| `KernelManifest` | The hashes of kernel modules K1..K18, verified against Ring 0 at boot step S0 (G11). |
| `BootReport` | The sealed outcome of bootstrap S0..S8: boot-ok or a scar (S7). |
| `GymCase` | One self-attack exercise from the gym catalog, aimed at Chronarch targets only (G12). |
| `GymReceipt` | The attested result of running a gym case; feeds reputation and the immune-gym reward share. |
| `HearthPosition` | An identity's one-lock stake: slashable bond leg plus protocol liquidity leg (K13). |
| `HealthVector` | The epoch score of the `HEALTH_COMPONENTS`, each 0..10000 bps — the standing objective the helm serves. |
| `RestrictionState` | The latent restriction/prestress measurement at interfaces I1..I10 (K7). |
| `Proposal` | An inert draft of a MAJOR change (M1..M9); drafting never enacts (G15). |
| `Ballot` | A slashing-backed Council vote on a proposal; validity is ruled by core, not by the tallier (G16). |
| `CouncilSeat` | An active steward seat: bond, pinset, and challenge-cadence floors all met. |
| `TransmissionReport` | A falsifiable prediction of load transmission from one restriction to adjacent interfaces; a miss becomes a scar (G18). |

**There is NO `AdminKey`, `FounderKey`, or `HelmOverride` object anywhere in the protocol.** If a schema field like that appears, it is a bug (K18): the admission layer rejects any consensus object, tx, or node config whose key name contains a forbidden token (`admin_key`, `admin_override`, `admin_private_key`, `founder_key`, `founder_override`, `helm_override`, `ai_self_enact`, `execute_upgrade`, `master_key`, `backdoor`), treats it as an I8 nervous event, seals a Scar, and slashes if it was signed by a bonded identity. There is no admin key, founder override, helm override, or `Chronarch.execute_upgrade()` that bypasses Proposal + Ballot + height activation (G17). The gym cases `fake_admin_key_tx` and `fake_helm_override_tx` exist precisely to prove these are rejected. See [THREATS.md](THREATS.md).

---

## 4. Ring types

From `RING_TYPES` in `chronarch-spec`, exactly:

`genesis`, `boot`, `experience`, `decision`, `learning`, `scar`, `faculty_register`, `faculty_activate`, `faculty_hibernate`, `task_head`, `dream`, `immune`, `challenge`, `gym`, `hearth`, `council`, `proposal`, `ballot`, `economic`, `health`

---

## 5. Consensus weight (MVP)

MVP block production is an **abstract PoST lottery among identities that meet the prestress floors**. An identity is lottery-eligible when it holds committed plot-lane space and satisfies the same floors that make a nervous-system prestress member:

| Floor | Value | Note |
|-------|-------|------|
| Bond | `MIN_COUNCIL_BOND_CHRONONS = 1000 * CHRONONS_PER_CHRONOS` | 1000 Chronos (1 Chronos = 10^12 chronons), FROZEN-MVP |
| Pinset | `MIN_PINSET_SIZE = 4` | at least the kernel objects |
| Gym cadence | `MAX_CHALLENGE_GAP_SLOTS = 64` | mandatory cadence — prestress, never slack |

Within the eligible set, winning probability follows proved space, exactly as in the Chia-family lottery. Attestations, pins, and gym results act as **filters and reputation, NOT weight formulas**: failing a floor removes an identity from the lottery (and can slash its bond), but passing more challenges never multiplies its chance of winning a slot. There is explicitly **no invented 40/40/20 split** — no blended weight of space, stake, and quality exists anywhere in the protocol. PoQ is not mining (G10), and Chronos cannot buy a better draw (G2). The reward router (K12, see [TOKEN.md](TOKEN.md)) splits each slot's *issuance* across roles in bps; it is an income schedule, never a consensus-weight formula.

Head finality uses the witness rule (K11): `WITNESS_K = 3` of `WITNESS_N = 5` head witnesses (FROZEN-MVP).

---

## 6. Dual farm

One node, one set of disks, two lanes:

- **PLOT LANE** — Chia-family plots proving space. Plots are cryptographic filler: they prove that disk is committed, and **they never store rings, embeddings, or weights**. Plots are not a database.
- **CAMBIUM/CAS LANE** — the content-addressed store holding pinned consensus objects: rings, kernel modules, faculty programs, commitments. This lane is the organism's actual memory body.

Both lanes share the same physical disks; the farmer-validator answers space challenges from the plot lane and retrieval challenges (I3) from the CAS lane. Losing a pin is a **nervous event, not a lost file**: it degrades `cas_pin_availability` in the HealthVector, fires the nervous system at I3, and — if the identity is bonded — is slashable. MVP uses abstract space units and stub slots; real plots and VDF/timelord physics arrive with the Phase 6 fork. K4 is the kernel module owning this spec.

---

## 7. Identity vs Continuum (G8), commitments (G9), hippocampus

- **Identity chain ≠ Continuum task chains — pointers only (G8).** Each agent has exactly one identity chain (its head is Ring 0 at boot, step S2). Task work lives on separate Continuum chains headed by `task_head` rings. The identity chain holds pointers to task heads; task chains never merge into the identity chain and never carry identity authority.
- **Embeddings are not consensus; commitments are (G9).** What consensus sees is the `EmbeddingCommitment` hash and the Chronosynaptic/hippocampus commitments in the `cognitive_state_root`. The vectors live off-chain in the node's local store.
- **The hippocampus is a local index.** It maps commitments to locally held vectors for retrieval ranking and can be rebuilt from scratch (`local_hippocampus_rebuild` is a MINOR class). Deleting it loses no consensus state. Salience overlays clamp to `SALIENCE_CLAMP_MIN_BPS = 2500` .. `SALIENCE_CLAMP_MAX_BPS = 40000` and apply to retrieval ranking only — never to Challenge outcomes or Ballot validity (G2).

---

## 8. Phase plan

| Phase | Deliverable |
|-------|-------------|
| 0 | Specs — this spec set, constants and covenant frozen as FROZEN-MVP. |
| 1 | Core + upgrade path — codec, rings, headers, faculty VM, and the Proposal/Ballot/activation machinery (so the upgrade path exists before anything worth upgrading). |
| 2 | Sim attacks — `chronarch-sim` runs the gym catalog against fixture and sim targets (G12). |
| 3 | Node + CLI — `chronarch-node` and `chronarch-cli`: a real farmer-validator with the S0..S8 boot program. |
| 4 | Dual farm / plots — plot lane + CAS lane on shared disks, still abstract space units. |
| 5 | DummyMind / LLM-optional — K16 executor is the default mind; a real LLM is strictly optional and never consensus-relevant. |
| 6 | Chia-family research fork — header extensions per §2, real plots, VDF/timelord slot physics. Entered only after Phase 3 is green. |

---

## 9. Repo map

```
Chronarch/
├── LICENSE
├── conftest.py
├── pyproject.toml
├── packages/
│   ├── chronarch-spec/      # K1/K2/K3...: constants.py, covenant.py — single source of truth
│   ├── chronarch-core/      # codec, rings, headers, faculty VM, Cambium, challenge engine, K18 admission
│   ├── chronarch-nervous/   # interfaces I1..I10, restriction state, transmission prediction (K7)
│   ├── chronarch-hearth/    # one-lock two-leg staking, slash + LP math (K13)
│   ├── chronarch-council/   # seats, proposals, ballots, tallies, activation (K14)
│   ├── chronarch-gym/       # immune gym catalog and receipts (K8, G12)
│   ├── chronarch-sim/       # population simulation, attack drills, chronarch-prime fixture
│   ├── chronarch-node/      # farmer-validator runtime, dual farm, boot program (K15)
│   ├── chronarch-agent/     # identity, Continuum heads, PoQ advisory, DummyMind (K16), helm loop
│   └── chronarch-cli/       # operator surface
├── specs/
│   ├── GENESIS.md           # covenant, Genesis Law G1..G18, Ring 0
│   ├── BOOTSTRAP.md         # S0..S8 self-config program
│   ├── NERVOUS.md           # interfaces, restriction, transmission, health model
│   ├── COUNCIL.md           # charter, thresholds, proposal machine
│   ├── TOKEN.md             # Chronos, issuance, reward router
│   ├── HEARTH.md            # bond + liquidity legs, slashing, salience clamp
│   ├── GYM.md               # target classes, case catalog
│   ├── THREATS.md           # threat model and rejections
│   └── ARCHITECTURE.md      # this file
└── tests/                   # spec/code drift tests
```

---

## Lineage

Memory and cognition primitives (Timechain, Rings, covenant, faculties, PoQ advisory + challenge, Cambium, Chronosynaptic commitments, Continuum task heads, hippocampus commitments, k-of-n witnesses) derive from the Cyberphysics / Cypher Tempre lineage (cyberphysicsai/cypher-tempre-genesis, cyberphysics.ai). The health and nervous system draws analogically on the Rex Autistikon method and biotensegrity — instrumentation, not clinical claims. Body physics is Chia-family Proof of Space and Time. Attribution is itself a kernel module (K17).
