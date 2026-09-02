# HOME.md — The Durable Node Home + Resume

A stopped node must come back as the **same organism**: same identity, same
ledger height, same head hash. A node with a `home=` directory persists what
it needs on disk and replays it through the frozen Timechain on the next boot.
A node with no home stays fully in-memory (so tests stay fast).

> Plots prove space. CAS stores memory. The **home** is where a node keeps its
> identity, its ledger, and its pin lane between restarts — the ledger is
> JSONL-shaped node state and is **never** stored inside a `.cseal`.

---

## 1. Layout

```
home/
  identity        the node identity string (the organism's name)
  space_units     the farmed integer space units (the lottery weight)
  space.cseal     a byte-for-byte copy of the farmed .cseal (file-backed only)
  pins/           the PinStore directory (the on-disk CAS pin lane, PINS.md)
  ledger/
    log.jsonl     append-only sealed rings + block headers + slot headers
    head.json     the O(1) resume commitment {height, head_hash}
  boot.json       the last boot-ok receipt (a BootReport, no extra keys)
  journal.jsonl   optional operator notes (off-chain; never replayed, LAB.md)
```

`boot.json` is the boot receipt **verbatim** — exactly the `BootReport` fields
(`identity`, `steps`, `boot_ok`, `kernel_hash`, `ring0_hash`) and nothing
more. Its `kernel_hash` / `ring0_hash` are what a resume checks the current
genesis against.

## 2. Booting with a home

```python
Node(identity, 1, home="node-home/")            # abstract units, durable
Node(identity, space_path="f.cseal", home="h/") # file-backed, durable
Node(identity, 1)                               # in-memory (no home)
```

**Fresh home** (no `identity` file yet): the node boots normally, then writes
`identity`, `space_units`, and `boot.json`. A file-backed node copies its
`.cseal` to `home/space.cseal`. An **abstract** node mirrors its boot CAS onto
`home/pins/` so it honors its own committed `cas_root` across a restart (a
later withhold is then a real I3). A file-backed node's `cas_root` is the
`.cseal`'s own commitment, so its pin lane stays operator-managed (PINS.md) —
the home never overwrites it.

**Existing home** (resume): the home is authoritative.

1. `identity` is loaded from the home (a throwaway identity passed by the
   caller is ignored — the home names the organism).
2. `space.cseal` is reopened if present; otherwise `space_units` is recovered,
   so the resumed node farms the same weight and elects the same leaders.
3. `home/pins/` is reopened as the CAS pin lane.
4. `boot.json`'s `kernel_hash` / `ring0_hash` MUST match this node's genesis,
   else **`HOME_KERNEL_MISMATCH`** — a home never resumes under a different
   kernel.
5. `home/ledger/log.jsonl` is replayed through the frozen Timechain (§3).

Persistence resumes after boot: every new ledger ring, block header, and slot
header is appended to `log.jsonl` as it is produced or applied from gossip,
and `head.json` is refreshed after the ledger advances.

## 3. Replay is fail-closed

Ring 0 is rebuilt from the current kernel; the log holds the rings above it.
Each stored ring is re-sealed into the Timechain and its recomputed hash is
checked against the recorded `ring_hash`. Replay **raises** (and the node does
not resume) on:

- a **truncated / corrupt** log line (a crash mid-append leaves a partial tail
  line — a resuming node never guesses past it);
- a **hash-broken** ring (a stored object whose bytes no longer hash to its
  recorded `ring_hash`, or a broken prev-link);
- a **head commitment** (`head.json`) that disagrees with the replayed rings
  (a short or forked chain);
- a **kernel / Ring 0** hash that drifts from `boot.json` → `HOME_KERNEL_MISMATCH`.

A genuinely different-kernel home fails twice over: the recorded receipt is
caught first, and even without it the very first stored ring's `prev_ring_hash`
points at the old Ring 0, so its re-sealed hash cannot match. Scars are never
wiped on resume — the replayed chain carries them forward exactly (G5).

## 4. CLI

```
chronarch serve --home DIR [--space path.cseal | --space N]
chronarch home inspect --home DIR
```

`serve --home` resumes the home; `--space` may be omitted on an existing home
(the home's space wins) and is required only to lay out a fresh one. `home
inspect` resumes the home **read-only** and prints JSON: `{identity, height,
pins_ok, space_units}`. Inspecting an uninitialized directory is a `BAD_HOME`
error and never creates a home.

## 5. What the home is not

- **Not a `.cseal`.** The ledger is JSONL node state; putting rings inside a
  space file is a rejected idea (BUILD_LOG) — it destroys both the space proof
  and the data model. `home/ledger/log.jsonl` starts with JSON, never the
  `CSL1` magic.
- **Not a silent kernel migration.** Resuming under a drifted kernel is
  `HOME_KERNEL_MISMATCH`, never a quiet re-genesis.
- **Not rewards, not chiapos.** Reward issuance and real plot/VDF backends are
  out of scope here.
- **Not the journal.** `home/journal.jsonl` is operator notes beside the home
  (`chronarch journal`): off-chain, never replayed, never sealed, K18-screened
  so a Proposal body cannot hide in it. See [../docs/LAB.md](../docs/LAB.md).

---

One command runs the whole organism on a home — farm, pin-check, attest
compute, credit Chronos — and reports: `chronarch pulse --home DIR`. See
[PULSE.md](PULSE.md).

A home that belongs to a net also carries `home/peers.json` — the canonical
fleet (`{identity, space_units}` per peer), so a bare `Node(home=DIR)` resumes
the net without a conductor; a peers file that disagrees with the home's own
identity/units is `PEERS_MISMATCH` (fail closed). See [PEERS.md](PEERS.md).

See [FARMER.md](FARMER.md) for booting from a `.cseal`, [PINS.md](PINS.md) for
the pin lane a home reopens, and [SPACEFILE.md](SPACEFILE.md) for why a space
file never holds the ledger.
