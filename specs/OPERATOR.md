# OPERATOR.md — Running a Chronarch Lab Net

This is the operator path: the commands that stand up a **local lab net**, earn
Chronos, and change the fleet through a real Council vote. Every step is a
`chronarch` CLI command with JSON on stdout, and the whole sequence is exercised
as a test (`tests/test_operator_path.py`) — the loop below is executable, not
prose.

> **This is a lab net, not mainnet.** One process, a handful of home
> directories, the in-process bus. There is no public network, no peer
> discovery, no chiapos plots, and no AMM. It is not CHIP-48, not Chia
> mainnet, and not a claim about consciousness — it is a working model of the
> protocol's mechanics.

Throughout, `A`, `B` are home directories (say `~/chronarch/a`, `~/chronarch/b`)
and `SOLO` is a separate home for the single-node pulse. Use fresh dirs for a
fresh lab net.

---

## 1. Set up (no install step)

Chronarch is a no-install monorepo (kernel law G11): clone, put the packages on
`PYTHONPATH`, run.

```
python -m venv .venv && . .venv/bin/activate
export PYTHONPATH="$(ls -d packages/*/src | tr '\n' ':')"
```

Every command below is `python -m chronarch_cli <verb> …`.

## 2. Pulse one home

Run the whole organism on one home — farm a slot, check pins, attest a DummyMind
compute job, credit Chronos.

```
python -m chronarch_cli pulse --home SOLO
```

**JSON keys:** `identity`, `height`, `won_slots`, `credits_by_reason`
(`space`/`pin`/`compute`/`treasury`), `pins_ok`, `i3`, `head_hash`. A fresh pulse
wins its own slots, so `won_slots ≥ 1` and `credits_by_reason.space > 0`. (Use a
home of its own for the pulse — do not reuse it as a net home, since a pulsed
home is already ahead of a fresh peer.)

## 3. Run a two-home net

Stand up a two-home net on the in-process bus; the homes gossip slots and
converge on one head, and each writes the fleet to `home/peers.json`.

```
python -m chronarch_cli net --homes A,B --slots 4
```

**JSON keys:** `converged` (true when every home holds the same `head_hash` and
`height`), `leaders` (the elected leader per slot), and `homes[]` of `{identity,
height, won_slots, credits_by_reason, head_hash}`. Exit is non-zero unless the
net converged. Fresh homes are named `net-node-0` (1 unit) and `net-node-1`
(2 units).

## 4. Propose a peer-set change

Adding a peer is a **major change (M6)** — a Proposal ring plus a slashing-backed
vote (G14), never an admin key. This submits the proposal to home A's persistent
Council and opens voting; it enacts nothing (`peers.json` is untouched).

```
python -m chronarch_cli peers propose --home A --kind peer_add --identity net-node-2 --units 3
```

**JSON keys:** `proposal_id`, `status` = `MAJOR_NEEDS_COUNCIL`, `major_class`
(`M6`), `proposer`, `kind`, `identity`, `space_units`, `note`. A `peer_add` of a
peer already in the fleet (or a `peer_remove` of one that is absent) is
`PEERS_MISMATCH`.

## 5. Ballot from each steward

The fleet **is** the Council: each identity in `peers.json` is a bonded steward
with a seat. Cast a ballot for **each** steward on the Council home (A), naming
the steward's identity. This is the real Ballot path — bond weight, eligibility,
ballot liens, and a double-vote slash all apply.

```
python -m chronarch_cli council ballot --home A --proposal-id peer-peer_add-net-node-2 --identity net-node-0 --vote yes
python -m chronarch_cli council ballot --home A --proposal-id peer-peer_add-net-node-2 --identity net-node-1 --vote yes
```

**JSON keys per ballot:** `proposal_id`, `seat`, `identity`, `vote`, `status` =
`cast`.

## 6. Tally, and ratify onto every home

Tally through the frozen `tally()` (≥2/3 of eligible bond weight **and** a seat
majority). When the outcome is `approved` and `--homes` is given, the approved
PeerChange is ratified onto each home's `peers.json`.

```
python -m chronarch_cli council tally --home A --proposal-id peer-peer_add-net-node-2 --homes A,B
```

**JSON keys:** `proposal_id`, `outcome` (`approved` | `rejected` | `expired` |
`invalid`), `yes_seats`, `eligible_seats`, `activation_slot`, `slashes`, and —
on an approved PeerChange with `--homes` — `ratified: true` and `applied` (the
`{kind, identity, space_units}` body). Omit `--homes` and an approved change
reports `needs_ratify: true` instead. An **illegal** proposal never ratifies:
`outcome` is `invalid`, every yes-voter is slashed, and an **I8** scar is sealed
(G16) — see [PEERS.md](PEERS.md).

## 7. Net status

Read the fleet back (no node booted, nothing written).

```
python -m chronarch_cli net status --homes A,B
```

**JSON keys:** `homes[]` of `{identity, height, head_hash, peer_count,
peers_ok}`. After step 6 the `peer_count` is 3 and `peers_ok` is true on both
homes — the ratified fleet now includes `net-node-2`, and the lottery weighs it.

## 8. Pulse still works

The single-home loop is untouched by any of the above:

```
python -m chronarch_cli pulse --home SOLO2
```

Same keys as step 2; `won_slots ≥ 1`.

---

## What this path proves

- Two homes **converge** on one head over the in-process bus (step 3).
- A peer-set change **needs a vote**: proposing enacts nothing (step 4), and
  only a passed, slashing-backed ballot ratifies it (steps 5–6).
- An approved change updates every home's fleet and the lottery **sees the new
  units** (steps 6–7).
- The single-home pulse keeps working throughout (step 8).

It does **not** prove mainnet readiness, real proof-of-space, networked
consensus, or anything beyond the mechanics above. See
[ARCHITECTURE.md](ARCHITECTURE.md) for the design, [PEERS.md](PEERS.md) for
governance of the fleet, [NET.md](NET.md) for the net, and [PULSE.md](PULSE.md)
for the single-home loop.
