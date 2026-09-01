# CHRONARCH_POST.md — Chronarch Proof of Space and Time (Canonical)

These are Chronarch's own space/time primitives, in Chronarch's own names.
Chia inspired the body; Chronarch owns the objects. **Chronarch does not
implement CHIP-48 and claims no Chia mainnet compatibility.** This file is
the canonical vocabulary; PHASE6/7/8_POST.md are the build history.

## The law (one paragraph)

Plots prove space. CAS stores memory. Time is sequential and does not vote.
Chronos is blood, not conscience. Major change is a proposal ring plus a
slashing-backed vote (G14) — not an AI rewrite and not an admin key.

## Primitives

| Chronarch name | Is | Farmer-facing API (`chronarch_farm.post`) |
|---|---|---|
| **SpaceSeal** | a `PlotCommitment` — reserved space sealed to a farmer, `space_units` + optional `cas_root`; persists on disk as a `.cseal` ([SPACEFILE.md](SPACEFILE.md)) | `make_space_seal`, `verify_space_seal`, `write_space_seal`, `read_space_seal` |
| **SpaceProof** | a `ProofOfSpace` — `{challenge, plot_id, proof_bytes, quality}` | `make_space_proof`, `verify_space_proof` |
| **Pulse** | the infused challenge chain — each slot's challenge derived from the previous slot's quality + pulse | `genesis_pulse`, `next_pulse`, `verify_pulse` |
| **Filter** | the quality prefix-bits gate (`filter_bits`) | `filter_ok` |
| **TimeSeal** | a `SequentialVDF` on discrete slots; its input commits to this Pulse and the previous TimeSeal's output (the time chain) | `make_time_seal`, `verify_time_seal` |
| **TimeProof** | an OPTIONAL Wesolowski-style proof over a Pulse (test group, tiny prime modulus) | `make_time_proof`, `verify_time_proof` |
| **extra_weight** | a header field, `uint`, **lottery-inert** (formerly `extra_delta`) | — |

## SlotHeader canonical field names

The node SlotHeader exposes the Chronarch names as the canonical API:

| Canonical | Was (deprecated) |
|---|---|
| `filter_bits` | `plot_filter_bits` |
| `extra_weight` | `extra_delta` |
| `time_proof` | `wesolowski_proof` |

`build_slot_header` keeps the old **kwargs** as aliases (`extra_delta=`,
`with_wesolowski=`) so earlier code and tests keep working; the emitted
header carries only the canonical field names.

## Invariants

- **The lottery is space only.** Leaders are elected by the space-weighted,
  prestress-gated draw. Equal `space_units` elect identical leaders. Neither
  the TimeSeal, the TimeProof, nor `extra_weight` changes a winner — the VDF
  does not vote.
- **Slots are discrete.** The time chain links TimeSeal outputs across slots;
  there is no wall clock.
- **Space is not memory.** A SpaceSeal stores space proofs only — never
  rings, weights, or vectors. A SpaceSeal MAY commit to a `cas_root`, but a
  missing CAS object never invalidates a SpaceProof (that is an I3 nervous
  event on the CAS lane). See [DUAL_FARM.md](DUAL_FARM.md).
- **The façade adds no lottery math.** `chronarch_farm.post` only renames and
  composes the frozen `pospace` / `infusion` / `wesolowski` internals; the
  frozen `verify_plot_proof` / `verify_pospace` signatures are untouched.

## What Chronarch is not (body edition)

Chronarch does not implement CHIP-48 or PoST 2.0, does not vendor or
git-submodule chia-blockchain, does not peer with Chia mainnet or testnet,
and makes no claim of Chia mainnet compatibility. The Wesolowski group is a
toy stand-in over a tiny documented prime modulus, not production
cryptography.

---

Lineage: Chia-family Proof of Space and Time physics inspired this body
([ATTRIBUTION.md](ATTRIBUTION.md), K17); the objects and names above are
Chronarch's own.
