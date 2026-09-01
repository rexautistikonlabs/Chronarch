# FARMER.md — Booting a Node from a .cseal Space File

A Chronarch node can farm from an on-disk SpaceSeal file (`.cseal`,
[SPACEFILE.md](SPACEFILE.md)) or from abstract integer units. The file is the
source of truth for how much space the node farms; abstract units remain
valid for any node (and test) that passes no file.

> Plots prove space. CAS stores memory. A `.cseal` proves reserved space and
> the lottery weighs it as integer units — nothing more.

---

## 1. Booting

```python
Node(identity, space_path="farmer.cseal")     # file-backed
Node(identity, space_seal=read_space_seal(p)) # in-memory SpaceSeal
Node(identity, 100)                            # abstract units (backward compatible)
```

On boot a file-backed node:

1. reads + validates the `.cseal` (`read_space_seal` — all Phase-10 rejection
   rules apply);
2. derives its **SpaceSeal (PlotCommitment)** and `space_units` from the file;
3. registers those units with the existing leader lottery.

The node's `plot_commitment` becomes the file's SpaceSeal, so its slot
headers carry the farmer's on-disk plot id.

## 2. The mismatch rule

- **Only a file is passed** → the file wins; `space_units` come from it.
- **Both a file and abstract units are passed** → they MUST be equal, else
  init fails with **`SPACE_UNITS_MISMATCH`**. There is no silent override: a
  node never quietly farms different space than the operator declared.
- **Neither** → init fails (`space_units or a space file is required`).
- **A missing / bad-magic / short / stuffed file** → init raises `NodeError`
  and the process does not farm.

## 3. Slot production from a file

`produce_slot` uses the file-backed SpaceSeal for the PlotCommitment and the
SpaceProof (via the frozen `post` / slotheader path). Followers still reject a
bad SpaceProof or a bad Pulse exactly as before. A node with no file works on
abstract units — the two are interchangeable at equal integer units:

> abstract `N` units and a `.cseal` of `N` units elect the **same** leaders,
> slot by slot.

## 4. Mid-run file trouble

`Node.verify_space()` re-reads the `.cseal` and confirms it still matches the
booted units + plot id (abstract nodes always return `True`). The slot loop
MAY call it before `produce_slot`; a file that went invalid mid-run means the
node **skips leadership this slot** rather than crashing the process or
forging a proof. A node is not required to notice corruption the instant it
happens — only to never crash and never farm a file it can no longer prove.

## 5. Cluster

A `Cluster` accepts `space_seals` / `space_paths` (identity → SpaceSeal /
`.cseal` path); each node's units come from its own file. Two nodes with two
different `.cseal` files of different unit counts elect the same winners as
abstract units of those same integers (tested).

## 6. CLI

```
chronarch serve   --space path.cseal      # farm from a file (or --space 100 for units)
chronarch cluster --space-dir DIR         # one file-backed node per .cseal in DIR
```

`--space` is a `.cseal` path when it ends in `.cseal`, else integer units.
A bad or missing file is a JSON error (`BAD_SPACE`), not a crash.

## 7. What this is not

Not chiapos / chiavdf. Not k32 files (tests use the TEST size class only).
No rings inside the space file — a `.cseal` stores space, never memory.

---

A node may also bind a disk pin lane with `pin_dir=` — a withheld pin is an
I3 nervous event that never stops the node farming space; see
[PINS.md](PINS.md).

See [SPACEFILE.md](SPACEFILE.md) for the file format and
[CHRONARCH_POST.md](CHRONARCH_POST.md) for the canonical primitive names.
