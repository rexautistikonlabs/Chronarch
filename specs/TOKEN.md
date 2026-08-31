# TOKEN.md — Chronos Economics (K3/K12)

Chronos is the metabolic token of the Chronarch organism — the blood that pays fees, wages, rewards, and the Hearth, and nothing more. It carries energy through the body; it does not carry judgment. No amount of Chronos can flip a Challenge outcome, legalize an invalid Ballot, delete a scar, or activate a faculty. This document fixes the unit system, the zero-premine issuance schedule, the seven-way per-slot reward router, the community proposal deposit, the treasury sink, and the explicit list of things Chronos can never buy. Every number here is quoted from the kernel constants module (`K3_chronos_economic_params`, `K12_reward_router`); tests fail if this page and the code drift.

Status: v0 draft — sim/MVP values are FROZEN-MVP; changing them post-genesis is a MAJOR change (G14).

---

## 1. Blood, not conscience (G2)

The fifth covenant line, verbatim: **"Chronos is blood, not conscience"**. From the helm slogan: "Chronarch proposes. The Timechain remembers. The tensegrity feels. The Council stewards. Chronos is blood, not conscience."

What Chronos **does**:

- pays transaction **fees**;
- pays **wages** for protocol work (farming, pinning, compute, gym work, council operations — see the reward router, [Section 4](#4-reward-router-k12));
- pays per-slot **rewards** via the router;
- funds and flows through the **Hearth** — one lock, two legs (`HEARTH_BOND_LEG_BPS = 5000` bond, `HEARTH_LIQUIDITY_LEG_BPS = 5000` liquidity, both FROZEN-MVP; see [HEARTH.md](HEARTH.md)).

What Chronos **is not** (G2: "Judgment is not for sale. Chronos cannot flip Challenge / PoQ attestation."):

- It cannot buy votes that override G1..G13 — a Council yes on a proposal violating G1–G13 is invalid and slashable regardless of the bond behind it (G16), and Hearth slash / LP math cannot override G1–G7 (G13).
- It cannot flip a **Challenge** outcome or PoQ attestation (G2, G10).
- It cannot flip **Ballot validity** — legality is ruled by the kernel, not by weight (G16, G17).
- The Hearth salience overlay it funds applies to retrieval **ranking only**, clamped to `SALIENCE_CLAMP_MIN_BPS = 2500` (0.25x) .. `SALIENCE_CLAMP_MAX_BPS = 40000` (4.00x), never to Challenge outcomes or Ballot validity (G2; see [HEARTH.md](HEARTH.md)).

**Vote weight = bonded slashable Chronos.** Council vote weight is the Hearth bond leg — Chronos locked, slashable, and subject to `UNBOND_DELAY_SLOTS = 32` (FROZEN-MVP) so slashes land before exit. The Council eligibility floor is `MIN_COUNCIL_BOND_CHRONONS = 1000 Chronos` (FROZEN-MVP). Weight buys a *voice under slashing risk*, never legality: approval requires yes bond weight ≥ 2/3 of eligible bond weight **and** yes seats > 1/2 of eligible seats, measured against eligible totals (see [COUNCIL.md](COUNCIL.md)).

---

## 2. Units

| Constant | Value | Notes |
|---|---|---|
| `CHRONONS_PER_CHRONOS` | 10^12 (1,000,000,000,000) | 1 Chronos = 10^12 **chronons** — the smallest unit (homage to mojos). |

All consensus amounts are **integer chronons**. Floats are banned from consensus objects by the codec (K2). Ratios are basis points (bps, 1/10000).

---

## 3. Issuance

**Zero premine, no founder allocation, no admin mint** — `PREMINE_CHRONONS = 0`. There is no admin key, founder override, or helm override anywhere in the protocol (G17, K18 reject list; see [GENESIS.md](GENESIS.md)). All Chronos that will ever exist enters through the per-slot reward router.

| Constant | Value | Status |
|---|---|---|
| `PREMINE_CHRONONS` | 0 | Constitutional (G11, G17) |
| `BASE_REWARD_PER_SLOT_CHRONONS` | 64 × 10^12 chronons (64 Chronos) per slot | FROZEN-MVP |
| `HALVING_INTERVAL_SLOTS` | 2^20 (1,048,576) slots | FROZEN-MVP (sim value) |

Issuance per slot starts at `BASE_REWARD_PER_SLOT_CHRONONS` and **halves every `HALVING_INTERVAL_SLOTS` slots**. As an arithmetic consequence of these two sim-frozen values (not an independent constant), total sim issuance is bounded above by 2 × 64 × 2^20 = 134,217,728 Chronos.

These are **sim-frozen** values. **The mainnet issuance schedule is an M4 MAJOR change** (`M4: issuance_reward_router_hearth_split_unbond_delay`) — Proposal + Ballot only (G14, G15). Mainnet schedule: TBD (requires Proposal + Ballot).

---

## 4. Reward router (K12)

Every slot's issuance is split by the reward router — seven shares in basis points, verbatim from `REWARD_ROUTER_BPS`, which **must sum to 10000**. The whole table is FROZEN-MVP; changing any row is M4.

| Share | bps | Pays for (one line each) |
|---|---|---|
| `farmer_plot_share` | 3500 | The PLOT LANE — proofs of space that give the organism a body; plots prove space and never store rings, embeddings, or weights ([ARCHITECTURE.md](ARCHITECTURE.md)). |
| `pin_share` | 1500 | The CAMBIUM/CAS LANE — keeping pinned objects retrievable and byte-exact; a pin failure is a nervous event at I3, not a lost file ([NERVOUS.md](NERVOUS.md)). |
| `compute_share` | 1000 | Announced protocol compute (bootstrap step S5) serving challenge replay and faculty verification work ([BOOTSTRAP.md](BOOTSTRAP.md)). |
| `stake_lp_share` | 1500 | Hearth stakers — one lock, two legs: slashable bond plus protocol liquidity inventory ([HEARTH.md](HEARTH.md)). |
| `immune_gym_share` | 1000 | Immune Gym work against Chronarch fixtures/sim/testnet targets only (G12; [GYM.md](GYM.md)). |
| `council_ops_share` | 300 | **Pays published tallies/reports, never a yes vote** — council operations are paid for the act of publishing, regardless of outcome (G2; [COUNCIL.md](COUNCIL.md)). |
| `treasury_share` | 1200 | The protocol-owned liquidity sink ([Section 6](#6-treasury)). |
| **Total** | **10000** | Kernel-asserted: `sum(REWARD_ROUTER_BPS.values()) == 10000`. |

Reward accounting on the protocol path runs through the seed faculty `reward_accounting_sense` (opcode `SUM_REWARDS`) — a K5 kernel primitive, not authored code (G3, G4).

---

## 5. Deposits

Community proposals bond `COMMUNITY_PROPOSAL_DEPOSIT_CHRONONS = 100 × 10^12 chronons` (100 Chronos, FROZEN-MVP). The deposit is **slashed on gym-fraud** (fraudulent gym claims or targets; see [GYM.md](GYM.md) and the gym case catalog). Any refund path beyond the slash rule: TBD (requires Proposal + Ballot).

The deposit is anti-spam prestress, not a purchase: posting it buys admission of a proposal ring into the pipeline of [COUNCIL.md](COUNCIL.md), never a favorable tally (G2).

---

## 6. Treasury

`treasury_share` (1200 bps of every slot's issuance) accrues to **protocol-owned liquidity (POL)** — a sink, not a discretionary fund. Treasury Chronos is:

- **not** spendable by Chronarch (G15 — the helm cannot self-enact issuance or Hearth-split changes);
- **not** spendable by any Council member, operator, or founder unilaterally (G17 — no admin key, no founder override);
- spendable **only via Proposal + Ballot** — a treasury spend touches issuance/router/Hearth economics and is therefore MAJOR class **M4** (`issuance_reward_router_hearth_split_unbond_delay`), subject to the thresholds and activation delay of [COUNCIL.md](COUNCIL.md) (G14).

---

## 7. What Chronos can never do

Every row below is a conformance target in [GYM.md](GYM.md)/[THREATS.md](THREATS.md) (e.g. gym cases `council_bribe_to_pass_challenge` — must fail — and `fake_admin_key_tx`, `fake_helm_override_tx` — must reject).

| Attempted purchase | Outcome | Law |
|---|---|---|
| Flip a Challenge outcome / PoQ attestation | Transaction **rejected** + **Scar sealed at interface I8** ([NERVOUS.md](NERVOUS.md)) | G2, G10 |
| Flip Ballot legality (ratify a proposal violating G1–G13) | Vote **invalid** + voters **slashed** | G16, G13 |
| Buy scar deletion | **Impossible** — scars cannot be pruned; only a reviewed forget-scar ring (MAJOR class M7) may be sealed on top | G5 |
| Buy faculty activation on the protocol path | **No purchase path exists** — activation is MAJOR class **M3** (`activate_authored_faculty_on_protocol_path`), Proposal + Ballot only | G4, G15 |
| Buy an admin key, founder override, or helm override | **No such object exists** — any tx/config carrying one is rejected at admission, scarred at I8, and slashed if signed by a bonded identity (K18 reject list, [GENESIS.md](GENESIS.md)) | G11, G17 |

Security slogan, verbatim: "Tampering is detectable, expensive, incomplete, and metabolized into a scar."

---

## 8. Amendment

Changing **anything on this page** — units, issuance, halving, the router table, the deposit, the treasury rule — is MAJOR:

- **M1** (`covenant_or_genesis_param_change`) where the change touches covenant or genesis parameters (also a hard fork, G7);
- **M4** (`issuance_reward_router_hearth_split_unbond_delay`) for issuance, the reward router, the Hearth split, or the unbond delay.

The only path is a **Proposal ring plus a slashing-backed Ballot** per [COUNCIL.md](COUNCIL.md) (G14). Chronarch may draft such a proposal (Cambium, inert by construction) but can never enact it (G15). No key, no founder, no helm, and no Council shortcut bypasses Proposal + Ballot + height activation (G17).

"Major change is a proposal ring plus a slashing-backed vote, not an AI rewrite and not an admin key."
