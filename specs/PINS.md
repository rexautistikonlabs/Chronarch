# PINS.md — The On-Disk CAS Pin Lane

The pin lane is the disk form of the CAMBIUM/CAS lane
([DUAL_FARM.md](DUAL_FARM.md)): a directory of content-addressed objects that
stores the organism's **memory** — rings, faculties, gym fixtures, embedding
commitments. It is bound to a farmer's SpaceSeal by the `cas_root`
commitment, but it is a **separate** store from the `.cseal` plot file.

> Plots prove space. CAS stores memory. A pin failure is a nervous event, not
> a lost file — and never a space defect.

---

## 1. PinStore

`chronarch_core.PinStore(directory)`:

- `put(data, kind="object") -> hash` — store bytes addressed by SHA-256.
  `kind="object"` requires canonical consensus-object bytes (a JSON dict) and
  screens them for **K18** forbidden keys; `kind="opaque"` stores raw
  non-consensus bytes. Any bytes that parse as a dict are K18-screened
  regardless of kind, so a forbidden object cannot be smuggled in as opaque.
- `get(hash) -> bytes | None` — `None` means the pin is missing (an I3 event).
- `verify(hash) -> bool` — the stored object's bytes hash to its name.
- `pins() -> [hash]`, `cas_root()` — the current pin set and its root.
- `withhold(hash)` — delete a pin (models a withholding farmer).

## 2. pinset_root (the cas_root)

```
cas_root = pinset_root(hashes) = chash("CasRoot", {"pins": sorted(unique(hashes))})
```

A **domain-separated sorted-list hash** (not a full Merkle tree). It matches
the frozen `chronarch_farm.cas_root_of` formula, so a PinStore holding the
same pins as a CAS produces the same `cas_root` — which is exactly what a
SpaceSeal commits to.

## 3. Binding to a SpaceSeal (verify_pins)

A `.cseal`'s `cas_root` is a **commitment only**. `verify_pins(space_seal,
pin_store, slot=…)` checks whether the pin lane honors it:

| code | meaning | outcome |
|---|---|---|
| `PINS_OK` | every present pin verifies and the root matches | ok |
| `PIN_MISMATCH` | a stored object's bytes do not hash to its name (tampered) | I3 restriction |
| `PIN_MISSING` | the pin-set root no longer matches the committed `cas_root` (a committed pin was withheld) | I3 restriction |

A failure emits an **I3 RestrictionState** (nervous, retrieval). It does
**NOT**:

- invalidate the `.cseal` (the space proof is untouched — `read_space_seal`
  still succeeds, and `verify_space_file` never requires the pin dir to
  exist);
- change lottery winners (the pin lane is never consulted by the
  space-weighted draw);
- slash space.

## 4. Node

`Node(..., pin_dir="pins/")` is optional. When configured, `health()` gains a
`pins` block: `{ok, code, i3}`. Withholding a pin after boot makes the next
`health` / `verify_pins` report `PIN_MISSING` + I3 — the node keeps running
and keeps farming space; only the retrieval interface is restricted.

## 5. CLI

```
chronarch pins put    --dir DIR --file PATH [--kind object|opaque]
chronarch pins get    --dir DIR --hash HEX
chronarch pins verify --space path.cseal --dir DIR
```

JSON out. (The group is `pins`; `pin` is already a node-RPC verb.) A K18
violation on `put` is `PIN_REJECTED`; `verify` returns the code and, on
failure, the I3 restriction.

## 6. Gossip (Phase 22)

On the local net ([NET.md](NET.md)), pins ride the **in-process bus** so a
follower that lacks a committed object can fetch it from the leader.

- **PinOffer** — after producing a slot, the leader offers every object its pin
  lane holds (the objects its `cas_root` commits to). Each offer is
  `{kind: "pin_offer", from_id, object_hash, pin_kind, bytes, cas_root}`; the
  `bytes` carry the object itself (hex), because there is **no DHT** to fetch it
  from elsewhere.
- **A follower** puts the object into its own `PinStore` iff K18 allows it and
  the bytes hash to `object_hash`. It **fails soft**: no pin lane, missing or
  malformed bytes, an integrity mismatch, or a K18-forbidden object all
  **decline** the offer without crashing. A pin the follower still lacks stays a
  local `PIN_MISSING` (I3), surfaced by `verify_pins` — a nervous event, never a
  lost consensus object.
- **Withhold is still I3, never a lottery change.** A pin no home serves cannot
  be healed by gossip; a follower committed to it reports `PIN_MISSING` + I3 and
  keeps farming. The net still converges on one `head_hash` and the lottery
  winners are identical — the CAS lane touches no ring, no header, and no draw.

Pin gossip is the CAS lane only. It never seals an object into the Timechain,
and it is **in-process only** — no TCP, no peer discovery, no public network.

## 7. What the pin lane is not

Not a hidden plot: the Timechain is never stored in the pin dir as a
disguised plot, and a `.cseal` body never holds these blobs. Not chiapos, not a
DHT. A pin failure is never a consensus-invalid space proof, and never changes
who wins a slot — only an I3 nervous event.

---

A node booted with a durable `home=` reopens `home/pins/` as this pin lane on
resume. An abstract home node mirrors its boot CAS onto that lane so it honors
its own committed `cas_root`; a file-backed node's lane stays operator-managed
(its `.cseal` `cas_root` is authoritative). Either way a withheld pin after
resume is still an I3 event, never a space defect. See [HOME.md](HOME.md).

See [SPACEFILE.md](SPACEFILE.md) for the `.cseal` format,
[FARMER.md](FARMER.md) for booting from a file, and
[CHRONARCH_POST.md](CHRONARCH_POST.md) for the canonical names.
