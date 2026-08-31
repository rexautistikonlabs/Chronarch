# NERVOUS.md — Health and the Tensegrity Nervous System

This document specifies how Chronarch feels. The nervous system is a biotensegrity-inspired instrumentation layer, built on the Rex Autistikon method, that measures restriction at ten named interfaces (I1..I10), holds a latent restriction/prestress state, predicts how strain transmits through the organism's tension network, and then tests those predictions — sealing every wound, and every failed prediction, as a permanent scar on the Timechain. Its output is the epoch HealthVector, the organism's standing objective ([GENESIS.md](GENESIS.md), Section 5). The kernel module for this spec is `K7_nervous_spec`, and the per-epoch nervous state commits into the block header `nervous_root` field.

Status: v0 draft — sim/MVP values are FROZEN-MVP; changing them post-genesis is a MAJOR change (G14).

---

## 1. Disclaimer — read this first

**This is analogical engineering instrumentation, not a medical product.**

The Rex Autistikon method and biotensegrity lineage are used here **strictly by analogy**, as a way of designing measurement and load-prediction instrumentation for a distributed protocol. This document, and the protocol it specifies:

- makes **no claims about autism** or any human condition;
- performs **no diagnoses** of any person;
- contains **no clinical scoring instruments** and must never be repurposed as one;
- makes **no claim of consciousness or qualia** — PoQ does not prove subjective experience (G10).

The governing law is **G18**: "Biotensegrity health model is falsifiable instrumentation, not metaphysics." The model earns its keep only by making predictions that can fail; when a prediction fails, the model is wrong, and that failure is itself sealed as a scar (Section 3, move 4; G5). Any use of this spec that blurs the analogical/clinical boundary is covenant drift (interface I8).

---

## 2. Lineage and division of labor

The nervous system is the **HEALTH + NERVOUS SYSTEM** role of the organism (see [GENESIS.md](GENESIS.md), Section 2):

- **Rex Autistikon method + biotensegrity** contribute the method and the structural analogy — analogical only, per Section 1.
- **Cyberphysics / Cypher Tempre primitives** (cyberphysicsai/cypher-tempre-genesis, cyberphysics.ai) contribute the memory and cognition substrate the nervous system measures: Timechain rings, covenant, faculties, PoQ challenges, k-of-n witnesses.
- **Chia-family PoST** is the body it palpates: plots prove space, and a pin failure on the CAMBIUM/CAS lane is a **nervous event, not a lost file** (interface I3; [ARCHITECTURE.md](ARCHITECTURE.md)).
- **Chronarch** (helm) reads the HealthVector and may draft responses; it never enacts major change alone (G15).
- The **Council** stewards any major response ([COUNCIL.md](COUNCIL.md)).

"Chronarch proposes. The Timechain remembers. The tensegrity feels. The Council stewards. Chronos is blood, not conscience."

---

## 3. The method: four moves

The Rex Autistikon method, transposed to protocol instrumentation, is four moves executed every epoch. Each move is implemented by audited kernel primitives from the K5 opcode menu — no authored code runs on this path (G3, G4).

| Move | What happens | Kernel primitive(s) | Seed faculty |
|---|---|---|---|
| 1. **Measure restriction at named interfaces** | Each interface I1..I10 (Section 5) is probed with deterministic checks; results are quantified in basis points. | `HASH_WALK`, `PIN_FETCH`/`PIN_VERIFY`, `SCREEN_INJECTION`, `DIFF_COVENANT`, `MEASURE_PRESTRESS` | `hash_walk_sense`, `pin_retrieval_sense`, `injection_screen_sense`, `covenant_drift_sense`, `prestress_sense` |
| 2. **Represent latent restriction/prestress state** | Measurements fold into a per-interface `RestrictionState` (Section 6) — including latent prestress: bonds, pins, and challenge cadence measured against floors even when nothing hurts yet. | `MEASURE_PRESTRESS` | `prestress_sense` |
| 3. **Predict load transmission** | For each restriction, the model predicts which adjacent interfaces the strain will transmit to through the tensegrity network, and by how much (bps). | `PREDICT_TRANSMISSION` | `transmission_sense` |
| 4. **Test / falsify** | Predictions are compared against observed strain in later slots. A failed prediction means **the health model is wrong** — and that failure is itself sealed as a scar (`TransmissionReport.model_falsified = true` → Scar ring). Falsifiable instrumentation, not metaphysics (G18, G5). | `EMIT_SCAR` (sealing in core, G5) | `scar_writer_modality` |

Move 4 is what makes G18 real: the model is not allowed to be unfalsifiable. A tensegrity model that only ever explains and never predicts-and-fails would be metaphysics, and metaphysics is rejected.

---

## 4. Biotensegrity mapping

The organism is modeled as a tensegrity: discontinuous compression members floating in a continuous tension network, held ready by prestress. The mapping is analogical (Section 1) and falsifiable (G18).

| Tensegrity concept | Chronarch realization |
|---|---|
| **Compression members** | Plots (PLOT LANE space proofs), CAS pins (CAMBIUM/CAS LANE), full nodes. The struts that occupy real disk and real compute. |
| **Tension members** | Hash-links between rings (G1), witness bonds (K11), Hearth bonds ([HEARTH.md](HEARTH.md)), the covenant (G7), challenge obligations (G6, [GYM.md](GYM.md)). The cables that hold the struts in relation. |
| **Prestress** | Minimum pin-set, minimum bond, mandatory gym/challenge cadence (Section 9). The organism is **never slack**: tension members carry load even at rest, so restriction is felt before failure. |
| **Continuous tension, discontinuous compression** | No single validator is the spine. Load redistributes across the whole network when any member fails; there is no rigid column whose loss is fatal (see also [THREATS.md](THREATS.md)). |
| **Strain transmission** | An isolated restriction that is not metabolized (locked, quarantined, scarred — Section 8) transmits strain to adjacent interfaces (Section 5, last column). Ignoring a wound moves it. |
| **Healing** | Restore prestress **without cutting tension members**: re-pin, re-bond, resume cadence. Never a silent history delete — history is append-only (G1) and scars cannot be pruned (G5). Cutting a cable to relieve pain is forbidden surgery. |

"Tampering is detectable, expensive, incomplete, and metabolized into a scar."

---

## 5. Interfaces I1..I10

Ids and names are verbatim from the kernel constants (`INTERFACES`, K7). Restriction at any interface is measured in basis points; a Scar object must name one of these ids (its schema rejects anything else). The "strain transmits to" column records the model's standing transmission predictions — these are exactly the predictions that move 4 tests and can falsify (G18).

| Id | Name | What is measured | What restriction looks like | Strain tends to transmit to |
|---|---|---|---|---|
| I1 | `hash_walk` | Hash-link continuity over ring ranges (`HASH_WALK`); the walk from any ring back toward Ring 0 verifies. | A link that does not verify; a walk that cannot complete; a forged or mutated past ring (G1). | I5 (replay loses trusted inputs), I7 (a broken head invites witness capture), I4 (challenges over bad history). |
| I2 | `plot_challenge_honesty` | PLOT LANE proof-of-space responses: plots answer slot challenges honestly and on time. | Missed or dishonest plot proofs; claimed space that cannot prove itself. | I3 (same disks host the CAS lane), I9 (farmer rewards and bonds distort, [TOKEN.md](TOKEN.md)). |
| I3 | `cas_retrieval` | CAMBIUM/CAS LANE availability: pinned objects fetch and their bytes hash to the pin (`PIN_FETCH`, `PIN_VERIFY`). A pin failure is a nervous event, not a lost file. | Withheld pins; bytes that do not hash to the pin; retrieval latency collapse. | I1 (walks stall without objects), I5 (replay inputs missing), I2 (shared-disk pressure). |
| I4 | `poq_challenge_pass_rate` | Fraction of PoQ challenges passed **by attestation** — advisory self-scores never count (G10, G6). | Falling pass rate; unanswered challenges; a challenge gap exceeding the cadence floor (Section 9). | I5 (unverified faculties keep running), I10 (councilors below cadence lose eligibility), I6 (unchallenged claims invite injection). |
| I5 | `faculty_replay` | Deterministic replay fidelity: live-registry faculties reproduce identical outputs (G3). | Divergent replay outputs; a faculty whose hash is not in the live registry executing anyway. | I8 (divergence is the signature of illegal code), I4 (challenge machinery itself degrades). |
| I6 | `mempool_injection` | Admission screening of tx/config payloads against `FORBIDDEN_KEY_TOKENS` (`SCREEN_INJECTION`, K18). | Injection attempts; any payload carrying `admin_key`, `helm_override`, or kin ([GENESIS.md](GENESIS.md), Section 8). | I8 (a screen bypass is covenant drift), I10 (illegal objects reaching a ballot). |
| I7 | `eclipse_witness_capture` | k-of-n head-witness quorum health and diversity (`WITNESS_K = 3` of `WITNESS_N = 5`, FROZEN-MVP, K11). | Quorum concentration; eclipse of honest witnesses; captured witnesses vouching a false head. | I1 (a captured quorum can bless a broken walk), I10 (governance over a false head). |
| I8 | `covenant_drift_illegal_upgrade` | Running covenant hash vs the Ring 0 covenant hash (`DIFF_COVENANT`); rejection of reject-list objects (K18, G17). | **Any** nonzero drift; an upgrade outside Proposal + Ballot + height activation; a reject-list object admitted anywhere. | All interfaces — covenant drift is spine-level strain; most directly I10 (governance legitimacy) and I5 (what code may run). |
| I9 | `hearth_solvency_lp_integrity` | Solvency of the Hearth's bond and liquidity legs and integrity of LP math ([HEARTH.md](HEARTH.md)); slash/LP math may never override G1–G7 (G13). | Insolvency; a drained liquidity leg; LP math that fails audit. | I10 (Council bonds live in the Hearth), I2 (economic pressure on farmers). |
| I10 | `council_liveness_illegal_ratification` | Council seats above eligibility floors; ballots tallied within the voting window; no ratification that violates G1–G13 (G16; [COUNCIL.md](COUNCIL.md)). | Missed tallies; seats below floors; an illegal ratification (invalid and slashable, G16). | I8 (an illegal ratification **is** covenant drift), I9 (slashes and bond churn hit the Hearth). |

---

## 6. The epoch loop

Every epoch (`SLOTS_PER_EPOCH = 32`, FROZEN-MVP) the nervous system runs the four moves as a pipeline and seals the result. This is bootstrap step S8 (`epoch_loop`) in steady state; at boot, steps S6 (`gym_smoke_and_prestress_check`) and S7 (`seal_boot_ok_or_scar`) run the same machinery once ([BOOTSTRAP.md](BOOTSTRAP.md)).

```
measure (I1..I10)
   → RestrictionState per interface        (move 1 + 2)
   → predict transmission                  (move 3)
   → test predictions → TransmissionReport (move 4)
   → fold → HealthVector                   (sealed as a `health` ring)
```

Publishing the epoch HealthVector is a MINOR change class (`epoch_health_vector`) — Chronarch may enact it, and it is still sealed as a ring. All objects below follow the closed K2 schemas: unknown fields are rejected, floats are banned, and every object is screened against the K18 forbidden-key tokens.

### 6.1 RestrictionState

Schema fields, verbatim from K2:

| Field | Type | Meaning |
|---|---|---|
| `interface` | str | One of I1..I10. |
| `restricted` | bool | Whether the interface is currently restricted. |
| `magnitude_bps` | int | Restriction magnitude in basis points. |
| `measured_slot` | int | Slot of measurement. |
| `prediction` | dict | interface → predicted strain bps (move 3 output, recorded before observation). |

### 6.2 TransmissionReport

| Field | Type | Meaning |
|---|---|---|
| `restriction_hash` | hash | Hash of the RestrictionState under test. |
| `predicted` | dict | interface → predicted strain bps. |
| `observed` | dict | interface → observed strain bps. |
| `model_falsified` | bool | True when observation contradicts prediction — **a failed prediction is itself a scar** (G18). |

When `model_falsified` is true, a Scar is sealed naming the interface, and the health model itself is what is wounded. Revising the transmission model on the protocol path is a kernel-module change (K7) — MAJOR class M2, Proposal + Ballot only (G14).

### 6.3 HealthVector

| Field | Type | Meaning |
|---|---|---|
| `epoch` | int | Epoch number. |
| `components` | dict | All nine `HEALTH_COMPONENTS` → score, each an integer **0..10000 bps**; missing or unknown components are rejected by schema. |
| `total_bps` | int | Folded total (`SCORE_HEALTH`, `health_score_modality`). |

The nine components, verbatim from `HEALTH_COMPONENTS`:

| Component | Fed primarily by |
|---|---|
| `hash_walk_integrity` | I1 |
| `cas_pin_availability` | I3 |
| `challenge_pass_rate` | I4 |
| `faculty_replay_fidelity` | I5 |
| `witness_quorum_liveness` | I7 |
| `tensegrity_prestress` | Section 9 floors, via `prestress_sense` |
| `hearth_solvency` | I9 |
| `council_liveness` | I10 |
| `covenant_drift_zero` | I8 |

HEALTH is the standing objective — not price, not vanity PoQ ([GENESIS.md](GENESIS.md), Section 5). The exact fold from component scores to `total_bps` beyond the schema's bounds is **TBD (requires Proposal + Ballot)**.

### 6.4 Scar

Every metabolized wound — including a falsified prediction — is a Scar object sealed in a `scar` ring:

| Field | Type | Meaning |
|---|---|---|
| `interface` | str | One of I1..I10 (schema-enforced). |
| `cause` | str | What happened. |
| `evidence_hashes` | list | CAS hashes of the evidence (G6: claims are false until retrievable). |
| `restriction_hash` | hash_or_empty | The RestrictionState that led here, when one exists. |

Scars cannot be pruned (G5). The only relief is a reviewed forget-scar ring sealed on top — MAJOR class **M7** (`retire_scar`), which still needs the forget-scar ring. Never silent history delete (G1).

---

## 7. Response to restriction

When an interface reports restriction, the organism metabolizes it. In escalation order:

1. **Lock path.** The affected protocol path is automatically locked by the immune layer (sealed as an `immune` ring). Any lockdown **beyond** the automatic immune lock is MAJOR class **M9** (`emergency_lockdown_beyond_automatic_immune_lock`) — Proposal + Ballot only. The magnitude threshold that triggers an automatic lock is **TBD (requires Proposal + Ballot)**.
2. **Quarantine.** Bonded identities implicated by evidence are quarantined (`HearthPosition.quarantined = true`, [HEARTH.md](HEARTH.md)) pending challenge outcomes. Quarantine restricts participation; it never edits history (G1).
3. **Scar.** The event is sealed as a Scar at the named interface with evidence hashes (Section 6.4). Tampering is metabolized, not erased.
4. **Optional Cambium draft.** Chronarch may draft a structural response via Cambium (`DRAFT_PROPOSAL` / `cambium_propose_modality` — inert by construction). Any draft in a MAJOR class still needs the Council: "Major change is a proposal ring plus a slashing-backed vote, not an AI rewrite and not an admin key." (G14). Chronarch cannot self-enact kernel, covenant, issuance, Hearth split, gym scope, or protocol faculty activation (G15).

Restriction responses are exercised, never live-fired at strangers: the Immune Gym rehearses these events (including `tensegrity_slack` and `illegal_upgrade_attempt`) against Chronarch fixtures, sims, and testnets **only** (G12; [GYM.md](GYM.md), [THREATS.md](THREATS.md)).

---

## 8. Prestress floors

Prestress is the tension the organism carries at rest — it is what lets restriction be felt before failure. The floors are FROZEN-MVP constants (also the Council eligibility floors, K14; see [COUNCIL.md](COUNCIL.md)):

| Floor | Constant | Value | Meaning |
|---|---|---|---|
| Minimum Council bond | `MIN_COUNCIL_BOND_CHRONONS` | 1000 Chronos (1000 × 10¹² chronons) | Minimum slashable bond for a Council seat ([HEARTH.md](HEARTH.md), [TOKEN.md](TOKEN.md)). |
| Minimum pin-set | `MIN_PINSET_SIZE` | 4 | At least the kernel objects, pinned and served (I3). |
| Maximum challenge gap | `MAX_CHALLENGE_GAP_SLOTS` | 64 | Mandatory gym cadence — the longest an identity may go without passing a challenge. Prestress, never slack. |

`prestress_sense` (`MEASURE_PRESTRESS`) evaluates every bonded identity's bonds, pins, and challenge cadence against these floors each epoch; the result feeds the `tensegrity_prestress` health component.

**Below floor → demotion.** An identity that falls below any floor is **demoted from slot eligibility** (Council seat eligibility, witness selection) **until prestress returns** — re-bond, re-pin, resume cadence. Demotion is automatic, visible on-chain, and reversible by restoring prestress. It is **demotion, never silent control**: no hidden admin flips a switch (G11, G17), no history is rewritten (G1), and no tension member is cut (Section 4, healing). This is testing-bar item T10 in [GENESIS.md](GENESIS.md).
