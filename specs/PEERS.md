# PEERS.md — The Persisted Peer/Space Table

A net home records the fleet it belongs to in **`home/peers.json`** — a
canonical list of `{identity, space_units}` sorted by identity. It is the one
thing that lets a stopped net home come back **without a hidden conductor**: a
bare `Node(home=DIR)` reads the fleet from this file and uses it as the lottery
table and the slot-header validator set. No process has to pass the fleet in.

> The fleet is data the operators agree on, written identically on every home —
> not an admin key, not a discovery service, not a public directory.

---

## 1. The file

```json
[{"identity":"net-node-0","space_units":1},{"identity":"net-node-1","space_units":2}]
```

- A **closed schema**: each entry is exactly `{identity, space_units}` — a
  foreign key (a `chronos`, a `vote`, an `admin_key`) is rejected (K18 +
  exact-key check).
- **Integer units only** (floats banned by the canonical codec); each unit is a
  positive integer; identities are distinct.
- **Canonical bytes**: sorted by identity, minimal-separator JSON, so every home
  in the same fleet writes the file **byte-for-byte identically**.

## 2. Who writes it

`net_run` writes/refreshes `peers.json` on **every** home in the run, from the
fleet it planned (each home's own recorded identity + units). It writes the same
canonical bytes to all of them. `pulse` (a single home) writes **no** peers file
— a lone home's table is just `{its identity: its units}`.

## 3. Who reads it, and the fail-closed rule

A resuming `Node(home=DIR)` that is **not** handed an explicit `space_table`
adopts `peers.json` as its fleet — before ledger replay, so peer-led slot
headers verify. Two checks fail closed as **`PEERS_MISMATCH`**:

- the home's **own** identity must appear in the fleet with its **own** recorded
  `space_units` — a home never farms a fleet that disagrees with what it is;
- a corrupt or schema-invalid `peers.json` is rejected (never silently
  repaired).

`net_run` adds a third: before writing, an **existing** `peers.json` that
disagrees with the planned fleet is `PEERS_MISMATCH` — the net refuses to
**silently rewrite** a different fleet over one already on disk.

When the caller passes an explicit `space_table` (as `net_run` does while
driving a round), that table is used directly; `net_run` still does its own
peers agreement check.

## 4. Why it does not change who wins

`peers.json` only **persists** the same integer space units the lottery already
used. Given the same units and the same eligible set, `slot_leader` elects the
identical winners — adopting the fleet from a file rather than from a conductor
changes nothing about the draw. A resumed net and a fresh net over the same
units produce the same leaders (tested).

## 5. CLI

```
chronarch net status --homes DIR1,DIR2
```

Read-only (boots no node, writes nothing). JSON per home: `identity`, persisted
`height` + `head_hash`, `peer_count`, and `peers_ok` — true only when the peers
file is valid AND names that home's own identity/units. Exits non-zero if any
home's peers are not ok.

## 6. What this is NOT

- **Not DHT / internet discovery.** The file lists a fleet the operators already
  agreed on; nothing is discovered over a network.
- **Not an admin peer key.** No entry grants authority; the fleet is weights for
  the lottery, and a forbidden key is rejected.
- **Not a change to who wins.** It persists units, it does not re-weight them.
- **Not public.** Still one process, N home dirs, the in-process bus
  ([NET.md](NET.md)).

---

See [NET.md](NET.md) for the net that writes this file and [HOME.md](HOME.md)
for the durable home it lives in.
