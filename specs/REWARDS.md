# REWARDS.md — Chronos Issuance for Space, Pins, and Compute

Chronos is **blood, not conscience** (G2). Rewards pay for the work that keeps
the organism alive — reserved space, honored pins, attested compute — and they
pay **nothing** for judgment. A reward can never flip a Challenge, ratify a
Ballot, buy salience, or move a vote. The credit ledger is separate from
consensus: it is never gossiped, never sealed into the Timechain, never read by
the lottery, the Hearth, the Council, or the challenge engine.

> Chronos buys blood, never conscience. No credit rewards a Challenge pass, a
> Ballot yes, a self-PoQ score, an LLM draft, or a hat role.

This is the concrete per-slot crediting. The abstract K12 router table
(`REWARD_ROUTER_BPS`) and the halving schedule in [TOKEN.md](TOKEN.md) are a
separate, unchanged FROZEN-MVP concern (altering either stays M4).

---

## 1. Emission schedule (integers only — no floats)

Each **winning slot** emits a flat `SLOT_REWARD_CHRONONS`, split into four
integer shares that always sum to it (pinned next to the token constants in
`chronarch_spec.constants`):

| Share | Constant | Value (chronos) | To whom |
|---|---|---:|---|
| SPACE | `SPACE_SHARE_CHRONONS` | 40 | the slot leader's `farmer_id` (homage to XCH farming) |
| PIN | `PIN_SHARE_CHRONONS` | 12 | split across the slot's **pin-ok** farmers (0 if pins_ok is false) |
| COMPUTE | `COMPUTE_SHARE_CHRONONS` | 8 | split across attested compute receipts' workers |
| TREASURY | `TREASURY_SHARE_CHRONONS` | 4 | a protocol sink account (`chronos:treasury`, **not** an admin key) |
| **SLOT_REWARD** | `SLOT_REWARD_CHRONONS` | **64** | — |

All arithmetic is integer. When a share splits across N accounts, each gets
`share // N` and the floor-division **dust** goes to the treasury, so a slot
mints exactly `SLOT_REWARD_CHRONONS` — no chronon is created or lost.

**No reward for:** a Challenge pass, a Ballot yes, a self-PoQ score, an LLM
draft, or a hat role. The router has no parameter for any of them.

## 2. Router

```python
reward_slot(slot, leader_id, pin_ok_ids=[], compute_receipts=[]) -> list[Credit]
Credit = {account, amount, reason, slot}   # reason ∈ {space, pin, compute, treasury}
```

- **SPACE** → `leader_id`, always (the leader won the slot's space lottery).
- **PIN** → split across `pin_ok_ids`. If **no** farmer's pins verify this slot
  (`pins_ok` false), no farmer is paid the pin share — a pin-failing farmer is
  **never** paid — and the unpaid pin share folds into the treasury sink.
- **COMPUTE** → split across `compute_receipts` (each names a `worker`
  account). Every receipt is an **attested** ComputeReceipt — a DummyMind
  faculty replay or a gym oracle that verifies; an unattested job never reaches
  the router (see [COMPUTE.md](COMPUTE.md)). **Documented choice:** with no
  attested receipt this slot, the compute share **folds into the treasury
  sink** (it is never left unissued).
- **TREASURY** → the fixed treasury share **plus** every unpaid remainder above.

A `Credit` is inert accounting: it grants no salience, no vote weight, no
lottery weight. `Credit(..., reason="ballot_yes")` is rejected — a reward
literally cannot name a governance reason.

## 3. Accounts

Accounts are plain identity strings: a `farmer_id`, a pin operator, a compute
worker, and the treasury sink. A **Hearth-bonded** identity MAY receive credits
(a farmer is often also bonded), but the credit lands only in the reward
ledger — it does **not** touch the Hearth position, so it changes no bond leg,
no liquidity leg, no salience multiplier, and no vote weight. The salience
clamp math is untouched (tested).

## 4. The node ledger

A node credits every slot it wins (`produce_slot` → `reward_slot`). Credits are
kept in an in-memory list (`node.reward_credits`); a node with a durable home
also appends each credit to `home/rewards.jsonl` and reloads it on resume.
`node.submit_compute_receipt(receipt)` buffers an attested compute receipt for
the next won slot; the buffer is consumed each slot.

The reward ledger is **not** the Timechain: it is never replayed through the
frozen chain, never gossiped, and never part of a slot's consensus messages
(the sealed economic ring body carries no credit list).

## 5. CLI

```
chronarch rewards inspect --home DIR
```

JSON out: `{totals: {space, pin, compute, treasury}, last_slot, credits}`. It
reads `home/rewards.jsonl` directly (no ledger replay). An uninitialized home
is `BAD_HOME`; a home that never won a slot reports empty totals.

## 6. What Phase 14 is not

Not an AMM. Not a change to the Hearth 50/50 lock split or the salience clamp.
Not chiapos. Not a Council feature. It does **not** pay the
`prevention_catalog` modality. It does not fork a second token — every credit
is denominated in the same Chronos chronons as the rest of the protocol.

---

Changing any share, the treasury rule, or the emission is **M4**
(`issuance_reward_router_hearth_split_unbond_delay`) — a Proposal ring plus a
slashing-backed Ballot, never an AI rewrite and never an admin key
([TOKEN.md](TOKEN.md) §8, [COUNCIL.md](COUNCIL.md), G14/G15/G17).
