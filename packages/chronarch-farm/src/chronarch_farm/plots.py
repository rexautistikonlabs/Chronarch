"""Plot lane objects (Phase 4): PlotCommitment + PlotProof, stub verifier.

Plots prove space. CAS stores memory. A plot file does not store rings,
weights, or vectors — a plot id MAY commit to a `cas_root`, but that is a
COMMITMENT field only: retrieval lives on the CAS lane, its failure is an
Immune/I3 nervous event, and a missing CAS object never invalidates a plot
proof (and never excuses the pin, either).

Phase 4 verification is STRUCTURAL by design: fields, types, the size
table, and recomputable hashes. It does not implement Chia table lookups,
proofs of time, or VDFs — that is Phase 6's research fork, not this file.

Everything here is deterministic: no wall clock, no randomness.
"""
from __future__ import annotations

import re

from chronarch_spec import chash, screen_keys

# ---------------------------------------------------------------------------
# Size table: k-size denomination -> abstract space units.
#
# One unit is a NOMINAL 0.1 GiB. The k-sizes echo Chia-family plot classes so
# the Phase 6 fork has an obvious mapping, but nothing here claims real
# farming: "test" is the 1-unit dev denomination, and the GiB figures are
# documentation, not measurements. FROZEN-MVP: changing a row post-genesis is
# an M1 genesis-param change (Proposal + Ballot only, G14).
# ---------------------------------------------------------------------------
SIZE_TABLE: dict[str, int] = {
    "test": 1,     # dev denomination: exactly 1 abstract unit
    "k25": 6,      # ~0.6 GiB (documented, not measured)
    "k32": 1014,   # ~101.4 GiB
    "k33": 2088,   # ~208.8 GiB
    "k34": 4298,   # ~429.8 GiB
    "k35": 8839,   # ~883.9 GiB
}

_HASH_RE = re.compile(r"^[0-9a-f]{64}$")

_COMMITMENT_FIELDS = ("plot_id", "k_size", "space_units", "farmer_id",
                      "cas_root", "index")
_PROOF_FIELDS = ("plot_id", "farmer_id", "slot", "space_units", "proof")


class PlotError(ValueError):
    """A plot object failed structural verification."""


def derive_plot_id(farmer_id: str, k_size: str, index: int, cas_root: str = "") -> str:
    """The plot id commits to the farmer, the denomination, an index (so one
    farmer can hold many plots), and optionally a cas_root."""
    return chash("PlotId", {"farmer_id": farmer_id, "k_size": k_size,
                            "index": index, "cas_root": cas_root})


def make_plot_commitment(farmer_id: str, k_size: str, *, index: int = 0,
                         cas_root: str = "") -> dict:
    if k_size not in SIZE_TABLE:
        raise PlotError(f"unknown k_size {k_size!r} — the size table is the law "
                        f"(known: {sorted(SIZE_TABLE)})")
    commitment = {
        "plot_id": derive_plot_id(farmer_id, k_size, index, cas_root),
        "k_size": k_size,
        "space_units": SIZE_TABLE[k_size],
        "farmer_id": farmer_id,
        "cas_root": cas_root,
        "index": index,
    }
    verify_plot_commitment(commitment)
    return commitment


def verify_plot_commitment(commitment: dict) -> dict:
    """Structural verification (Phase 4 stub — no Chia table lookups).

    Checks: closed field set, K18 key screen, types, k_size known,
    space_units EXACTLY the size-table value, plot_id recomputes, cas_root
    empty or a hash. Deliberately does NOT check that any CAS object behind
    cas_root exists — the plot proves space, not retrieval (that is I3's job).
    """
    if not isinstance(commitment, dict):
        raise PlotError("commitment must be an object")
    screen_keys(commitment)  # admin_key & kin rejected wherever they hide (K18)
    if set(commitment) != set(_COMMITMENT_FIELDS):
        raise PlotError(f"commitment fields must be exactly {_COMMITMENT_FIELDS}")
    if not isinstance(commitment["farmer_id"], str) or not commitment["farmer_id"]:
        raise PlotError("farmer_id must be a non-empty string")
    k_size = commitment["k_size"]
    if k_size not in SIZE_TABLE:
        raise PlotError(f"unknown k_size {k_size!r}")
    units = commitment["space_units"]
    if not isinstance(units, int) or isinstance(units, bool) or units != SIZE_TABLE[k_size]:
        raise PlotError(
            f"space_units {units!r} does not match the size table for {k_size!r} "
            f"({SIZE_TABLE[k_size]}) — claimed space is not negotiable")
    index = commitment["index"]
    if not isinstance(index, int) or isinstance(index, bool) or index < 0:
        raise PlotError("index must be a non-negative int")
    cas_root = commitment["cas_root"]
    if cas_root != "" and not (isinstance(cas_root, str) and _HASH_RE.match(cas_root)):
        raise PlotError("cas_root must be empty or a 64-hex hash")
    expected = derive_plot_id(commitment["farmer_id"], k_size, index, cas_root)
    if commitment["plot_id"] != expected:
        raise PlotError("plot_id does not recompute from its fields — malformed or forged")
    return commitment


def make_plot_proof(commitment: dict, slot: int) -> dict:
    """A per-slot proof stub: recomputable by any peer from public inputs."""
    verify_plot_commitment(commitment)
    if not isinstance(slot, int) or isinstance(slot, bool) or slot < 0:
        raise PlotError("slot must be a non-negative int")
    return {
        "plot_id": commitment["plot_id"],
        "farmer_id": commitment["farmer_id"],
        "slot": slot,
        "space_units": commitment["space_units"],
        "proof": chash("PlotProofStub", {"plot_id": commitment["plot_id"], "slot": slot}),
    }


def verify_plot_proof(proof: dict, commitment: dict) -> dict:
    """Phase 4 stub verifier: structural fields + size-table consistency +
    recomputable proof hash. NOT a Chia proof-of-space check and NOT a VDF —
    Phase 6 replaces the `proof` recomputation with real table lookups."""
    verify_plot_commitment(commitment)
    if not isinstance(proof, dict):
        raise PlotError("proof must be an object")
    screen_keys(proof)
    if set(proof) != set(_PROOF_FIELDS):
        raise PlotError(f"proof fields must be exactly {_PROOF_FIELDS}")
    if proof["plot_id"] != commitment["plot_id"]:
        raise PlotError("proof does not reference this plot")
    if proof["farmer_id"] != commitment["farmer_id"]:
        raise PlotError("proof farmer does not match the commitment")
    if proof["space_units"] != commitment["space_units"]:
        raise PlotError("proof space_units does not match the commitment")
    slot = proof["slot"]
    if not isinstance(slot, int) or isinstance(slot, bool) or slot < 0:
        raise PlotError("slot must be a non-negative int")
    expected = chash("PlotProofStub", {"plot_id": commitment["plot_id"], "slot": slot})
    if proof["proof"] != expected:
        raise PlotError("proof hash does not recompute — forged or corrupted")
    return proof


def cas_root_of(cas) -> str:
    """The commitment a plot MAY carry to the farmer's CAS pinset.

    A root, never the blobs: CAS objects live on the CAS lane, are served on
    retrieval challenges, and are never stored inside plot tables.
    """
    return chash("CasRoot", {"pins": cas.pins()})


def commitment_binds_pinset(commitment: dict, cas) -> bool:
    """True iff the commitment's cas_root matches the CAS's CURRENT pinset.

    A False here is I3 territory (advertised pins not honored) — it does not
    invalidate the plot's space proof."""
    verify_plot_commitment(commitment)
    return commitment["cas_root"] != "" and commitment["cas_root"] == cas_root_of(cas)
