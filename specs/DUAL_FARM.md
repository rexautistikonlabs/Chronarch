# DUAL_FARM.md — Two Lanes, One Disk

The dual farm (K4) is how one physical disk serves the organism twice: the
**PLOT LANE** proves reserved space and elects farmers; the **CAMBIUM / CAS
LANE** stores the organism's memory as content-addressed objects and answers
retrieval challenges. The lanes share hardware and never share
responsibilities.

Status: v0 draft — sim/MVP values are FROZEN-MVP; changing them post-genesis
is a MAJOR change (G14). Phase 4 scope: documentation + the
abstract-to-plot adapter. **No VDF, no Chia header fork here** — that
boundary belongs to Phase 6 ([ARCHITECTURE.md](ARCHITECTURE.md) §8).

> Plots prove space. CAS stores memory.

---

## 1. The two lanes

| | PLOT LANE | CAMBIUM / CAS LANE |
|---|---|---|
| Holds | Proof-of-Space plot data (abstract in Phase 4; real plot files in later Phase 4 work; PoST with time in Phase 6) | Content-addressed objects: rings, faculties, gym fixtures, embedding **commitments** |
| Proves | Reserved space, via the slot lottery ([ARCHITECTURE.md](ARCHITECTURE.md) §5) | Retrieval: pinned bytes fetch and hash to their pin (`PIN_FETCH`, `PIN_VERIFY`) |
| Elects | Farmers — win probability tracks committed space, nothing else (no stake, no PoQ, no salience; G2/G10) | Nothing — pins are reputation/filters, never lottery weight |
| Fails as | A missed/dishonest plot proof: interface **I2** (`plot_challenge_honesty`) | A withheld or corrupt pin: interface **I3** (`cas_retrieval`) — a nervous event, **not a lost file** |
| Payment | `farmer_plot_share` of the reward router | `pin_share` of the reward router ([TOKEN.md](TOKEN.md)) |

Both lanes sit under the same prestress floors ([NERVOUS.md](NERVOUS.md)):
minimum bond, minimum pin-set, mandatory challenge cadence. A node below
floor keeps its disk and its data — it loses **slot eligibility** until
prestress returns.

## 2. What is, and is not, in a plot

A plot proves that space is reserved. That is all it proves.

**In a plot:** proof-of-space data (Phase 4: the structural stub; later:
real plot tables).

**Never in a plot:** rings, Timechain segments, faculty code, model
weights, embedding vectors, CAS blobs of any kind. "Plots as a database" is
a rejected idea (BUILD_LOG.md): stuffing memory into plot tables destroys
both the space proof and the data model. The Timechain is JSONL-shaped
state on the CAS lane and in node storage — putting it inside a `.plot`
file is a category error, not an optimization.

**The one bridge — `cas_root`.** A plot id MAY commit to a `cas_root`: a
hash of the farmer's advertised pinset (`cas_root_of` in
`chronarch-farm`). This is a **commitment field only**:

- it binds "this plot's farmer stands behind these pins" into the plot id;
- a missing or withheld CAS object **does not invalidate the plot proof**
  — the plot still proves space; the missing pin surfaces on the CAS lane
  as an I3 nervous event (Scar, health degradation, slashable if bonded);
- it is **optional**: a plot with `cas_root = ""` is a valid plot and can
  win slots. Retrieval duty comes from the advertised PinSet, not from the
  plot.

## 3. PlotCommitment / PlotProof (Phase 4 objects)

Defined in `packages/chronarch-farm` (`chronarch_farm.plots`). Both objects
are closed (exact field sets), screened against the K18 forbidden-key
tokens, and fully deterministic.

**PlotCommitment** — registers space:

| Field | Type | Meaning |
|---|---|---|
| `plot_id` | hash | `chash("PlotId", {farmer_id, k_size, index, cas_root})` — recomputable by any peer; a plot_id that does not recompute is malformed/forged |
| `k_size` | str | A size-table denomination (§4) |
| `space_units` | int | MUST equal the size-table value for `k_size` — claimed space is not negotiable |
| `farmer_id` | str | The farmer/validator identity; PinSets bind to the same identity |
| `cas_root` | hash or `""` | Optional pinset commitment (§2) |
| `index` | int ≥ 0 | Distinguishes a farmer's many plots deterministically |

**PlotProof** — answers a slot:

| Field | Type | Meaning |
|---|---|---|
| `plot_id`, `farmer_id`, `space_units` | | Must match the commitment |
| `slot` | int ≥ 0 | The slot answered |
| `proof` | hash | Phase 4 stub: `chash("PlotProofStub", {plot_id, slot})`, recomputable by any peer |

**`verify_plot_proof` (structural).** Checks structure, the size table,
commitment/proof consistency, and that the proof hash recomputes. It does
**not** check CAS availability (deliberately — see §2).

**Verifier body replaced, signature unchanged (Phase 6).** The plot-proof
*verification body* is now backed by a real-enough, deterministic local
Proof-of-Space verifier (`verify_pospace`) plus a node-level SlotHeader —
see [PHASE6_POST.md](PHASE6_POST.md). `verify_plot_proof(proof, commitment)`
keeps its exact signature (a call-site test pins it); Phase 6 adds new
objects (`ProofOfSpace`, `VDFRecord`) and functions beside it rather than
re-signing it. It remains a **local stand-in, not Chia mainnet proofs**, and
the lottery is unchanged: equal `space_units` still elect identical leaders.

## 4. Size table (FROZEN-MVP)

One unit is a **nominal 0.1 GiB**. The k-sizes echo Chia-family plot
classes so Phase 6 has an obvious mapping. The GiB figures are
documentation, not measurements — **nothing in Phase 4 claims real
farming**. Changing a row post-genesis is an M1 genesis-param change
(Proposal + Ballot only, G14).

| `k_size` | `space_units` | Documented size |
|---|---:|---|
| `test` | 1 | dev denomination (exactly 1 abstract unit) |
| `k25` | 6 | ~0.6 GiB |
| `k32` | 1014 | ~101.4 GiB |
| `k33` | 2088 | ~208.8 GiB |
| `k34` | 4298 | ~429.8 GiB |
| `k35` | 8839 | ~883.9 GiB |

## 5. The adapter contract

`chronarch_farm.adapter` maps both directions, and the election cannot
tell the difference:

- `commitments_from_abstract(farmer_id, units)` → plot commitments summing
  **exactly** to `units` (greedy over the table; the 1-unit `test`
  denomination makes any positive integer exact; deterministic indices).
- `space_table_from_commitments(commitments)` → the `{farmer_id: units}`
  table the slot lottery already consumes. Every commitment is verified on
  the way in — unverifiable space never enters a table silently.

**Contract:** the lottery input remains integer space units. For identical
units, the plot world and the abstract world elect **identical leaders,
slot by slot** — tested over hundreds of slots. Prestress floors gate
contention exactly as before; the adapter adds no weight, no denomination
bonus, and no new power. Election does **not** include attested-PoQ or
stake weight, in Phase 4 or ever (G2/G10).

## 6. PinSet binding

A farmer's `PinSet` (K2 schema: `identity`, `pins`, `slot`) binds to the
same `farmer_id` its plots carry. `commitment_binds_pinset` checks the
plot's `cas_root` against the CAS's **current** pinset:

- match → the farmer honors what the plot committed to;
- mismatch → I3 territory (advertised pins not honored): Scar, health
  degradation, slash if bonded. **The plot proof itself stays valid** —
  space was still proven.

CAS blobs never go inside plot tables; the binding is one hash in one
direction.

## 7. Phase boundary

Phase 4 ends where physics begins. The later research fork adds the real-enough
verifier body and the space/time objects — whose **canonical names live in
[CHRONARCH_POST.md](CHRONARCH_POST.md)** (SpaceSeal / SpaceProof / Pulse /
Filter / TimeSeal / TimeProof). Explicitly out of scope: Chronarch **does not
implement CHIP-48 or PoST 2.0**, does not vendor chia-blockchain as a
submodule, does not build VDF/timelord infrastructure or Chia infused blocks,
and claims no Chia mainnet compatibility. The adapter is built so that swap
happens behind `verify_plot_proof` without touching the lottery, the
size-table contract, or any frozen kernel file.

---

Lineage: plot-elected farming follows Chia-family Proof of Space and Time
physics ([ATTRIBUTION.md](ATTRIBUTION.md), K17).
