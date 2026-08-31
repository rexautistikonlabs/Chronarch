# PHASE8_POST.md — Research-Grade Proof-of-Time + CHIP-48-Shaped Fields

Phase 8 adds a **test-group Wesolowski VDF** (real prove/verify, toy modulus),
**CHIP-48-shaped** header field names (layout only), and a **VDF time chain**.
It stays a research fork: no chia-blockchain vendored, no mainnet, no
production cryptography, and the VDF still does not vote.

Status: v0. The SequentialVDF (Phase 7) remains the **default** header time
check; Wesolowski is an optional field. FROZEN-MVP values change only via
Proposal + Ballot (G14).

> Plots prove space. CAS stores memory. The VDF does not vote.

---

## 1. What is real (test-group Wesolowski verify)

`chronarch_farm.wesolowski` implements a genuine Wesolowski proof/verify:

```
y  = x^(2^T) mod N
l  = hash_to_prime(x, y, T)
q, r = divmod(2^T, l);  pi = x^q mod N
verify:  pi^l · x^r ≡ y (mod N)
```

over a **tiny, documented prime modulus** — the Mersenne prime `2^127 − 1`,
group `(Z/N)^*`, `group_id = "prime-mod-mersenne127"`. This is **NOT**
2048-bit RSA and **NOT** a Chia class-group discriminant. It is toy-sized on
purpose: the algebra and the Fiat-Shamir hash-to-prime are real; the group
is a stand-in for tests. Tampering `y`, `pi`, `iterations`, the input, or the
`group_id` all fail verify.

API: `prove(input_bytes, iterations) -> {y, pi, iterations, group_id}` and
`verify(input_bytes, proof) -> bool`.

## 2. What is naming (CHIP-48-shaped fields)

The SlotHeader now exposes these field names explicitly:

- `plot_filter_bits` — the filter strength (Phase 7's `FILTER_PREFIX_BITS`);
- `quality_string` — the winning quality (also inside the ProofOfSpace);
- `infused_challenge` — the infused challenge (Phase 7);
- `extra_delta` — a `uint`, default 0, **inert**: it MUST NOT change the
  lottery, and a negative value is rejected.

These names **rhyme with CHIP-48 / PoST 2.0 research notes** so a future
phase has an obvious mapping. They are **NOT a CHIP-48 implementation** and
this fork makes **no claim of Chia mainnet compatibility**.

## 3. VDF time chain

The SequentialVDF input now commits to the previous slot's VDF output:

```
vdf_input = SHA256(domain ‖ infused_challenge ‖ prev_vdf_output)
```

The SlotHeader carries `prev_vdf_output`; a follower recomputes it from its
own predecessor and rejects a mismatch (`SLOT_HEADER_PREV_VDF_MISMATCH`),
and rejects a VDF whose input does not commit to it
(`SLOT_HEADER_VDF_INPUT_MISMATCH`). Slots stay discrete; there is no wall
clock, and the VDF still does not vote.

## 4. Optional Wesolowski proof on the header

`wesolowski_proof` is an **optional** SlotHeader field:

- absent (`None`) → the header is still valid (backward compatible);
- present → the follower verifies it over the `infused_challenge`; a garbled
  proof is rejected (`SLOT_HEADER_WESOLOWSKI_INVALID`).

The node attaches it only when asked (`with_wesolowski=True`); by default it
is off. The lottery ignores the field either way (tested: identical winners
with and without it).

## 5. Optional extras

`chronarch-farm[chiapos]` stays an optional pip extra (Phase 7), never a CI
dependency. No chia-blockchain git submodule, no multi-hundred-MB vendor, no
peering with Chia mainnet or testnet.

## 6. What does NOT change

- The lottery: space-weighted + prestress-gated; equal `space_units` still
  elect identical leaders (tested). Wesolowski, the SequentialVDF time chain,
  and `extra_delta` are per-slot header checks on the already-elected leader.
- `verify_plot_proof(proof, commitment)` and `verify_pospace(pospace,
  space_units)` signatures; the default Phase-6 backend; the Phase-7 infusion
  formula and `FILTER_PREFIX_BITS` default behavior.
- The frozen kernel, admission, Council, Hearth, challenge judgment, and the
  agent silo/hat layer.

## 7. Phase-9 non-goals (explicit)

- a real class-group VDF (production Wesolowski/Pietrzak over an RSA or class
  group);
- full CHIP-48 / PoST 2.0;
- Chia mainnet sync or peering.

The seam is drawn so Phase 9 can swap the Wesolowski group and the VDF
internals without touching the lottery, the frozen signatures, or any frozen
kernel file.

---

Lineage: Chia-family Proof of Space and Time physics
([ATTRIBUTION.md](ATTRIBUTION.md), K17). Builds on
[PHASE7_POST.md](PHASE7_POST.md) and [PHASE6_POST.md](PHASE6_POST.md).
