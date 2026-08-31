# PHASE7_POST.md — Chia-Family Time and Infusion (Research Fork)

Phase 7 adds an infused challenge chain, a plot filter, and a
sequential-time VDF on top of the Phase-6 local Proof-of-Space stand-in
(which stays the **default** backend). It also defines an **optional**
real-tables backend seam. Still a research fork: no chia-blockchain
vendored, no mainnet, no Wesolowski/Pietrzak.

Status: v0. FROZEN-MVP values (`FILTER_PREFIX_BITS`, VDF iteration bounds)
change only via Proposal + Ballot (G14).

> Plots prove space. CAS stores memory. The VDF does not vote.

---

## 1. Infused challenge chain

Each slot's PoSpace challenge is derived from the previous slot, so a leader
cannot shop for a favourable challenge:

```
slot n challenge = SHA256(domain ‖ prev_quality ‖ prev_challenge ‖ slot)
```

Slot 0 (no predecessor) uses a fixed **genesis challenge**. The SlotHeader
carries `infused_challenge` and `prev_quality`, and the leader must use
`infused_challenge` as the PoSpace challenge after slot 0. A follower
recomputes the infusion from its own predecessor and **rejects the slot** on
mismatch (`SLOT_HEADER_INFUSION_MISMATCH`). The whole fleet agrees on one
infusion chain (tested).

## 2. Plot filter

After the quality is computed, `plot_filter_ok` iff the quality carries at
least `FILTER_PREFIX_BITS` leading zero bits (documented in
`chronarch_farm.infusion`, small for tests). This is **fail closed**: a
missing `plot_filter_ok` field, a quality that fails the prefix, or a lying
`plot_filter_ok=True` over a failing quality are all rejected
(`SLOT_HEADER_FILTER_FAIL`). The leader grinds a proof that satisfies both
the difficulty and the filter (a deterministic nonce walk).

## 3. Sequential VDF

`SequentialVDF` replaces "one hash equals output" as the header's time
check:

```
output = H(H(...H(input)...))   # `iterations` domain-separated rounds
```

The iteration count is small and pinned (`DEFAULT_VDF_ITERATIONS`, bounded by
`MAX_VDF_ITERATIONS`). This is a genuine sequential computation — each round
feeds the next — but it is **not** a proof of elapsed time, and **the lottery
ignores it**: the elected leader is decided by the space-weighted,
prestress-gated draw alone (tested: identical winners with and without the
VDF). Slots stay discrete; there is no wall clock. The Phase-6 single-hash
`VDFRecord` / `verify_vdf_record` remain as helpers; the node SlotHeader uses
the SequentialVDF.

## 4. Optional real-tables backend (off by default)

`chronarch_farm.chiapos_backend` defines the seam:
`generate_quality(plot_id, challenge)` / `verify_proof(...)`. It is active
**only** when `CHRONARCH_CHIAPOS=1` **and** `chiapos` is importable;
otherwise `active_backend()` returns the Phase-6 stand-in and the whole
204+ suite runs with zero extra dependencies. `chiapos` is a pip **extra**
(`chronarch-farm[chiapos]`), never a required or CI dependency; chiapos
tests use `pytest.importorskip("chiapos")`. We do **not** git-submodule
chia-blockchain and do **not** vendor a multi-hundred-MB tree.

## 5. What does NOT change

- **The lottery.** Space-weighted + prestress-gated. Equal `space_units`
  still elect identical leaders, slot by slot (tested). Infusion, filter, and
  VDF are per-slot header checks on the already-elected leader; none adds
  weight or a vote.
- **`verify_plot_proof(proof, commitment)`** and **`verify_pospace(pospace,
  space_units)`** signatures.
- The frozen kernel, admission, Council, Hearth, challenge judgment, and the
  agent silo/hat layer.

## 6. Explicit non-goals (later, not now)

- full CHIP-48 / PoST 2.0;
- a real VDF (Wesolowski / Pietrzak);
- Chia mainnet sync or peering;
- real Chia plot tables as the default (only the optional opt-in seam);
- plots-as-a-database — a plot still stores space proofs only, never rings,
  weights, or vectors ([DUAL_FARM.md](DUAL_FARM.md)).

The seam is drawn so a later phase can swap the verifier internals behind
`verify_pospace` / `verify_slot_header` / the chiapos backend without
touching the lottery, the frozen signatures, or any frozen kernel file.

---

Lineage: Chia-family Proof of Space and Time physics
([ATTRIBUTION.md](ATTRIBUTION.md), K17). Builds on
[PHASE6_POST.md](PHASE6_POST.md).
