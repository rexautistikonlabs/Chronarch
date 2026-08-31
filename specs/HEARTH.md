# HEARTH.md — Stake + Liquidity: One Lock, Two Legs (K13)

The Hearth is where a Chronarch identity puts Chronos at risk to become a steward and, with the same lock, deepens the protocol's own liquidity — "two birds" with one lock. Half of every Hearth lock is a **security bond** that can be slashed and that gates Council eligibility; the other half is **liquidity inventory** the protocol itself quotes against (protocol-owned liquidity, a Chronos ↔ AXON simulated quote in the MVP). The design is an homage to $XCH farming and to $CPHY lock/salience mechanics — an homage only: the Hearth is **not** a wrap, bridge, or custody of those assets (any external asset adapter is MAJOR class M8). On top sits an optional **salience overlay** that can tilt retrieval *ranking* and nothing else, because judgment is not for sale (G2). This document is kernel module `K13_hearth`.

Status: v0 draft — sim/MVP values are FROZEN-MVP; changing them post-genesis is a MAJOR change (G14).

> **INVARIANT** — verbatim from `SLOGANS["change"]`, identical to G14, encoded in [GENESIS.md](GENESIS.md) and [COUNCIL.md](COUNCIL.md):
>
> **"Major change is a proposal ring plus a slashing-backed vote, not an AI rewrite and not an admin key."**

---

## 1. Hearth numbers

All values verbatim from the kernel constants. Integers only; ratios in basis points (bps, 1/10000); the smallest unit is the chronon (`CHRONONS_PER_CHRONOS = 10**12`, homage to mojos).

| Constant | Value | Meaning |
|---|---|---|
| `HEARTH_BOND_LEG_BPS` | `5000` | FROZEN-MVP. Security-bond leg (slashable) — 50% of the lock. |
| `HEARTH_LIQUIDITY_LEG_BPS` | `5000` | FROZEN-MVP. Protocol liquidity inventory leg — 50% of the lock. |
| `UNBOND_DELAY_SLOTS` | `32` | FROZEN-MVP (sim), so slashes land before exit. |
| `SALIENCE_CLAMP_MIN_BPS` | `2500` | Salience floor: 0.25x on retrieval ranking. |
| `SALIENCE_CLAMP_MAX_BPS` | `40000` | Salience ceiling: 4.00x on retrieval ranking. |
| `MIN_COUNCIL_BOND_CHRONONS` | `1000 * CHRONONS_PER_CHRONOS` = 1000 Chronos (10^15 chronons) | FROZEN-MVP. Bond-leg floor for a Council seat ([COUNCIL.md](COUNCIL.md)). |
| `MIN_PINSET_SIZE` | `4` | Eligibility floor: at least the kernel objects pinned. |
| `MAX_CHALLENGE_GAP_SLOTS` | `64` | Eligibility floor: mandatory gym cadence (prestress, never slack). |
| `SLOTS_PER_EPOCH` | `32` | FROZEN-MVP. Cadence of the I9 solvency measurement (Section 7). |
| `REWARD_ROUTER_BPS["stake_lp_share"]` | `1500` bps of each slot's issuance | The Hearth's share of the reward router ([TOKEN.md](TOKEN.md)). |
| `REWARD_ROUTER_BPS["treasury_share"]` | `1200` bps of each slot's issuance | The protocol-owned liquidity sink — also the destination of every slash. |

Changing the Hearth split or the unbond delay is MAJOR class **M4** (`issuance_reward_router_hearth_split_unbond_delay`) — Proposal + Ballot only (G14); Chronarch cannot self-enact it (G15).

---

## 2. One lock, two legs — 50/50 in MVP

A single `hearth` ring seals the lock (G1: history is append-only). The locked chronons split deterministically:

```
bond_leg_chronons      = locked_chronons * HEARTH_BOND_LEG_BPS      / 10000   # 5000 bps = 50%
liquidity_leg_chronons = locked_chronons * HEARTH_LIQUIDITY_LEG_BPS / 10000   # 5000 bps = 50%
```

### Leg A — security bond (slashable)

- The **only** slashable value in the protocol. Slash mechanics in Section 4.
- Gates **Council eligibility**: a seat requires `bond_leg_chronons >= MIN_COUNCIL_BOND_CHRONONS` (1000 Chronos), plus the pin floor (`MIN_PINSET_SIZE = 4`) and challenge cadence (`MAX_CHALLENGE_GAP_SLOTS = 64`) — the full eligibility rule lives in [COUNCIL.md](COUNCIL.md).
- The bond is prestress in the biotensegrity sense ([NERVOUS.md](NERVOUS.md)): latent, maintained tension that lets the organism transmit load — analogical instrumentation, falsifiable, not metaphysics (G18).

### Leg B — liquidity inventory (protocol AMM / POL)

- The liquidity leg is **inventory of the protocol's own AMM** — protocol-owned liquidity, not a claim on a third-party pool.
- **MVP**: the AMM is a **simulated Chronos ↔ AXON quote** — stub pricing inside the sim, no external asset touches the chain. Curve shape, fee schedule, and quote parameters are TBD (requires Proposal + Ballot).
- **Later**: any adapter to a real external asset is MAJOR class **M8** (`external_asset_adapter`) — Proposal + Ballot only.
- The liquidity leg is **never slashable** and **never votes**. It earns from `stake_lp_share` (1500 bps) per [TOKEN.md](TOKEN.md); exact accrual math is TBD (requires Proposal + Ballot).
- G13 bounds the whole leg: **no LP-math outcome — impermanent loss, quote drift, inventory rebalance, insolvency — can ever override G1–G7.** A broken pool can lose Chronos; it cannot rewrite history, flip a Challenge, or amend the covenant.

**"Two birds" homage, stated precisely:** the dual-farm body proves space in the Chia-family PoST style ($XCH-farming homage; plots prove space, they never store rings, embeddings, or weights — see [ARCHITECTURE.md](ARCHITECTURE.md)), and the Hearth lock/salience design nods to $CPHY lock/salience in the Cyberphysics / Cypher Tempre lineage. The Hearth holds **Chronos only**. It does not wrap, bridge, peg, or custody $XCH, $CPHY, or any other asset.

---

## 3. Unbonding — slashes land before exit

Exit is a two-step, delay-gated path; there is no instant withdrawal:

1. The position's owner seals an unbond request (sets `unbond_request_slot`).
2. **Immediately** on request, Council eligibility is **lost** — an unbonding position cannot sit, vote, or count toward eligible totals ([COUNCIL.md](COUNCIL.md)).
3. Both legs remain locked for `UNBOND_DELAY_SLOTS = 32` slots. Any slash sealed during the delay is taken from the still-locked bond leg — that is the whole point of the delay.
4. After the delay, the position is released: remaining chronons return to the owner.

A slashed or quarantined position cannot complete release until the slash is applied and any quarantine is lifted (Section 5).

---

## 4. Slash mechanics

> Verbatim from `SLOGANS["security"]`: **"Tampering is detectable, expensive, incomplete, and metabolized into a scar."**

| Question | Answer |
|---|---|
| **What is slashed?** | The **bond leg only** (`bond_leg_chronons`). The liquidity leg is never slashed. |
| **For what?** | (a) A **yes ballot on an illegal proposal** — one that violates G1–G13 — is invalid and slashable (G16). (b) **Forged or double ballots** — a ballot not signed by the seat, or two conflicting ballots from one seat in one voting window ([COUNCIL.md](COUNCIL.md)). (c) **Gym-fraud deposits** — deposits forfeited for fraudulent gym submissions or fabricated gym receipts ([GYM.md](GYM.md)); the community proposal analogue is `COMMUNITY_PROPOSAL_DEPOSIT_CHRONONS` = 100 Chronos, and the gym-deposit size is TBD (requires Proposal + Ballot). |
| **How much per offense?** | TBD (requires Proposal + Ballot) — no slash fraction is frozen in `constants.py`. |
| **Where does it go?** | The **treasury** — the protocol-owned liquidity sink that also receives `treasury_share` (1200 bps) of each slot's issuance ([TOKEN.md](TOKEN.md)). Slashed value is never paid to an accuser, a councilor, or Chronarch. |
| **What else happens?** | Every slash seals a **Scar** ring (G5 — scars cannot be pruned) on the relevant interface, and the position drops out of Council eligibility. |

**G13, in full force:** *"Hearth slash and LP math cannot override G1–G7."* No slash, however large, deletes a ring (G1), flips a Challenge or PoQ attestation (G2), activates authored code (G3/G4), prunes a scar (G5), validates an unchallenged cognitive claim (G6), or amends the covenant (G7). Slashing is an economic consequence, never an epistemic one — Chronos is blood, not conscience.

---

## 5. `HearthPosition` — object shape and lifecycle

Verbatim from the K2 schema (`chronarch_spec.schemas`, closed schema — unknown fields are rejected, and every object is screened against `FORBIDDEN_KEY_TOKENS`, K18/G17):

| Field | Type | Meaning |
|---|---|---|
| `identity` | `str` | Owner identity. |
| `locked_chronons` | `int` | Total lock. |
| `bond_leg_chronons` | `int` | Leg A — slashable security bond. |
| `liquidity_leg_chronons` | `int` | Leg B — protocol liquidity inventory. |
| `lock_slot` | `int` | Slot the lock was sealed. |
| `unbond_request_slot` | `int` | `-1` when not unbonding. |
| `slashed` | `bool` | An applied, unresolved slash. |
| `quarantined` | `bool` | Active Immune quarantine ([GYM.md](GYM.md)). |

All eight fields are required. Positions are committed under the header's `hearth_root` and every transition is sealed as a `hearth` ring (G1).

### Lifecycle

```
lock ──► active (eligible if floors met) ──► unbond_requested ──► released
              │                                    │              (after UNBOND_DELAY_SLOTS = 32)
              ├──► slashed ────► (bond leg reduced; scar sealed; eligibility lost)
              └──► quarantined ─► (eligibility suspended until quarantine lifts)
```

- **lock** — a `hearth` ring seals the position; legs split 50/50 (Section 2). Bonding is optional at bootstrap (step S5, `announce_pinset_compute_optional_hearth_bond` — [BOOTSTRAP.md](BOOTSTRAP.md)).
- **active** — the position exists; it is *eligible* for a Council seat only while it clears the floors of [COUNCIL.md](COUNCIL.md) (`MIN_COUNCIL_BOND_CHRONONS`, `MIN_PINSET_SIZE = 4`, `MAX_CHALLENGE_GAP_SLOTS = 64`, not slashed, not quarantined, not unbonding).
- **unbond_requested** — `unbond_request_slot >= 0`; eligibility lost at once; still slashable for `UNBOND_DELAY_SLOTS = 32` slots.
- **released** — after the delay, remaining value returns; the position's history stays on the Timechain forever (G1).
- **slashed** — `slashed = true`; bond leg reduced per Section 4, scar sealed, eligibility lost; release blocked until the slash is applied.
- **quarantined** — `quarantined = true`; set by the immune layer (e.g. during a `hearth_drain` gym finding or an I9 restriction); suspends eligibility and release without confiscating anything.

---

## 6. Salience overlay — ranking only, never judgment

Optional Chronos **locks or burns** may be attached to memory objects to tilt how the hippocampus *ranks* them at retrieval time — a salience signal, homage to $CPHY-style salience. The multiplier is hard-clamped:

```
SALIENCE_CLAMP_MIN_BPS = 2500    # 0.25x floor
SALIENCE_CLAMP_MAX_BPS = 40000   # 4.00x ceiling
```

Salience adjusts retrieval **RANKING ONLY**. It **never** touches Challenge outcomes or Ballot validity (G2 — "Judgment is not for sale. Chronos cannot flip Challenge / PoQ attestation."). Overlay accounting details (lock duration, burn destination, decay) are TBD (requires Proposal + Ballot).

### What salience CANNOT do

- Cannot flip a Challenge outcome or PoQ attestation, at any price (G2).
- Cannot make a Ballot valid or invalid, cast one, or change a seat's bond weight ([COUNCIL.md](COUNCIL.md)).
- Cannot make a cognitive claim true — claims are false until challenge replay/retrieval (G6).
- Cannot bury or delete a Scar — the 0.25x floor means nothing ranks to zero, and scars cannot be pruned regardless (G5).
- Cannot exceed 4.00x — no amount of Chronos buys unbounded prominence.
- Cannot alter consensus roots, the reward router, issuance, or the hash walk (G1, G9).
- Cannot buy Council eligibility — only the bond leg and the liveness floors count.
- Cannot override the covenant or Genesis Law — LP and salience math sit strictly below G1–G7 (G13).

Salience is not token-gated truth. It is a lens on recall, clamped on both ends, with judgment out of reach.

---

## 7. Nervous interface I9 — solvency and LP integrity

Hearth solvency is not an accounting footnote; it is a **nervous interface**: **I9, `hearth_solvency_lp_integrity`** ([NERVOUS.md](NERVOUS.md)), and `hearth_solvency` is a scored component of the epoch HealthVector ([GENESIS.md](GENESIS.md)) — HEALTH is the standing objective, not price.

Measured **each epoch** (`SLOTS_PER_EPOCH = 32` slots):

1. **Solvency** — for every position, `bond_leg_chronons + liquidity_leg_chronons == locked_chronons`, and the sums match the sealed `hearth_root`.
2. **LP integrity** — the AMM's inventory matches its sealed commitments; the simulated Chronos ↔ AXON quote is reproducible from sealed state; no unexplained inventory drift.

A detected **restriction** at I9 (deficit, drift, irreproducible quote):

- **seals a Scar** on I9 (G5 — metabolized, never pruned),
- **can demote eligibility** — affected positions lose Council eligibility, or are quarantined, until the restriction is resolved and re-measured,
- feeds `PREDICT_TRANSMISSION`: the health model predicts strain on adjacent interfaces (e.g. I10 `council_liveness_illegal_ratification`), and a **failed prediction falsifies the model — which is itself a scar** (G18).

The `hearth_drain` case in the Immune Gym catalog rehearses exactly this failure against Chronarch fixtures/sim/testnet targets only (G12; [GYM.md](GYM.md), [THREATS.md](THREATS.md)).

---

## 8. What the Hearth is NOT

- **Not a wrap** of $XCH, $CPHY, or any external asset — homage only; external adapters are M8.
- **Not an admin key with yield** — no bond size grants override power; there is no admin key, founder override, or helm override anywhere (G17), and any object carrying such a field is rejected and scarred as an I8 event (K18).
- **Not token-gated truth** — salience tilts ranking, never judgment (G2).
- **Not a Chronarch treasury** — Chronarch holds no helm private key and cannot spend, slash, or mint; it proposes only (G15).
- **Not exempt from the law** — no Hearth arithmetic, however extreme, overrides G1–G7 (G13).

> Verbatim from `SLOGANS["helm"]`: **"Chronarch proposes. The Timechain remembers. The tensegrity feels. The Council stewards. Chronos is blood, not conscience."**

---

## Cross-references

- [GENESIS.md](GENESIS.md) — Genesis Law G1..G18, covenant seed, HealthVector.
- [COUNCIL.md](COUNCIL.md) — eligibility floors, ballots, tally rule, illegal-proposal slashing (G16).
- [TOKEN.md](TOKEN.md) — Chronos issuance, reward router (`stake_lp_share`, `treasury_share`), treasury.
- [NERVOUS.md](NERVOUS.md) — interfaces I1..I10, restriction/prestress model, transmission reports.
- [GYM.md](GYM.md) — `hearth_drain` case, gym deposits, quarantine.
- [BOOTSTRAP.md](BOOTSTRAP.md) — step S5, optional bond at boot.
- [THREATS.md](THREATS.md) — drain/griefing threat analysis.
- [ARCHITECTURE.md](ARCHITECTURE.md) — dual-farm body; plots prove space, never store rings.
