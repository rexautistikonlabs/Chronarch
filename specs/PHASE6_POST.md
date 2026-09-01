# PHASE6_POST.md — Chia-Family Body: Real, Stand-In, and the Phase-7 Line

> **Phase 7 note.** The Phase-6 local stand-in described here remains the
> **default backend**. Phase 7 *wraps* it with an infused challenge chain, a
> plot filter, and a sequential-time VDF, and adds an optional real-tables
> backend seam — see [PHASE7_POST.md](PHASE7_POST.md). None of that changes
> the lottery or the frozen signatures below.
>
> **Phase 9 note.** The canonical Chronarch names for these objects
> (SpaceSeal / SpaceProof / Pulse / Filter / TimeSeal / TimeProof) live in
> [CHRONARCH_POST.md](CHRONARCH_POST.md). Chia inspired the body; Chronarch
> does not implement CHIP-48.

Phase 6 replaces the farm's plot-proof **verification body** with a
real-enough, deterministic local Proof-of-Space verifier, and adds the
Chia-family body fields to a node-level SlotHeader. It does **not** vendor
chia-blockchain, does **not** implement CHIP-48, does **not** claim Chia
mainnet compatibility, and does not change the lottery, Council, Hearth,
admission, or the agent silo/hat layer.

> Plots prove space. CAS stores memory. The VDF does not vote.

---

## 1. What is real (now)

- **Deterministic local Proof-of-Space.** For a slot, the quality is
  `SHA256(domain ‖ plot_id ‖ challenge ‖ proof_bytes)`, and the proof is
  valid iff `quality < difficulty_from_space_units(space_units)`. Difficulty
  is monotone in committed space (more space → higher, easier threshold),
  the Chia-family shape. The proof is found by a deterministic nonce walk —
  no randomness, no wall clock.
- **A real `PlotCommitment` in every SlotHeader.** `plot_commitment_hash`
  commits to a recomputable plot id bound to the farmer's pinset; a follower
  rejects a slot whose commitment is missing or whose ProofOfSpace fails.
- **Typed objects with stable error codes.** `ProofOfSpace`
  (`challenge, plot_id, proof_bytes, quality_string`) and `verify_pospace`
  return `POSPACE_OK / POSPACE_BAD_STRUCTURE / POSPACE_QUALITY_MISMATCH /
  POSPACE_BELOW_DIFFICULTY / POSPACE_ZERO_SPACE`.
- **A VDF *record*** (`input, output, iterations`) with an integrity stub:
  `output == SHA256(domain ‖ input ‖ iterations)`.

## 2. What is a stand-in (explicitly)

- **This is a Phase-6 local PoSpace stand-in, not Chia mainnet proofs.**
  There are no Chia plot tables, no k-size table lookups, and no real
  proof-of-space search over a plotted file. `proof_bytes` is a nonce, not a
  Chia proof.
- **The VDF is a stub, not a proof of time.** No Wesolowski or Pietrzak
  construction; the record proves its own integrity, nothing about elapsed
  time. Slot time is **not** wall-clock.
- **The SlotHeader is a research-fork object**, separate from the frozen
  kernel `Header` (which is unchanged and closed). It is the node ledger's
  extension, not a Chia header.

## 3. What does NOT change

- **The lottery.** Leaders are still elected by the space-weighted,
  prestress-gated draw (`leader.py`). PoSpace is an additional per-slot
  gate on the *already-elected* leader; it adds no weight and no vote. Equal
  `space_units` still elect identical leaders, slot by slot (tested).
- **`verify_plot_proof(proof, commitment)`.** Signature untouched; Phase 6
  adds new functions beside it (a call-site test pins the signature).
- **`vdf_placeholder` is ignored by the lottery.** It rides in the
  SlotHeader and is never consulted when choosing a winner (tested: same
  winners with and without it). The VDF does not vote.
- Frozen kernel, admission, Council, Hearth, challenge judgment, and the
  agent silo/hat layer are all untouched.

## 4. The Phase-7 boundary (explicit non-goals now)

Deferred, and deliberately not built here:

- real Chia plot tables and a genuine proof-of-space search;
- CHIP-48 / PoST 2.0;
- no infused challenge/reward blocks and no Chia mainnet header compatibility;
- a real VDF (Wesolowski/Pietrzak) and wall-clock slot timing;
- any connection to Chia mainnet or foreign chains.

The seam is drawn so Phase 7 can swap the local verifier's internals behind
`verify_pospace` / `verify_slot_header` without touching the lottery, the
`verify_plot_proof` signature, or any frozen kernel file.

---

Lineage: Chia-family Proof of Space and Time physics
([ATTRIBUTION.md](ATTRIBUTION.md), K17). See [DUAL_FARM.md](DUAL_FARM.md) for
the plot-lane / CAS-lane split — a plot still never stores rings, weights, or
vectors.
