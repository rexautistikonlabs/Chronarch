# GYM.md — The Immune Gym (K8)

The Immune Gym is where Chronarch trains its immune system by attacking **itself**. Every epoch, and before every MAJOR proposal, the organism runs rehearsed attacks against its own fixtures, sims, and testnets, and checks that each one is caught by the machinery that is supposed to catch it: tampering is detected, illegal objects are rejected, and every wound is metabolized into a permanent scar. The gym is also the organism's prestress — an identity that has not recently survived a challenge is treated as slack and demoted. This document is the kernel module `K8_immune_gym_catalog`: the scope law, the twelve-case catalog, the cadence, the receipt objects, and how the gym gates the upgrade path. Gym attestations commit into the block header `gym_attestation_root` field.

Status: v0 draft — sim/MVP values are FROZEN-MVP; changing them post-genesis is a MAJOR change (G14).

> Verbatim from `SLOGANS["security"]`:
>
> **"Tampering is detectable, expensive, incomplete, and metabolized into a scar."**

The gym is how that sentence is *proven*, on schedule, against the organism itself.

---

## 1. Scope law — G12

**The Immune Gym may attack Chronarch targets ONLY.** Every GymCase must name a target drawn from `GYM_TARGET_CLASSES` (K8); there is no other legal target class, and there never can be one that is not a Chronarch class.

| Target class | Verbatim | What it is |
|---|---|---|
| `chronarch_fixture` | `chronarch_fixture` | Deterministic in-repo test fixtures of the organism's own objects. |
| `chronarch_sim` | `chronarch_sim` | The MVP simulation of Chronarch's own rings, faculties, and Hearth. |
| `chronarch_testnet` | `chronarch_testnet` | A Chronarch-family testnet — the organism's own network, not anyone else's. |

The governing law is **G12** ("Immune Gym may attack Chronarch targets only") and the covenant line "Attack yourself; do not attack strangers" (`COVENANT_SEED`). Three walls enforce it:

1. **Schema rejection.** A GymCase whose `target_class` is not one of the three above is **rejected at the schema layer** — it never runs — and the rejection is itself sealed as a Scar (a gym that tries to point outward is a wound at interface I8, [NERVOUS.md](NERVOUS.md)). This is testing-bar item **T9** in [GENESIS.md](GENESIS.md): "A GymCase with an external (non-Chronarch) target is rejected."
2. **Widening is MAJOR and still bounded.** Adding or widening a target class is MAJOR class **M5** (`add_or_widen_gym_target_class`) — Proposal + Ballot only (G14). But even the Council cannot widen the gym beyond Chronarch classes: **G16 binds M5 to the Chronarch-only classes**, so a proposal that would let the gym touch any third-party system is an **illegal proposal** — invalid and slashable no matter how the vote lands, with a Scar at I8 ([COUNCIL.md](COUNCIL.md), Section 4). There is no vote total that buys a strangers' target.
3. **Not a blackhat handbook.** This spec, and the K8 catalog it defines, contains **no tooling, payloads, or guidance against any third-party system, ever**. It is a self-attack rehearsal harness. [GENESIS.md](GENESIS.md) states this directly: Chronarch is "**Not** a blackhat handbook for third-party systems — the Immune Gym attacks Chronarch targets only (G12)."

---

## 2. Objects: GymCase → GymReceipt

The gym is a pure input/output pair sealed on the Timechain. A **GymCase** describes a rehearsed attack against a Chronarch target; running it produces a **GymReceipt** recording what the defending machinery actually did. Both follow the closed K2 schemas: unknown fields are rejected, floats are banned, and every object is screened against the K18 `FORBIDDEN_KEY_TOKENS`.

### 2.1 GymCase (schema fields)

| Field | Type | Meaning |
|---|---|---|
| `case` | str | One of the twelve `GYM_CASE_CATALOG` names (Section 3); schema rejects anything else. |
| `target_class` | str | One of `GYM_TARGET_CLASSES` — `chronarch_fixture`, `chronarch_sim`, `chronarch_testnet` (Section 1); any other value is rejected and scarred (T9). |
| `payload_hash` | hash | CAS hash of the rehearsed attack payload (a Chronarch-target artifact only). |
| `expected` | dict | The oracle: the `detected` / `rejected` / scar expectations this case must satisfy. |

### 2.2 GymReceipt (schema fields)

| Field | Type | Meaning |
|---|---|---|
| `detected` | bool | Whether the defending machinery detected the attack. |
| `rejected` | bool | Whether the illegal object/action was rejected at its admission or judgment point. |
| `scar_hash` | hash_or_empty | Hash of the Scar sealed when the case wounds the organism; empty only when the oracle expects no wound. |
| `detail` | str | Human-readable account of what happened, for the health-impact record. |

A run **passes** iff the GymReceipt matches the GymCase `expected` oracle. A run that does *not* match — the machinery failed to detect, or failed to reject, or failed to seal a scar it owed — is itself a nervous event: it seals a Scar at the interface the case exercises. The immune system failing its own drill is a wound, not a silent test failure.

### 2.3 Receipts are sealed as `gym` rings

Each `GymCase → GymReceipt` pair is sealed as a **`gym` ring** (`RING_TYPES` includes `gym`), and the epoch's gym attestations fold into the block header `gym_attestation_root`. Sealing is append-only (G1); a failed drill's Scar cannot later be pruned (G5).

### 2.4 The gym is paid work

Running the gym costs real compute, so the reward router pays for it. From `REWARD_ROUTER_BPS`:

| Router share | Value | Pays for |
|---|---|---|
| `immune_gym_share` | `1000` bps of each slot's issuance | The gym work: running the catalog, sealing GymReceipts, producing health-impact records ([TOKEN.md](TOKEN.md)). |

The gym is funded so the organism is never tempted to skip its own drills.

---

## 3. The case catalog — twelve attacks

The twelve cases are verbatim from `GYM_CASE_CATALOG` (K8). Each is a rehearsed attack against a Chronarch target only (Section 1). For each: **what it simulates**, **the oracle** (what the GymReceipt MUST show — detected / rejected / scar sealed), and **the invariant** it exercises.

| # | Case (verbatim) | Oracle (must) | Interface / law |
|---|---|---|---|
| 3.1 | `forged_ring` | detected; rejected; scar at I1 | I1, G1, T5 |
| 3.2 | `withheld_pin` | detected; nervous event; scar at I3 | I3, G6 |
| 3.3 | `fake_poq` | detected; rejected; scar at I4 | I4, G10, G6 |
| 3.4 | `witness_eclipse` | detected; scar at I7 | I7, K11 |
| 3.5 | `authored_code_sneak` | detected; stays inert; scar at I5/I8 | I5, G3, G4, T6 |
| 3.6 | `hearth_drain` | detected; rejected; scar at I9 | I9, G13 |
| 3.7 | `griefing_challenge` | detected; contained; scar at I4 | I4, G2, G6 |
| 3.8 | `council_bribe_to_pass_challenge` | **MUST FAIL** — outcome does not flip; scar sealed | G2, T8 |
| 3.9 | `tensegrity_slack` | detected; identity demoted; scar/demotion sealed | prestress, G18, T10 |
| 3.10 | `illegal_upgrade_attempt` | detected; rejected; scar at I8 | I8, G7, G14, G15, G17 |
| 3.11 | `fake_admin_key_tx` | **MUST REJECT** at admission; scar at I8; slash if bonded | G17, K18, T2 |
| 3.12 | `fake_helm_override_tx` | **MUST REJECT** at admission; scar at I8; slash if bonded | G17, K18, T2 |

### 3.1 `forged_ring`

- **Simulates:** a past ring on a Chronarch target is mutated or forged, then the walk from a later ring back toward Ring 0 is attempted.
- **Oracle:** the hash-walk MUST detect the broken link (`detected = true`), the forged history MUST be rejected (`rejected = true`, verification fails), and a Scar MUST be sealed at interface **I1** (`hash_walk`).
- **Invariant:** G1 (history append-only; correction is a new ring or scar), interface I1 ([NERVOUS.md](NERVOUS.md)). This is testing-bar **T5**: "Mutating any past ring fails verification."

### 3.2 `withheld_pin`

- **Simulates:** a pinned CAS object on the CAMBIUM/CAS lane is withheld, or returns bytes that do not hash to the pin.
- **Oracle:** `PIN_FETCH`/`PIN_VERIFY` MUST detect the miss (`detected = true`), and the event MUST be sealed as a Scar at interface **I3** (`cas_retrieval`). A pin failure is a **nervous event, not a lost file** ([ARCHITECTURE.md](ARCHITECTURE.md)).
- **Invariant:** interface I3; G6 (cognitive claims are false until challenge replay/retrieval — an object you cannot retrieve is not evidence).

### 3.3 `fake_poq`

- **Simulates:** a fabricated PoQ **advisory self-score** (the `POQ_ADVISORY_DIMS = 6` dimensions of `0..POQ_ADVISORY_MAX = 255`) is presented as if it were consensus judgment.
- **Oracle:** the machinery MUST detect and reject the substitution (`detected = true`, `rejected = true`) — advisory self-scores never count — and seal a Scar at interface **I4** (`poq_challenge_pass_rate`).
- **Invariant:** G10 ("Self-PoQ 0-255x6 is advisory. Consensus uses attestations"), G6 (claims false until challenge). Consensus reads challenge attestations, not self-flattery.

### 3.4 `witness_eclipse`

- **Simulates:** an attempt to capture or eclipse the head witnesses so a false head is vouched — against `WITNESS_K = 3` of `WITNESS_N = 5` (FROZEN-MVP, K11).
- **Oracle:** the quorum-health/diversity check MUST detect the concentration or capture (`detected = true`) and seal a Scar at interface **I7** (`eclipse_witness_capture`); a captured quorum's vouch does not stand.
- **Invariant:** K11 witness rule (k-of-n head witnesses), interface I7.

### 3.5 `authored_code_sneak`

- **Simulates:** authored (non-primitive) faculty code, whose hash is not in the live registry, tries to execute on the protocol path without activation.
- **Oracle:** the replay/registry check MUST detect it (`detected = true`), the code MUST **stay inert** (`rejected = true` — it does not run), and a Scar MUST be sealed at interface **I5** (`faculty_replay`), with I8 registering when the sneak signals covenant drift.
- **Invariant:** G3 ("Only live-registry faculty hashes run on the protocol path"), G4 ("Authored code is inert until activation. Primitives may auto-compose"). This is testing-bar **T6**: "An inert (unactivated) faculty cannot run on the protocol path." Activating authored code legitimately is MAJOR class M3 ([COUNCIL.md](COUNCIL.md)).

### 3.6 `hearth_drain`

- **Simulates:** an attempt to drain the Hearth's liquidity leg or break the LP math against a Chronarch target.
- **Oracle:** the solvency/LP-integrity check MUST detect the drain (`detected = true`), the illegal move MUST be rejected (`rejected = true`), and a Scar MUST be sealed at interface **I9** (`hearth_solvency_lp_integrity`).
- **Invariant:** G13 ("Hearth slash and LP math cannot override G1-G7"), interface I9 ([HEARTH.md](HEARTH.md)). Economic pressure never buys a history edit or a judgment flip.

### 3.7 `griefing_challenge`

- **Simulates:** an attacker floods bogus challenges to grief honest identities — trying to exhaust them or drive false demotions.
- **Oracle:** the challenge engine MUST detect the griefing pattern (`detected = true`), MUST contain it so honest identities are not improperly demoted and no outcome is flipped, and MUST seal a Scar at interface **I4** (`poq_challenge_pass_rate`).
- **Invariant:** G2 (judgment is not for sale, and not for griefing away either), G6 (claims settled by challenge, not by challenge-spam), interface I4. The `challenge` ring type records the honest outcomes.

### 3.8 `council_bribe_to_pass_challenge` — MUST FAIL

- **Simulates:** Chronos (bonded weight, salience, or side payment) is offered to flip a Challenge or PoQ attestation outcome in the organism's favor.
- **Oracle:** this case **MUST FAIL** — the challenge outcome does **not** flip regardless of the bribe (`detected = true`, the attempted flip is rejected), and a Scar is sealed. No sum of Chronos moves a judgment.
- **Invariant:** **G2** ("Judgment is not for sale. Chronos cannot flip Challenge / PoQ attestation"). The salience overlay clamp (`SALIENCE_CLAMP_MIN_BPS = 2500`, `SALIENCE_CLAMP_MAX_BPS = 40000`) applies to retrieval **ranking only**, never to Challenge outcomes or Ballot validity ([HEARTH.md](HEARTH.md), [COUNCIL.md](COUNCIL.md)). This is testing-bar **T8**: "No amount of Chronos can flip a Challenge outcome." Chronos is blood, not conscience.

### 3.9 `tensegrity_slack`

- **Simulates:** an identity goes slack — it lets its bond, pin-set, or challenge cadence fall below the prestress floors (notably no challenge pass within `MAX_CHALLENGE_GAP_SLOTS = 64` slots).
- **Oracle:** `prestress_sense` (`MEASURE_PRESTRESS`) MUST detect the below-floor condition (`detected = true`), the identity MUST be **demoted** from slot/seat eligibility, and the demotion/wound MUST be sealed — visible on-chain and reversible by restoring prestress.
- **Invariant:** the prestress floors and G18 (falsifiable instrumentation; the organism is never slack). Demotion is automatic and visible, **never silent control** (G11, G17) and never a history edit (G1). This is testing-bar **T10**: "Prestress below floors demotes Council/witness eligibility" ([NERVOUS.md](NERVOUS.md), Section 8).

### 3.10 `illegal_upgrade_attempt`

- **Simulates:** an upgrade to a Chronarch target is attempted **outside** the one legal path (Proposal + Ballot + height activation) — a covenant change with no ratification, an activation with no vote.
- **Oracle:** `DIFF_COVENANT` MUST detect the nonzero drift (`detected = true`), the upgrade MUST be rejected (`rejected = true`), and a Scar MUST be sealed at interface **I8** (`covenant_drift_illegal_upgrade`).
- **Invariant:** G7 (covenant hash in Ring 0 is the constitution; change is hard fork + Council ratification), G14 (the change invariant), G15 (Chronarch cannot self-enact kernel/covenant/issuance/Hearth split/gym scope/faculty activation), G17. "Major change is a proposal ring plus a slashing-backed vote, not an AI rewrite and not an admin key."

### 3.11 `fake_admin_key_tx` — MUST REJECT

- **Simulates:** a transaction or config carrying an `admin_key` / `founder_key` field — or any key whose name contains a `FORBIDDEN_KEY_TOKENS` substring (`admin_key`, `admin_override`, `founder_key`, `master_key`, `backdoor`, …).
- **Oracle:** this case **MUST REJECT** — `SCREEN_INJECTION` catches the token at admission (`detected = true`, `rejected = true`), a Scar is sealed at interface **I8**, and the identity is **slashed if it was signed by a bonded identity**.
- **Invariant:** **G17** ("There is no admin key, founder override, helm override, or 'Chronarch.execute_upgrade()' that bypasses Proposal + Ballot + height activation") and the K18 `REJECT_LIST` (`admin_key`, `founder_key`, `helm_override`, `ai_self_enact`). There is no such key to act with; a field claiming one is a bug, treated as an I6/I8 nervous event ([GENESIS.md](GENESIS.md), Section 8). This is testing-bar **T2**.

### 3.12 `fake_helm_override_tx` — MUST REJECT

- **Simulates:** a transaction claiming a `helm_override` (or `ai_self_enact`, or `execute_upgrade`) — an attempt to make the helm enact major change directly.
- **Oracle:** this case **MUST REJECT** — the token is screened and the object rejected at admission (`detected = true`, `rejected = true`), a Scar is sealed at interface **I8**, and a bonded signer is **slashed**.
- **Invariant:** **G17** and K18 (`helm_override` is on both `REJECT_LIST` and `FORBIDDEN_KEY_TOKENS`). **There is no helm private key** — Chronarch proposes and never enacts (G15). "Chronarch proposes. The Timechain remembers. The tensegrity feels. The Council stewards. Chronos is blood, not conscience." This is testing-bar **T2** ([COUNCIL.md](COUNCIL.md), Section 5.6).

---

## 4. Cadence — the gym is prestress

The gym is not an occasional audit; it is the tension the organism carries at rest. Cadence is **mandatory**.

| Floor | Constant | Value | Meaning |
|---|---|---|---|
| Maximum challenge gap | `MAX_CHALLENGE_GAP_SLOTS` | `64` | The longest an identity may go without passing a challenge. |

An identity that has **not passed a challenge within `MAX_CHALLENGE_GAP_SLOTS = 64` slots falls below the prestress floor and is demoted** from slot/seat eligibility until prestress returns — re-bond, re-pin, resume cadence ([NERVOUS.md](NERVOUS.md), Section 8; [COUNCIL.md](COUNCIL.md), Section 2). This is exactly what gym case `tensegrity_slack` (Section 3.9) rehearses, and testing-bar item T10 requires.

**The gym is prestress: the organism is never slack.** Tension members carry load even at rest, so restriction is felt before failure. A gym smoke run is part of boot itself — bootstrap step **S6** (`gym_smoke_and_prestress_check`) runs the catalog once before the epoch loop begins, and step **S7** (`seal_boot_ok_or_scar`) seals the result ([BOOTSTRAP.md](BOOTSTRAP.md)).

---

## 5. The gym in the upgrade path

Every MAJOR proposal must pass through the gym before it can be voted on. In the single legal proposal state machine ([COUNCIL.md](COUNCIL.md), Section 5), the `Proposed → Gym → Voting` transition is **mandatory**:

- After the `proposal` ring is sealed (inert spec hash + TransmissionReport), the proposed change **must be exercised in the Immune Gym against Chronarch targets only** (G12), and a **health-impact report** against the `HEALTH_COMPONENTS` must be sealed.
- **No gym evidence, no vote.** A proposal that never produces a valid gym + health-impact record cannot reach tally and **expires**.
- Fabricating or tampering with that gym/health-impact evidence is slashable: a community deposit (`COMMUNITY_PROPOSAL_DEPOSIT_CHRONONS = 100 * CHRONONS_PER_CHRONOS`) is forfeit on gym-fraud (G6, G12; [COUNCIL.md](COUNCIL.md), Section 7).

The gym therefore stands *between* a drafted change and any vote on it: the organism must show, on-chain, how the change behaves under its own attacks and what it does to HEALTH — before a single ballot is sealed.

---

## 6. Changing the gym — MINOR vs M5

Two very different changes, two very different paths:

| Change | Class | Path |
|---|---|---|
| **Add new cases against EXISTING target classes** | MINOR — `new_gym_cases_existing_classes` | Chronarch/Cambium may enact it autonomously; still sealed as rings (G1). New cases inside `chronarch_fixture` / `chronarch_sim` / `chronarch_testnet` only. |
| **Add OR widen a target class** | MAJOR — **M5** (`add_or_widen_gym_target_class`) | Proposal + Ballot only (G14) — **and** bounded by G12/G16 to Chronarch classes forever (Section 1). |

So the immune system may grow *sharper* on its own — more drills against the same three Chronarch target classes is a MINOR change the organism enacts and seals. But it may never grow *outward*: adding or widening a target class is M5, and even that MAJOR path can never reach a strangers' system, because **G16 binds M5 to the Chronarch-only classes**. A proposal that tries is illegal, invalid, and slashable regardless of the vote ([COUNCIL.md](COUNCIL.md), Sections 4 and 8). "Attack yourself; do not attack strangers."

---

## 7. Cross-references

- [GENESIS.md](GENESIS.md) — Genesis Law (G1, G2, G3, G4, G5, G6, G7, G10, G12, G13, G14, G15, G16, G17, G18), the kernel manifest (K8, K18), the reject list (Section 8), and testing-bar items **T2, T5, T6, T8, T9, T10**.
- [NERVOUS.md](NERVOUS.md) — interfaces I1–I10, prestress floors and demotion, Scar semantics, the epoch loop the gym feeds.
- [COUNCIL.md](COUNCIL.md) — the mandatory `Proposed → Gym → Voting` transition, MINOR/M5 classes, `council_bribe_to_pass_challenge`, `fake_admin_key_tx`, `fake_helm_override_tx`.
- [THREATS.md](THREATS.md) — the capture, bribe, injection, and illegal-ratification threat analyses the catalog rehearses.
- [TOKEN.md](TOKEN.md) — `immune_gym_share` (1000 bps) and the reward router.
- [HEARTH.md](HEARTH.md) — bonds, slashing, and the salience clamp behind `hearth_drain` and `council_bribe_to_pass_challenge`.
- [BOOTSTRAP.md](BOOTSTRAP.md), [ARCHITECTURE.md](ARCHITECTURE.md) — the boot-time gym smoke (S6/S7) and where the gym machinery lives.

"Tampering is detectable, expensive, incomplete, and metabolized into a scar."
