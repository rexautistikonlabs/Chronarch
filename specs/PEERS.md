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

## 3a. Join is a vote (Phase 19)

After genesis, the fleet does **not** change by editing `peers.json` — that is a
`PEERS_MISMATCH`. Adding or removing a peer is a **major change**: a Proposal
ring plus a slashing-backed Council vote (G14), the same path as any other
major change. There is no admin peer key, no helm that adds a validator, and no
AI rewrite of the fleet.

A **PeerChange** is a closed, K18-screened body carried in a Council Proposal's
`changes` under the key `peer_change`:

```json
{"kind": "peer_add" | "peer_remove", "identity": "…", "space_units": N}
```

It rides as an **M6** membership proposal (`council_thresholds_or_membership_floors`),
an existing major class — so no kernel module or genesis hash changes. The flow:

1. **Draft** — `chronarch peers propose --home DIR --kind … --identity ID
   --units N` builds and validates the Proposal; it returns the `proposal_id`
   and `MAJOR_NEEDS_COUNCIL`. Proposing enacts nothing (the `peers.json` file is
   untouched). A `peer_add` of a peer already in the fleet, or a `peer_remove`
   of one that is absent, is `PEERS_MISMATCH`.
2. **Vote** — the proposal goes through the Council machine exactly like any
   other: `submit_proposal` → `attach_reports` → `cast_ballot` (bonded seats,
   ballot liens) → `tally` (≥2/3 eligible weight **and** a seat majority).
3. **Ratify** — once `tally` returns `approved` and the activation height
   (`ACTIVATION_DELAY_SLOTS`) is reached, `net.ratify_peer_change(homes,
   council, proposal_id, at_slot=…)` obtains the Council's `make_peer_grant`
   bridge (the body comes from Council storage, so a forged proposal cannot
   reach here) and applies the add/remove to `home/peers.json` on every
   established member — identical bytes on all of them. The lottery then weighs
   the new fleet.

**Fail closed, and slash the abuse.** No tally, a rejected/expired outcome, or
the wrong height is `PEERS_MISMATCH` and leaves every `peers.json` unchanged. An
**illegal** peer change (a value that trips `check_legality`, e.g. an identity
crafted to read like a G1 repeal) is caught in `tally`: outcome `invalid`, every
yes-voter slashed, and an **I8** scar sealed — exactly as for any illegal
ratification (G16). Chronarch may *draft* a PeerChange (Cambium, inert) but has
no verb that activates it (there is no peer-apply verb in the agent's
`ALLOWED_VERBS`) — it can never self-enact one (G15).

Ratification amends an **established** fleet; it does not conjure a `peers.json`
on a home that has none. A brand-new peer's home is initialised and synced
separately — joining an already-running net is not the same as being voted into
its fleet.

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
