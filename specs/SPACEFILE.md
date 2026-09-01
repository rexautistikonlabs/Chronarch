# SPACEFILE.md — The .cseal On-Disk SpaceSeal Format

A `.cseal` is Chronarch's **own** on-disk SpaceSeal. It reserves space and
seals a SpaceSeal (PlotCommitment) header; its body is inert reserved bytes.

**It is not a Chia plot, not CHIP-48, not chiapos, and not a database.** A
`.cseal` MUST NOT contain rings, faculties, drafts, or raw CAS blobs — the
reader enforces that. Canonical primitive names are in
[CHRONARCH_POST.md](CHRONARCH_POST.md); the dual-farm split is in
[DUAL_FARM.md](DUAL_FARM.md).

> Plots prove space. CAS stores memory. A `.cseal` proves reserved space and
> stores nothing else.

---

## 1. Layout

| Offset | Size | Field |
|---|---|---|
| 0 | 4 | magic `CSL1` |
| 4 | 4 | big-endian `uint32` header length |
| 8 | header_len | header: canonical-codec bytes of the SpaceSeal fields |
| 8 + header_len | body_bytes | reserved body — all zero |

The **header** is the canonical encoding of the SpaceSeal / PlotCommitment
fields: `{plot_id, k_size, space_units, farmer_id, cas_root, index}`. It is a
closed schema — extra or forbidden keys (K18: `admin_key` & kin) are
rejected, and `plot_id` must recompute from its fields.

The **body** is `file_body_bytes(space_units)` reserved zero bytes. Writing
reserves them (sparse via `truncate`, so `st_size` is the full reserved
size); reading requires the file size to match exactly and the body to be
all zero.

## 2. Size class (test only)

One abstract space unit reserves `BODY_BYTES_PER_UNIT = 4096` body bytes. The
**TEST** size class is 1 unit → **4096 bytes** — not 101 GiB. We do not
create real `k32` files in CI: a `k32` SpaceSeal is 1014 units, and its
`.cseal` body would be ~4.1 MB in this stand-in format (still not a Chia
plot). The size table itself lives in `chronarch_farm.plots.SIZE_TABLE`
(FROZEN-MVP).

## 3. Reading rejects

- **bad magic** → `BadMagic`;
- **truncated / oversized / unparseable header**, or a header failing the
  closed schema / K18 / `plot_id` recompute → `BadHeader` / `PlotError` /
  `SchemaError`;
- **file size ≠ 8 + header_len + body_bytes** (short body, or appended
  payload) → `ShortBody`;
- **any non-zero body byte** (stuffed rings / jsonl / blobs) → `PayloadFound`.

## 4. Proving from a file

`prove_from_file(path, challenge)` loads the `.cseal` → SpaceSeal → a
SpaceProof via the frozen `make_pospace` (through the `post` façade). It adds
no lottery math. `verify_space_proof(proof, space_units)` accepts it.

The optional `cas_root` in the header is a **commitment only**: a `.cseal`
that commits to a `cas_root` is valid even when no CAS object exists — a
missing pin is an I3 nervous event on the CAS lane, never a file defect.

## 5. CLI

```
chronarch farm init    --farmer-id X --units N --out path.cseal [--cas-root HEX]
chronarch farm inspect path.cseal
chronarch farm prove   path.cseal --challenge HEX
```

JSON out. `--units N` must match a size-table unit count (e.g. `1` for the
test class). **No farm verb writes rings into a file** — `init` reserves a
zero body, and nothing appends.

## 6. What a .cseal is not

Not a Chia plot, not CHIP-48 / PoST 2.0, not a chiapos artifact, not a
database. It stores space proofs' reservation only — never memory. Memory
lives on the CAS lane; the `cas_root` is a one-way commitment.

---

A node farms from a `.cseal` by passing `space_path=` (the file is the source
of truth for units) — see [FARMER.md](FARMER.md).

Lineage: Chia-family Proof of Space inspired the body; the `.cseal` format is
Chronarch's own ([ATTRIBUTION.md](ATTRIBUTION.md), K17).
