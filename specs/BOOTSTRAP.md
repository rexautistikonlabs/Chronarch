# BOOTSTRAP.md — Block 0 Self-Building Kernel and the Self-Config Program

Chronarch's genesis block is not a stub header pointing at software somewhere else: it is a complete kernel. Any node that holds the kernel blob, some disk, and some compute can build itself into a working organ of the organism — verify the kernel against Ring 0, pin it, adopt Ring 0 as its identity head, load the seed faculties, commit farm space, announce what it serves, attack itself once, and seal the result as a ring. No installer asks for an operator password, no first-run wizard mints a founder, and no step — none — reads an admin private key. This document specifies the kernel modules K1..K18, the self-config program S0..S8, the closed `NodeConfig` schema, the seed faculties and opcode menu that constitute all cognition present at Block 0, and the determinism guarantee that makes every honest boot land on the same kernel manifest hash and the same Ring 0 hash.

Status: v0 draft — sim/MVP values are FROZEN-MVP; changing them post-genesis is a MAJOR change (G14).

---

## 1. Principle: deterministic bootstrap, no privileged operator (G11)

> **G11.** "Bootstrap is deterministic from kernel hashes. Hidden admin is a bug."

Genesis is a complete kernel. A node with the kernel blob + disk + compute self-configures with **no privileged operator and no admin key**. There is no bootstrap ceremony that a human must bless, no key handed to a founder, and no configuration file that can smuggle in an override. **Hidden admin is a bug** — literally: any schema field or config key that looks like one is rejected by the admission layer as an I8 nervous event (see [NERVOUS.md](NERVOUS.md)) under G17:

> **G17.** "There is no admin key, founder override, helm override, or 'Chronarch.execute_upgrade()' that bypasses Proposal + Ballot + height activation."

Chronarch — the helm — has no private key of its own and cannot self-enact (G15). The Council is not a hidden admin either (see [COUNCIL.md](COUNCIL.md)); it stewards through slashing-backed ballots, and the invariant is sealed into the kernel itself (K14):

> "Major change is a proposal ring plus a slashing-backed vote, not an AI rewrite and not an admin key."

Bootstrap failures are not swallowed. A failed step is metabolized into a scar (G1, G5), never a silent retry:

> "Tampering is detectable, expensive, incomplete, and metabolized into a scar."

## 2. Kernel completeness: modules K1..K18

The `KernelManifest` binds the **structured content** of every module by hash (`sha256`, domain-prefixed, canonical encoding — see K2). The manifest itself is a closed schema: `protocol`, `version`, `modules` (K1..K18 → content hash), `covenant_hash`, `genesis_params_hash`, `faculty_registry_hash`, `reject_list`.

| ID | Module | Binds |
|----|--------|-------|
| K1 | `covenant_and_genesis_law` | The covenant object: Genesis Law G1..G18 + the 9-clause covenant seed |
| K2 | `codec_hash_spec_schemas` | Hash algo, domain prefix, canonical encoding, closed schemas |
| K3 | `chronos_economic_params` | Every FROZEN-MVP consensus parameter (table below) |
| K4 | `dual_farm_spec` | The two lanes and what plots may and may not store |
| K5 | `bootstrap_faculties_opcode_menu` | Opcode menu + seed faculty names; no executable LLM code |
| K6 | `cambium_machine` | What Cambium drafts, what it may enact, what it may never enact |
| K7 | `nervous_spec` | Interfaces I1..I10, prestress floors, healing rule |
| K8 | `immune_gym_catalog` | Gym target classes and attack case catalog |
| K9 | `challenge_engine_types` | Challenge kinds, advisory PoQ shape, consensus rule |
| K10 | `continuum_identity_split` | Identity chain vs. Continuum task chains |
| K11 | `witness_rule` | k-of-n head witness rule |
| K12 | `reward_router` | Per-slot issuance split in bps |
| K13 | `hearth` | One lock, two legs; unbond delay; salience clamp |
| K14 | `council_charter_proposal_machine` | Change invariant, major classes, approval rule, upgrade path |
| K15 | `self_config_program` | Steps S0..S8; `reads_admin_private_key: false` |
| K16 | `dummymind_executor` | The deterministic primitive interpreter |
| K17 | `attribution` | Lineage of cognition, health model, and body |
| K18 | `reject_list` | The explicit reject list and forbidden key tokens |

**K1 — covenant_and_genesis_law.** Binds the covenant object hashed into Ring 0: the full Genesis Law `G1`..`G18` plus the covenant seed (nine clauses, from "Prefer honest uncertainty over fabrication" through "Major change is a proposal ring plus a slashing-backed vote, not an AI rewrite and not an admin key"). The covenant hash in Ring 0 is the constitution; changing it is a hard fork plus Council ratification — there is no other path (G7). See [GENESIS.md](GENESIS.md).

**K2 — codec_hash_spec_schemas.** Binds the codec contract every consensus object obeys: `hash_algo = sha256`, domain prefix `chronarch/v0/`, encoding `canonical-json-sorted-ascii`, floats **banned**, schemas **closed** (unknown fields rejected). This module is why two nodes hash the same object to the same digest — the root of the determinism guarantee in §7.

**K3 — chronos_economic_params.** Binds every FROZEN-MVP consensus parameter as one genesis-params object (Chronos is blood, not conscience — G2):

| Parameter | Value |
|---|---|
| `slots_per_epoch` | 32 |
| `witness_k` / `witness_n` | 3 / 5 |
| `chronons_per_chronos` | 10^12 |
| `premine_chronons` | 0 (no premine, no founder allocation, no admin mint) |
| `base_reward_per_slot_chronons` | 64 × 10^12 (64 Chronos) |
| `halving_interval_slots` | 2^20 = 1048576 (sim value; mainnet schedule = M4) |
| `reward_router_bps` | see K12 |
| `hearth_bond_leg_bps` / `hearth_liquidity_leg_bps` | 5000 / 5000 |
| `unbond_delay_slots` | 32 |
| `salience_clamp_min_bps` / `salience_clamp_max_bps` | 2500 / 40000 |
| `council_approve_weight_num` / `_den` | 2 / 3 |
| `voting_window_slots` | 128 |
| `activation_delay_slots` | 32 |
| `min_council_bond_chronons` | 1000 × 10^12 (1000 Chronos) |
| `min_pinset_size` | 4 |
| `max_challenge_gap_slots` | 64 |
| `community_proposal_deposit_chronons` | 100 × 10^12 (100 Chronos) |
| `genesis_timestamp` | `2026-01-01T00:00:00Z` (fixed label; consensus uses slots) |
| `pq_reserved` | null (post-quantum field reserved in MVP) |

See [TOKEN.md](TOKEN.md), [HEARTH.md](HEARTH.md), [COUNCIL.md](COUNCIL.md) for the semantics of each.

**K4 — dual_farm_spec.** Binds the body plan: two lanes on the same disks — `plot_lane` and `cambium_cas_lane`. Space units are `abstract-until-phase-4`. Plots store **space proofs only — never rings, embeddings, or weights**; and **pin failure is a nervous event (I3), not a lost file**. The physics lineage is Chia-family Proof of Space and Time (K17); the MVP uses abstract space units and stub slots. See [ARCHITECTURE.md](ARCHITECTURE.md).

**K5 — bootstrap_faculties_opcode_menu.** Binds the complete audited opcode menu (16 primitives, §5) and the sorted names of the 12 seed faculties, plus the flag `executable_llm_code: false`. Everything Chronarch can *do* at Block 0 is composed from this menu — nothing else exists to run.

**K6 — cambium_machine.** Binds Cambium's mandate: it **drafts** organs and proposals; it **may enact** only the MINOR classes (`new_gym_cases_existing_classes`, `hibernate_unused_faculty`, `local_hippocampus_rebuild`, `pinset_advertisement`, `epoch_health_vector`, `primitive_composed_sense_passing_holdout`) and **may not enact** any MAJOR class M1..M9 (G15, G14).

**K7 — nervous_spec.** Binds the nervous system: interfaces I1..I10 (`hash_walk`, `plot_challenge_honesty`, `cas_retrieval`, `poq_challenge_pass_rate`, `faculty_replay`, `mempool_injection`, `eclipse_witness_capture`, `covenant_drift_illegal_upgrade`, `hearth_solvency_lp_integrity`, `council_liveness_illegal_ratification`), the prestress floors (`min_bond_chronons` = 1000 × 10^12, `min_pinset_size` = 4, `max_challenge_gap_slots` = 64), and the healing rule: **restore prestress without cutting tension members**. The health model is analogical biotensegrity — falsifiable instrumentation, not metaphysics (G18). See [NERVOUS.md](NERVOUS.md).

**K8 — immune_gym_catalog.** Binds the Immune Gym's scope: target classes `chronarch_fixture`, `chronarch_sim`, `chronarch_testnet` — external targets **rejected (G12)** — and the 12-case attack catalog (`forged_ring`, `withheld_pin`, `fake_poq`, `witness_eclipse`, `authored_code_sneak`, `hearth_drain`, `griefing_challenge`, `council_bribe_to_pass_challenge`, `tensegrity_slack`, `illegal_upgrade_attempt`, `fake_admin_key_tx`, `fake_helm_override_tx`). See [GYM.md](GYM.md) and [THREATS.md](THREATS.md).

**K9 — challenge_engine_types.** Binds the challenge kinds (`replay`, `retrieval`, `plot`, `pin`), the advisory PoQ shape (6 dims of 0..255), and the rule that **consensus uses attestations (G10)** — self-PoQ is advisory only, never mining, and never a claim of subjective experience.

**K10 — continuum_identity_split.** Binds the identity split: one identity chain per agent; Continuum task chains are separate heads referenced by **pointers only (G8)**.

**K11 — witness_rule.** Binds `k = 3` of `n = 5` head witnesses. Ring heads advance only under witness quorum.

**K12 — reward_router.** Binds the per-slot issuance split in bps (must sum to 10000): `farmer_plot_share` 3500, `pin_share` 1500, `compute_share` 1000, `stake_lp_share` 1500, `immune_gym_share` 1000, `council_ops_share` 300 (pays published tallies/reports, never a yes-vote), `treasury_share` 1200. See [TOKEN.md](TOKEN.md).

**K13 — hearth.** Binds the Hearth: split `[5000, 5000]` bps (bond leg slashable, liquidity leg protocol inventory), `unbond_delay_slots = 32` (so slashes land before exit), salience clamp `[2500, 40000]` bps, and the rule that **salience applies to retrieval ranking only — never Challenge or Ballot validity** (G2, G13). See [HEARTH.md](HEARTH.md).

**K14 — council_charter_proposal_machine.** Binds the change invariant (the `change` slogan, quoted in §1), the nine MAJOR classes M1..M9, the approval rule `yes_weight*den >= eligible_weight*num AND yes_seats > eligible_seats/2` with weight 2/3, `voting_window_slots = 128`, `activation_delay_slots = 32`, and the **only** upgrade path: `proposal_ring -> gym+health report -> ballots -> tally -> result ring -> activation at height H`. See [COUNCIL.md](COUNCIL.md).

**K15 — self_config_program.** Binds the self-config program itself: the ordered steps S0..S8 (§3) and the flag `reads_admin_private_key: false`. The program that builds a node is part of what Ring 0 seals — a node cannot claim to have booted "the Chronarch way" while running a different program (G11).

**K16 — dummymind_executor.** Binds the DummyMind: a **deterministic primitive interpreter** that runs **only live-registry faculty hashes (G3)**; **authored code is inert until activation (G4)**. DummyMind is the only executor at Block 0. It is not an LLM, contains no model weights, and is named to keep that honest.

**K17 — attribution.** Binds lineage: cognition — Cyberphysics / Cypher Tempre primitives (cyberphysicsai/cypher-tempre-genesis, cyberphysics.ai); health — Rex Autistikon method + biotensegrity principles (analogical, not clinical); body — Chia-family Proof of Space and Time.

**K18 — reject_list.** Binds the explicit reject list (`admin_key`, `founder_key`, `helm_override`, `ai_self_enact`) and the forbidden key tokens (§4). No `AdminKey` / `FounderKey` / `HelmOverride` object exists anywhere in the protocol; a schema field like that is a bug.

## 3. The self-config program S0..S8 (K15)

The program is linear and total: every step either succeeds or records its failure into the `BootReport` (`identity`, `steps` as `(step_id, ok, detail)` entries, `boot_ok`, `kernel_hash`, `ring0_hash`). **Failure seals a Scar, not a silent retry** — a failed step short-circuits to S7, which seals a scar ring instead of a boot-ok ring. Either way, the boot is remembered (G1).

| Step | Name |
|------|------|
| S0 | `verify_kernel_vs_ring0` |
| S1 | `init_cas_pin_kernel` |
| S2 | `identity_head_is_ring0` |
| S3 | `load_seed_faculties_if_hashes_match` |
| S4 | `commit_plot_lane_space` |
| S5 | `announce_pinset_compute_optional_hearth_bond` |
| S6 | `gym_smoke_and_prestress_check` |
| S7 | `seal_boot_ok_or_scar` |
| S8 | `epoch_loop` |

### S0 — verify_kernel_vs_ring0

**Inputs:** the kernel blob; Ring 0. **Action:** recompute every module content hash, the `KernelManifest` and its hash, the covenant hash, the genesis-params hash, and the faculty-registry hash from the blob's structured contents, and compare each against the commitments in Ring 0's body. **Outputs:** a verified manifest and `kernel_hash` for the `BootReport`. **Failure:** the blob is not the organism Ring 0 describes — an I8-class drift (`covenant_drift_illegal_upgrade`). The node MUST NOT proceed to run any of the blob's content; the failure is recorded and S7 seals a scar ring. Peers independently reject such a node because its derived hashes differ (G11); trust here rests on hashes, not on who shipped the blob.

### S1 — init_cas_pin_kernel

**Inputs:** the verified kernel objects; local disk. **Action:** initialize the Cambium/CAS lane and pin the kernel objects themselves — manifest, covenant, genesis params, faculty registry — as the node's first pins. This is why `min_pinset_size = 4`: at least the kernel objects. **Outputs:** a CAS holding the kernel, retrievable and re-verifiable by hash (`PIN_FETCH` + `PIN_VERIFY`). **Failure:** disk cannot store or serve the kernel — an I3 (`cas_retrieval`) restriction; recorded, scar at S7. A pin failure is a nervous event, not a lost file (K4).

### S2 — identity_head_is_ring0

**Inputs:** Ring 0 hash. **Action:** create the node's `AgentIdentity` with `genesis_ring_hash` = `head_ring_hash` = the Ring 0 hash and `head_height` = 0. The identity chain begins at Ring 0 and stays distinct from Continuum task chains, which are referenced by pointers only (G8, K10). **Outputs:** the identity head. There is no key ceremony that grants privilege here: identity is a chain position, not a permission bit, and no admin key exists to bind (G17). **Failure:** cannot happen except by S0/S1 failure upstream; any inconsistency detected here is recorded as I8 and scarred at S7.

### S3 — load_seed_faculties_if_hashes_match

**Inputs:** the faculty registry from the verified kernel. **Action:** for each of the 12 seed faculties, recompute `code_hash` over `(name, kind, origin, program)` and compare against the registry entry; on match, load the faculty into DummyMind's live registry. Only live-registry faculty hashes run on the protocol path (G3). Every seed faculty is `origin = primitive`, `status = live`; authored faculties do not exist at genesis and can only reach the protocol path through Proposal + Ballot (M3, G14, G4). **Outputs:** a live registry of exactly the 12 seed programs. **Failure:** any hash mismatch is treated as attempted code substitution — an I8 nervous event; nothing mismatched is loaded, and S7 seals a scar ring.

### S4 — commit_plot_lane_space

**Inputs:** `NodeConfig.space_units`. **Action:** commit plot-lane space. In the MVP, space units are abstract and slots are stubs; the Chia-family header/plot physics arrives with the research fork in a later phase (K4: `abstract-until-phase-4`). Plots prove space; they **never** store rings, embeddings, or weights. **Outputs:** the node's `space_units` in its `FarmerValidator` record, enabling participation in plot challenges (`plot_challenge_proof` in the header). **Failure:** committed space that cannot answer a plot challenge honestly is an I2 (`plot_challenge_honesty`) event; recorded, scar at S7.

### S5 — announce_pinset_compute_optional_hearth_bond

**Inputs:** the S1 pinset; `NodeConfig.compute_units`; optional `NodeConfig.hearth_bond_chronons`. **Action:** announce the node's `PinSet` (identity, pins, slot) on the Cambium/CAS lane, declare `compute_units`, and — only if `hearth_bond_chronons > 0` — open a `HearthPosition`: one lock, two legs, split 5000/5000 bps between the slashable bond leg and the protocol liquidity leg (see [HEARTH.md](HEARTH.md)). A bond of 0 is a valid farming-only configuration; a bond of at least 1000 Chronos (1000 × 10^12 chronons) is one of the Council eligibility floors, alongside `min_pinset_size = 4` and `max_challenge_gap_slots = 64` (see [COUNCIL.md](COUNCIL.md)). **Outputs:** pinset advertisement (a MINOR class), compute declaration, optional Hearth lock. **Failure:** an announcement the node cannot honor is an I3 event; a malformed or insolvent Hearth lock is an I9 (`hearth_solvency_lp_integrity`) event; recorded, scar at S7.

### S6 — gym_smoke_and_prestress_check

**Inputs:** the running node itself as a `chronarch_fixture` target. **Action:** run Immune Gym smoke cases from the K8 catalog against **itself** — the Gym may attack Chronarch targets only (G12); "Attack yourself; do not attack strangers" (covenant seed) — and measure prestress against the floors with the `prestress_sense` faculty: bond, pinset size, and challenge cadence versus `min_pinset_size = 4` and `max_challenge_gap_slots = 64`. Note that `fake_admin_key_tx` and `fake_helm_override_tx` are smoke cases the node must **reject** to pass. **Outputs:** `GymReceipt`s and a prestress measurement for the boot health picture. **Failure:** a failed case or a floor violation seals a Scar at the interface the failure maps to (e.g. I3 for a withheld pin, I2 for a plot challenge miss, I8 for an accepted forbidden-key tx) — never a silent retry.

### S7 — seal_boot_ok_or_scar

**Inputs:** the accumulated `BootReport`. **Action:** if every step reported ok, seal a **boot ring** (`ring_type = "boot"`) carrying the report with `boot_ok = true`; if any step failed, seal a **scar ring** (`ring_type = "scar"`) naming the interface, cause, and evidence hashes. This is the step that guarantees no boot outcome is silent: success and failure are both metabolized into history (G1, G5 — scars cannot be pruned; retiring one is M7 and still needs a forget-scar ring). **Outputs:** exactly one sealed ring. **Failure of the seal itself:** the node has no legitimate presence on the Timechain and must not proceed to S8.

### S8 — epoch_loop

**Inputs:** a sealed boot-ok ring. **Action:** enter steady-state operation — 32 slots per epoch: answer plot/pin/replay/retrieval challenges, serve the announced pinset, participate in k-of-n witnessing (3-of-5), account rewards through the router (`reward_accounting_sense`), and seal the epoch `HealthVector` (a MINOR class) over the nine health components. HEALTH is the standing objective — not price, not vanity PoQ. **Failure:** operational failures from here on are nervous events under [NERVOUS.md](NERVOUS.md), each scarred at its interface; the loop itself never silently retries past one.

## 4. NodeConfig: the only knobs, and the keys that can never exist

The entire node-local configuration surface is one **closed** schema:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `node_id` | str | yes | The node's chosen identity label |
| `space_units` | int | yes | Plot-lane space to commit at S4 (abstract in MVP) |
| `compute_units` | int | yes | Compute declared at S5 |
| `hearth_bond_chronons` | int | no | Optional Hearth bond; 0 for none |

Rules, in admission order:

1. **Forbidden-key screen first, recursively.** Any key anywhere in the object whose name contains one of the forbidden tokens — `admin_key`, `admin_override`, `admin_private_key`, `founder_key`, `founder_override`, `helm_override`, `ai_self_enact`, `execute_upgrade`, `master_key`, `backdoor` — is **rejected outright as an I8 nervous event** (K18, G17): reject + Scar, and a slash if signed by a bonded identity.
2. **Closed schema.** Any unknown key is rejected. A field cannot ride along "for later."
3. **Codec.** Integers only; floats are banned from consensus objects.

There is **no bootstrap path that reads an admin private key**. This is not merely policy: K15 binds `reads_admin_private_key: false` into the hashed kernel content, K18 binds the reject list (`admin_key`, `founder_key`, `helm_override`, `ai_self_enact`), and the test suite asserts no code path reads such a key. A "bootstrap" that asked for one would fail S0, because its kernel would not hash to Ring 0's commitments.

## 5. Seed faculties and the opcode menu (K5, K16)

All cognition present at Block 0 is 12 primitive faculties composed from a 16-opcode audited menu, executed by DummyMind (K16) — a deterministic primitive interpreter. **There is no executable LLM code in Block 0** (`executable_llm_code: false` is hashed into K5). DummyMind runs **live-registry faculty hashes only (G3)**; **authored code is inert until activation (G4)** — and activating an authored faculty on the protocol path is MAJOR class M3, Proposal + Ballot only. Chronarch is not an LLM on a blockchain; the mind that boots the organism is small enough to audit line by line.

### The complete audited primitive set (OPCODE_MENU)

| Opcode | Effect |
|---|---|
| `LOAD_INPUT` | push named input onto stack |
| `CONST` | push constant |
| `HASH_WALK` | verify hash-link continuity over a ring range |
| `PIN_FETCH` | fetch object from CAS by hash |
| `PIN_VERIFY` | verify fetched bytes hash to the pin |
| `SCREEN_INJECTION` | screen text/tx payload against forbidden tokens |
| `DIFF_COVENANT` | compare running covenant hash to Ring 0 covenant hash |
| `MEASURE_PRESTRESS` | bonds + pins + challenge cadence vs floors |
| `PREDICT_TRANSMISSION` | map a restriction to adjacent interfaces |
| `EMIT_SCAR` | produce a scar body (sealing happens in core, G5) |
| `DRAFT_PROPOSAL` | produce an inert proposal body (never enacts, G15) |
| `SCORE_HEALTH` | fold component scores into a HealthVector body |
| `SUM_REWARDS` | apply the reward router to a slot's issuance |
| `TALLY_BALLOTS` | count ballots vs thresholds (validity ruled by core) |
| `THRESH` | compare top-of-stack to a threshold |
| `EMIT` | return top-of-stack as faculty output |

### The 12 seed faculties (SEED_FACULTIES)

| Faculty | Kind | Program |
|---|---|---|
| `hash_walk_sense` | sense | `LOAD_INPUT, HASH_WALK, EMIT` |
| `pin_retrieval_sense` | sense | `LOAD_INPUT, PIN_FETCH, PIN_VERIFY, EMIT` |
| `injection_screen_sense` | sense | `LOAD_INPUT, SCREEN_INJECTION, EMIT` |
| `covenant_drift_sense` | sense | `LOAD_INPUT, DIFF_COVENANT, EMIT` |
| `prestress_sense` | sense | `LOAD_INPUT, MEASURE_PRESTRESS, EMIT` |
| `transmission_sense` | sense | `LOAD_INPUT, PREDICT_TRANSMISSION, EMIT` |
| `gym_attack_modality` | modality | `LOAD_INPUT, SCREEN_INJECTION, THRESH, EMIT` |
| `scar_writer_modality` | modality | `LOAD_INPUT, EMIT_SCAR, EMIT` |
| `cambium_propose_modality` | modality | `LOAD_INPUT, DRAFT_PROPOSAL, EMIT` |
| `health_score_modality` | modality | `LOAD_INPUT, SCORE_HEALTH, EMIT` |
| `reward_accounting_sense` | sense | `LOAD_INPUT, SUM_REWARDS, EMIT` |
| `council_tally_modality` | modality | `LOAD_INPUT, TALLY_BALLOTS, EMIT` |

Note the deliberate humility of the modalities: `cambium_propose_modality` ends in `DRAFT_PROPOSAL` — it produces an **inert** proposal body and never enacts (G15); `scar_writer_modality` produces a scar **body** — sealing happens in core (G5); `council_tally_modality` counts, but validity is ruled by core (G16). The faculties sense and draft; the kernel's law decides. This is the helm posture in miniature:

> "Chronarch proposes. The Timechain remembers. The tensegrity feels. The Council stewards. Chronos is blood, not conscience."

## 6. Dual farm at boot (K4, S4, S5)

The same disks serve two lanes from the first slot:

- **Plot lane (S4):** commits `space_units` — abstract units in the MVP, real Chia-family plot physics on a later research fork. Plots prove space. They never store rings, embeddings, or weights: they are not a database, and Timechain content never depends on plot survival.
- **Cambium/CAS lane (S5):** the content-addressed store, initialized at S1 with the kernel objects pinned, then announced as the node's `PinSet` along with `compute_units` and the optional Hearth bond.

The lanes fail differently on purpose. Losing a plot loses potential space proofs — an economic event. Failing a pin the node announced is an **I3 nervous event** — the organism feels it as restriction at a named interface, predicts transmission to adjacent interfaces, and scars if the health model's prediction fails too (G18). See [NERVOUS.md](NERVOUS.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

## 7. Determinism guarantee

Two nodes holding the same kernel blob derive:

1. the **same module content hashes** for K1..K18 (K2 codec: `sha256`, domain prefix `chronarch/v0/`, `canonical-json-sorted-ascii`, no floats, closed schemas, sorted keys),
2. therefore the **same `KernelManifest` and the same kernel manifest hash**, and
3. therefore the **same Ring 0 hash** — Ring 0 is built purely from kernel commitments: `ring_type = "genesis"`, `height = 0`, `slot = 0`, `prev_ring_hash = ""`, `author = "chronarch-prime"`, empty witness list, and a body carrying `kernel_manifest_hash`, `covenant_hash`, `genesis_params_hash`, `faculty_registry_hash`, the genesis timestamp `2026-01-01T00:00:00Z`, and the slogans. No keys, no randomness, no clock reads.

**The test suite pins this.** Kernel construction and Ring 0 sealing are pure functions of the constants; tests fail if code and spec drift, and any change to a FROZEN-MVP value is MAJOR (M1/M2/M4/M6 as applicable) — Proposal + Ballot only (G14). Determinism is what makes G11 enforceable: if bootstrap depended on anything a privileged operator supplies, two honest nodes could not land on the same Ring 0 hash — so the absence of a hidden admin is not a promise, it is a checksum.

---

*Lineage (K17): cognition — Cyberphysics / Cypher Tempre primitives (cyberphysicsai/cypher-tempre-genesis, cyberphysics.ai); health — Rex Autistikon method + biotensegrity principles (analogical, not clinical); body — Chia-family Proof of Space and Time. Chronarch is a DACO — explicitly not a claim of consciousness or qualia; PoQ does not prove subjective experience.*

*Sibling specs: [GENESIS.md](GENESIS.md) · [NERVOUS.md](NERVOUS.md) · [COUNCIL.md](COUNCIL.md) · [TOKEN.md](TOKEN.md) · [HEARTH.md](HEARTH.md) · [GYM.md](GYM.md) · [THREATS.md](THREATS.md) · [ARCHITECTURE.md](ARCHITECTURE.md)*
