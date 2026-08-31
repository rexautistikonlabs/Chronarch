"""Phase 6 — the node's SlotHeader extension (research-fork path).

This is a NODE-level object, deliberately separate from the frozen kernel
`Header` schema (which stays closed and unchanged). A SlotHeader carries the
Chia-family body fields the leader attaches to a slot:

    plot_commitment_hash   # hash of a real PlotCommitment (recomputes)
    pospace_challenge      # per-slot challenge
    pospace_quality        # the winning quality string
    vdf_placeholder        # a VDFRecord or None — IGNORED by the lottery today

A follower rejects a slot if the SlotHeader's ProofOfSpace does not verify,
or if `plot_commitment_hash` is missing. The lottery itself is unchanged:
space-weighted + prestress-gated (leader.py). The VDF never votes.
"""
from __future__ import annotations

from chronarch_farm import (
    cas_root_of,
    make_plot_commitment,
    make_pospace,
    verify_plot_commitment,
    verify_pospace,
)
from chronarch_spec import chash

_SLOT_HEADER_FIELDS = (
    "slot", "leader", "plot_id", "space_units", "plot_commitment_hash",
    "pospace_challenge", "pospace", "vdf_placeholder",
)


class SlotHeaderError(ValueError):
    pass


def pospace_challenge(slot: int, prev_header_hash: str) -> str:
    """Deterministic per-slot challenge (no wall clock)."""
    return chash("pospace-challenge", {"slot": slot, "prev": prev_header_hash})


def build_slot_header(*, slot: int, leader: str, commitment: dict,
                      space_units: int, prev_header_hash: str,
                      vdf_placeholder=None) -> dict:
    """Leader-side: attach a valid ProofOfSpace for this slot."""
    verify_plot_commitment(commitment)
    challenge = pospace_challenge(slot, prev_header_hash)
    proof = make_pospace(commitment["plot_id"], challenge, space_units)
    return {
        "slot": slot,
        "leader": leader,
        "plot_id": commitment["plot_id"],
        "space_units": space_units,
        "plot_commitment_hash": chash("PlotCommitment", commitment),
        "pospace_challenge": challenge,
        "pospace": proof,
        "vdf_placeholder": vdf_placeholder,
    }


def verify_slot_header(slot_header: dict, *, space_units: int) -> dict:
    """Follower-side: returns {ok, error_code}. Rejects a missing
    plot_commitment_hash and a failing ProofOfSpace. The vdf_placeholder is
    NOT consulted — it cannot change the outcome (it does not vote)."""
    if not isinstance(slot_header, dict):
        return {"ok": False, "error_code": "SLOT_HEADER_BAD_STRUCTURE"}
    if set(slot_header) != set(_SLOT_HEADER_FIELDS):
        return {"ok": False, "error_code": "SLOT_HEADER_BAD_STRUCTURE"}
    # A slot with no plot commitment is rejected on the proof path.
    if not slot_header.get("plot_commitment_hash"):
        return {"ok": False, "error_code": "SLOT_HEADER_NO_PLOT_COMMITMENT"}
    pospace = slot_header["pospace"]
    if not isinstance(pospace, dict) or pospace.get("plot_id") != slot_header["plot_id"]:
        return {"ok": False, "error_code": "SLOT_HEADER_PLOT_ID_MISMATCH"}
    if pospace.get("challenge") != slot_header["pospace_challenge"]:
        return {"ok": False, "error_code": "SLOT_HEADER_CHALLENGE_MISMATCH"}
    result = verify_pospace(pospace, space_units)
    if not result["ok"]:
        return {"ok": False, "error_code": result["error_code"]}
    return {"ok": True, "error_code": "SLOT_HEADER_OK"}


def commitment_for_node(identity: str, cas) -> dict:
    """A node's representative PlotCommitment (a real, recomputable id bound
    to its advertised pinset). Space for the difficulty comes from the
    farmer's declared units, not this single commitment's denomination."""
    return make_plot_commitment(identity, "test", index=0, cas_root=cas_root_of(cas))
