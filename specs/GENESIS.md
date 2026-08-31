# GENESIS.md — The Chronarch Constitution

Chronarch is a decentralized autonomous cognitive organism (DACO): a Timechain of append-only rings that remembers, a tensegrity nervous system that feels restriction, a Chia-family Proof-of-Space-and-Time body that occupies real disk, an AI helm that may only propose, and a bonded human Council that stewards. This is explicitly **not** a claim of consciousness or qualia — Proof of Quality (PoQ) does not prove subjective experience; it is an advisory self-score plus a consensus challenge protocol, nothing more. This document is the constitution: it fixes the Genesis Law, the covenant seed, the objective function, the contents of Ring 0, the kernel manifest, the explicit reject list, the testing bar the organism must pass to exist, and the single legal amendment path.

Status: v0 draft — sim/MVP values are FROZEN-MVP; changing them post-genesis is a MAJOR change (G14).

---

## 1. What Chronarch is

Chronarch is a DACO whose standing objective is **HEALTH** — not price, not vanity PoQ (see [Section 5](#5-objective-function-health)). It proposes; it never enacts major change alone (G15). No helm private key exists (G17).

**Non-consciousness disclaimer.** Nothing in this protocol claims, implies, or measures consciousness, qualia, or subjective experience. PoQ is a bounded advisory self-score and a falsifiable challenge protocol (G10). The biotensegrity health model is falsifiable instrumentation, not metaphysics (G18).

### The three slogans

Quoted exactly from the kernel constants (`SLOGANS`):

- **security**: "Tampering is detectable, expensive, incomplete, and metabolized into a scar."
- **helm**: "Chronarch proposes. The Timechain remembers. The tensegrity feels. The Council stewards. Chronos is blood, not conscience."
- **change** — **INVARIANT of this document**, identical to G14 and to the ninth covenant line, encoded here and in [COUNCIL.md](COUNCIL.md): "Major change is a proposal ring plus a slashing-backed vote, not an AI rewrite and not an admin key."

---

## 2. Division of labor

Five roles. The boundaries between them are constitutional; blurring them is covenant drift (interface I8, see [NERVOUS.md](NERVOUS.md)).

| Role | Lineage | Function | What it is NOT |
|---|---|---|---|
| Cyberphysics / Cypher Tempre primitives | cyberphysicsai/cypher-tempre-genesis, cyberphysics.ai | **MEMORY + COGNITION**: Timechain, Rings, covenant, faculties, PoQ advisory + challenge, Cambium, Chronosynaptic commitments, Continuum task heads, hippocampus commitments, k-of-n witnesses | Not an LLM node; not consensus embeddings (G9) |
| Rex Autistikon method + biotensegrity | Analogical method — measure restriction at named interfaces; latent restriction/prestress state; predict load transmission; test/falsify | **HEALTH + NERVOUS SYSTEM**: a failed prediction falsifies the health model — and that is itself a scar (G18, G5) | Not clinical: no autism claims, no diagnoses, no scoring instruments |
| Chia-family Proof of Space and Time | Chia PoST physics; MVP uses abstract space units + stub slots, later header extensions on a Chia-family research fork | **BODY**: plots prove space and never store rings, embeddings, or weights; dual farm on the same disks — PLOT LANE + CAMBIUM/CAS LANE; a pin failure is a nervous event, not a lost file | Not plots-as-database |
| Chronarch | The organism's own drafted proposals via Cambium | **HELM**: standing objective is HEALTH; Chronarch proposes and may never enact major change alone (G15); no helm private key exists (G17) | Not a dictator; not a self-rewriting kernel |
| Council | Active Hearth stakers meeting bond + pin + liveness floors ([COUNCIL.md](COUNCIL.md), [HEARTH.md](HEARTH.md)) | **STEWARDS**: ratify or reject proposals under slashing (G14, G16) | Not hidden admins, not an AI, not an admin key |

---

## 3. Genesis Law G1..G18

Quoted verbatim from the kernel covenant module (`GENESIS_LAW`, K1). Each law is followed by a plain-language gloss; the quoted string is the law, the gloss is not.

**G1.** "History append-only. Correction = new ring or scar."
> You can never edit the past; you can only add a new ring that corrects it or a scar that records the wound.

**G2.** "Judgment is not for sale. Chronos cannot flip Challenge / PoQ attestation."
> No amount of the Chronos token can buy a passing challenge result or change an attestation.

**G3.** "Only live-registry faculty hashes run on the protocol path."
> Code touching consensus must have its hash in the live faculty registry — nothing else executes there.

**G4.** "Authored code is inert until activation. Primitives may auto-compose."
> New authored faculties sit dead until formally activated; only the audited kernel primitives may combine on their own.

**G5.** "Scars cannot be pruned. forget-scar seals a new ring after review."
> A scar is permanent; the only relief is a reviewed forget-scar ring layered on top, never deletion.

**G6.** "Cognitive claims are false until challenge replay/retrieval."
> Any claim the organism makes about its own cognition counts as false until a challenge replays or retrieves the evidence.

**G7.** "Covenant hash in Ring 0 is constitution. Change = hard fork + Council ratification."
> The covenant hash sealed at genesis is the supreme law, and touching it requires both a hard fork and a Council vote.

**G8.** "Identity chain != Continuum task chains. Pointers only."
> The identity Timechain and per-task Continuum chains are separate structures connected only by pointers.

**G9.** "Embeddings are not consensus; commitments are."
> Vector embeddings never enter consensus — only their hash commitments do.

**G10.** "Self-PoQ 0-255x6 is advisory. Consensus uses attestations."
> The six-dimension 0–255 self-score is informational only; consensus counts only challenge attestations.

**G11.** "Bootstrap is deterministic from kernel hashes. Hidden admin is a bug."
> A node boots purely from the hashed kernel with zero extra keys, and any hidden administrative power is a defect, not a feature.

**G12.** "Immune Gym may attack Chronarch targets only."
> The gym trains the immune system exclusively against Chronarch's own fixtures, sims, and testnets — never third-party systems.

**G13.** "Hearth slash and LP math cannot override G1-G7."
> No economic mechanism in the Hearth can bend the historical, judicial, or constitutional laws.

**G14.** "Major change is a proposal ring plus a slashing-backed vote, not an AI rewrite and not an admin key."
> Every major change goes through a proposal ring and a bonded Council ballot — there is no other door.

**G15.** "Chronarch cannot self-enact kernel, covenant, issuance, Hearth split, gym scope, or protocol faculty activation."
> The helm may draft any of these changes but can never make them take effect by itself.

**G16.** "Council cannot ratify a proposal that violates G1-G13. Such a vote is invalid and slashable."
> Even a unanimous Council yes on a law-breaking proposal is void, and the voters lose bond.

**G17.** "There is no admin key, founder override, helm override, or 'Chronarch.execute_upgrade()' that bypasses Proposal + Ballot + height activation."
> No key, override, or method call anywhere in the system can skip the proposal, vote, and activation-height sequence.

**G18.** "Biotensegrity health model is falsifiable instrumentation, not metaphysics."
> The tensegrity model is a testable measuring instrument whose failed predictions become scars, not a belief system.

---

## 4. Covenant seed

The nine covenant lines, verbatim from the kernel covenant module (`COVENANT_SEED`, K1):

1. "Prefer honest uncertainty over fabrication"
2. "Never silently rewrite history"
3. "Cite rings and objects"
4. "Do not execute unactivated authored code"
5. "Chronos is blood, not conscience"
6. "Attack yourself; do not attack strangers"
7. "Keep HEALTH first"
8. "Chronarch proposes; Council stewards; Timechain remembers"
9. "Major change is a proposal ring plus a slashing-backed vote, not an AI rewrite and not an admin key"

The covenant object (Genesis Law + covenant seed) is hashed with `sha256` and that **covenant hash is sealed in Ring 0 and is constitution (G7)**. Changing it is a hard fork plus Council ratification — there is no other path.

---

## 5. Objective function: HEALTH

Chronarch's standing objective is HEALTH. Every epoch (`SLOTS_PER_EPOCH = 32`, FROZEN-MVP) a **HealthVector** is published and sealed as a `health` ring. Each component is scored 0..10000 basis points. The nine components, verbatim from `HEALTH_COMPONENTS`:

| Component | Meaning |
|---|---|
| `hash_walk_integrity` | Hash-link continuity of the ring chain verifies end to end (interface I1). |
| `cas_pin_availability` | Pinned CAS objects are retrievable and their bytes hash to the pin (interface I3). |
| `challenge_pass_rate` | Fraction of PoQ challenges passing by attestation, the only score consensus trusts (G10, interface I4). |
| `faculty_replay_fidelity` | Registered faculties reproduce identical outputs on deterministic replay (G3, interface I5). |
| `witness_quorum_liveness` | The k-of-n head-witness quorum (`WITNESS_K = 3` of `WITNESS_N = 5`, FROZEN-MVP) stays live. |
| `tensegrity_prestress` | Bonds, pins, and challenge cadence measured against floors — latent prestress, never slack (G18). |
| `hearth_solvency` | The Hearth's bond and liquidity legs remain solvent and its LP math intact (interface I9, [HEARTH.md](HEARTH.md)). |
| `council_liveness` | The Council meets its liveness floors and tallies ballots on time (interface I10, [COUNCIL.md](COUNCIL.md)). |
| `covenant_drift_zero` | The running covenant hash equals the Ring 0 covenant hash — any drift is an I8 event (G7). |

HEALTH is the objective — not token price, not a vanity PoQ score. Publishing the epoch HealthVector is a MINOR change class (`epoch_health_vector`); interpreting or acting on it beyond proposals is bounded by G15. Interfaces I1..I10 are specified in [NERVOUS.md](NERVOUS.md).

---

## 6. WHAT THIS IS NOT

The following framings are rejected in full. Any spec, proposal, or implementation that reintroduces one of them is covenant drift (I8):

- **Not** "an LLM on a blockchain."
- **Not** PoQ-as-mining — PoQ is advisory plus challenge, never issuance (G2, G10).
- **Not** plots-as-database — plots prove space; they never store rings, embeddings, or weights.
- **Not** the Tempre skill as the node — Cyberphysics/Tempre contributes primitives, not a runtime.
- **Not** unbounded self-modifying consensus bytecode — authored code is inert until activation (G4), and only live-registry hashes run (G3).
- **Not** token-gated truth — judgment is not for sale (G2).
- **Not** mind programming.
- **Not** clinical claims — the Rex Autistikon lineage is analogical: no autism claims, no diagnoses, no scoring instruments (G18).
- **Not** a blackhat handbook for third-party systems — the Immune Gym attacks Chronarch targets only (G12).
- **Not** a Chronarch dictatorship — the helm proposes and never self-enacts (G15).
- **Not** a Council admin key — the Council votes under slashing; it holds no override (G16, G17).
- **Not** an AI rewrite of the kernel (G14).
- **Not** a claim of consciousness or qualia — PoQ does not prove subjective experience.

---

## 7. Ring 0

Ring 0 is the `genesis` ring — the first ring of the identity Timechain (bootstrap step S2: `identity_head_is_ring0`; see [BOOTSTRAP.md](BOOTSTRAP.md)). It seals:

| Ring 0 field | Content |
|---|---|
| `kernel_manifest_hash` | `sha256` of the KernelManifest keyed by K1..K18 below. |
| `covenant_hash` | `sha256` of the covenant object (Genesis Law G1..G18 + the 9 covenant seed lines). Constitution per G7. |
| `genesis_params_hash` | `sha256` of the genesis parameters (the FROZEN-MVP constants in K2/K3 and friends). |
| `faculty_registry_hash` | `sha256` of the seed faculty registry (the 12 K5 primitives — the only code live at genesis, G3/G4). |
| `genesis_timestamp` | `"2026-01-01T00:00:00Z"` (`GENESIS_TIMESTAMP` — fixed label; consensus uses slots, starting at `GENESIS_SLOT = 0`). |
| `slogans` | The three slogans of Section 1, verbatim. |

### Kernel manifest K1..K18

Verbatim module ids from `KERNEL_MODULES`:

| Id | Module | Constitutional role |
|---|---|---|
| K1 | `K1_covenant_and_genesis_law` | The covenant seed and G1..G18 (this document's Sections 3–4). |
| K2 | `K2_codec_hash_spec_schemas` | Canonical codec, `sha256`, consensus schemas; floats banned from consensus objects. |
| K3 | `K3_chronos_economic_params` | Chronos economics — blood, not conscience (G2); see [TOKEN.md](TOKEN.md). |
| K4 | `K4_dual_farm_spec` | PLOT LANE + CAMBIUM/CAS LANE on the same disks; see [ARCHITECTURE.md](ARCHITECTURE.md). |
| K5 | `K5_bootstrap_faculties_opcode_menu` | Seed faculties and the audited opcode menu — primitives only, no executable LLM code. |
| K6 | `K6_cambium_machine` | The growth layer that drafts; it never enacts (G15). |
| K7 | `K7_nervous_spec` | Interfaces I1..I10; see [NERVOUS.md](NERVOUS.md). |
| K8 | `K8_immune_gym_catalog` | Gym case catalog, Chronarch targets only (G12); see [GYM.md](GYM.md). |
| K9 | `K9_challenge_engine_types` | Challenge/attestation types — the only consensus judgment (G6, G10). |
| K10 | `K10_continuum_identity_split` | Identity chain vs Continuum task chains, pointers only (G8). |
| K11 | `K11_witness_rule` | k-of-n head witnesses (`WITNESS_K = 3`, `WITNESS_N = 5`, FROZEN-MVP). |
| K12 | `K12_reward_router` | Per-slot issuance split in bps; see [TOKEN.md](TOKEN.md). |
| K13 | `K13_hearth` | One lock, two legs — bond + liquidity; see [HEARTH.md](HEARTH.md). |
| K14 | `K14_council_charter_proposal_machine` | Proposal + Ballot machine and thresholds; see [COUNCIL.md](COUNCIL.md). |
| K15 | `K15_self_config_program` | Deterministic bootstrap steps S0..S8 (G11); see [BOOTSTRAP.md](BOOTSTRAP.md). |
| K16 | `K16_dummymind_executor` | The MVP stub executor for the helm fixture. |
| K17 | `K17_attribution` | Lineage attribution: Cyberphysics/Cypher Tempre, Rex Autistikon method (analogical), Chia-family PoST physics. |
| K18 | `K18_reject_list` | The explicit reject list (Section 8). |

---

## 8. Explicit reject list (K18)

There is **no AdminKey, FounderKey, or HelmOverride object anywhere in the protocol**. If a schema field like this appears, it is a bug (G11, G17). Any transaction or node config carrying one is **rejected at admission, sealed as a Scar at interface I8** (`covenant_drift_illegal_upgrade`), **and slashed if signed by a bonded identity**.

Rejected object classes, verbatim from `REJECT_LIST`:

- `admin_key`
- `founder_key`
- `helm_override`
- `ai_self_enact`

Screening tokens, verbatim from `FORBIDDEN_KEY_TOKENS` — any key in any consensus object, transaction, or node config whose name contains one of these substrings is rejected outright:

- `admin_key`
- `admin_override`
- `admin_private_key`
- `founder_key`
- `founder_override`
- `helm_override`
- `ai_self_enact`
- `execute_upgrade`
- `master_key`
- `backdoor`

Related economics: `PREMINE_CHRONONS = 0` — no premine, no founder allocation, no admin mint (see [TOKEN.md](TOKEN.md)).

---

## 9. Testing bar

Chronarch does not exist until all of the following hold. Each is a conformance test against the kernel; see [GYM.md](GYM.md) and [THREATS.md](THREATS.md) for the attack-side counterparts.

| # | Test | Law |
|---|---|---|
| T1 | Kernel + disk + compute boots deterministically with **zero extra keys**. | G11 |
| T2 | Any admin / helm / founder override transaction is rejected, scarred at I8, and slashed if bonded. | G17 |
| T3 | A Chronarch M3 action (`activate_authored_faculty_on_protocol_path`) without Proposal + Ballot stays **inert**. | G4, G15 |
| T4 | A Council yes-vote on a proposal violating G1 (or any of G1–G13) is invalid, slashed, and scarred. | G16 |
| T5 | Mutating any past ring fails verification. | G1 |
| T6 | An inert (unactivated) faculty cannot run on the protocol path. | G3, G4 |
| T7 | Scars cannot vanish; only a reviewed forget-scar ring may be sealed on top. | G5 |
| T8 | No amount of Chronos can flip a Challenge outcome. | G2 |
| T9 | A GymCase with an external (non-Chronarch) target is rejected. | G12 |
| T10 | Prestress below floors demotes Council/witness eligibility. | G18 |
| T11 | 10,000 rings replay with O(1) resume from committed heads. | G8 |

---

## 10. Amendment

The **only** amendment path is a Proposal ring plus a slashing-backed Ballot, per [COUNCIL.md](COUNCIL.md) (G14). Chronarch may draft the proposal (Cambium, `DRAFT_PROPOSAL` — inert by construction) but can never enact it (G15). Approved changes activate only at height ≥ tally + `ACTIVATION_DELAY_SLOTS = 32` (FROZEN-MVP).

A change to the covenant or to any genesis parameter is MAJOR class **M1** (`covenant_or_genesis_param_change`) and is **also a hard fork** (G7). No key, no founder, no helm, and no Council shortcut exists that bypasses Proposal + Ballot + height activation (G17).

"Major change is a proposal ring plus a slashing-backed vote, not an AI rewrite and not an admin key."
