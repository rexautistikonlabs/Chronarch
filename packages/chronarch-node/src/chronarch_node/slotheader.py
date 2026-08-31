"""Phase 6/7 — the node's SlotHeader extension (research-fork path).

A node-level object, separate from the frozen kernel `Header`. Phase 7 adds
the infused challenge chain, the plot filter, and a sequential-time VDF on
top of the Phase-6 local PoSpace stand-in (still the default backend).

Fields:
    slot, leader, plot_id, space_units, plot_commitment_hash,
    infused_challenge,   # PoSpace challenge = infusion of the previous slot
    prev_quality,        # previous slot's winning quality ("" at slot 0)
    pospace,             # the ProofOfSpace
    plot_filter_ok,      # quality carries >= FILTER_PREFIX_BITS leading zeros
    vdf                  # SequentialVDF over the challenge (does NOT vote)

A follower rejects a slot if: the plot commitment is missing; the recomputed
infusion mismatches; the plot filter fails (fail closed); the ProofOfSpace
fails; or the SequentialVDF does not recompute. The lottery is unchanged and
never consults the VDF — the VDF does not vote, slots stay discrete.
"""
from __future__ import annotations

from chronarch_farm import (
    DEFAULT_VDF_ITERATIONS,
    FILTER_PREFIX_BITS,
    cas_root_of,
    genesis_challenge,
    infuse_challenge,
    make_plot_commitment,
    make_pospace,
    make_sequential_vdf,
    plot_filter_ok,
    verify_plot_commitment,
    verify_pospace,
    verify_sequential_vdf,
)
from chronarch_spec import chash

_SLOT_HEADER_FIELDS = (
    "slot", "leader", "plot_id", "space_units", "plot_commitment_hash",
    "infused_challenge", "prev_quality", "pospace", "plot_filter_ok", "vdf",
)


class SlotHeaderError(ValueError):
    pass


def _challenge_for(slot: int, prev_slot_header: dict | None) -> tuple[str, str]:
    """Return (challenge, prev_quality). Slot 0 (no prev) uses the genesis
    challenge; later slots infuse the previous slot's quality + challenge."""
    if prev_slot_header is None:
        return genesis_challenge(), ""
    prev_quality = prev_slot_header["pospace"]["quality_string"]
    prev_challenge = prev_slot_header["infused_challenge"]
    return infuse_challenge(prev_quality, prev_challenge, slot), prev_quality


def build_slot_header(*, slot: int, leader: str, commitment: dict,
                      space_units: int, prev_slot_header: dict | None = None,
                      prev_header_hash: str = "", vdf_placeholder=None,
                      vdf_iterations: int = DEFAULT_VDF_ITERATIONS) -> dict:
    """Leader-side. `prev_header_hash` and `vdf_placeholder` are accepted for
    call-compat but superseded: the challenge comes from the infusion chain
    and the VDF is a SequentialVDF over that challenge."""
    verify_plot_commitment(commitment)
    challenge, prev_quality = _challenge_for(slot, prev_slot_header)
    proof = make_pospace(commitment["plot_id"], challenge, space_units,
                         filter_prefix_bits=FILTER_PREFIX_BITS)
    quality = proof["quality_string"]
    vdf = make_sequential_vdf(challenge, vdf_iterations)
    return {
        "slot": slot,
        "leader": leader,
        "plot_id": commitment["plot_id"],
        "space_units": space_units,
        "plot_commitment_hash": chash("PlotCommitment", commitment),
        "infused_challenge": challenge,
        "prev_quality": prev_quality,
        "pospace": proof,
        "plot_filter_ok": plot_filter_ok(quality),
        "vdf": vdf,
    }


def verify_slot_header(slot_header: dict, *, space_units: int,
                       prev_slot_header: dict | None = None) -> dict:
    """Follower-side: returns {ok, error_code}. Fails closed on a missing
    field. The VDF is verified but never changes the elected leader."""
    if not isinstance(slot_header, dict) or set(slot_header) != set(_SLOT_HEADER_FIELDS):
        return {"ok": False, "error_code": "SLOT_HEADER_BAD_STRUCTURE"}
    if not slot_header["plot_commitment_hash"]:
        return {"ok": False, "error_code": "SLOT_HEADER_NO_PLOT_COMMITMENT"}

    # Infused challenge chain: recompute and reject a mismatch.
    expected_challenge, expected_prev_q = _challenge_for(
        slot_header["slot"], prev_slot_header)
    if slot_header["infused_challenge"] != expected_challenge:
        return {"ok": False, "error_code": "SLOT_HEADER_INFUSION_MISMATCH"}
    if slot_header["prev_quality"] != expected_prev_q:
        return {"ok": False, "error_code": "SLOT_HEADER_PREV_QUALITY_MISMATCH"}

    pospace = slot_header["pospace"]
    if not isinstance(pospace, dict) or pospace.get("plot_id") != slot_header["plot_id"]:
        return {"ok": False, "error_code": "SLOT_HEADER_PLOT_ID_MISMATCH"}
    if pospace.get("challenge") != slot_header["infused_challenge"]:
        return {"ok": False, "error_code": "SLOT_HEADER_CHALLENGE_MISMATCH"}

    # Plot filter — fail closed.
    quality = pospace.get("quality_string", "")
    recomputed_filter = plot_filter_ok(quality) if quality else False
    if not recomputed_filter:
        return {"ok": False, "error_code": "SLOT_HEADER_FILTER_FAIL"}
    if slot_header["plot_filter_ok"] is not True:
        return {"ok": False, "error_code": "SLOT_HEADER_FILTER_CLAIM_MISMATCH"}

    result = verify_pospace(pospace, space_units)
    if not result["ok"]:
        return {"ok": False, "error_code": result["error_code"]}

    # SequentialVDF must recompute — a required artifact, but it does not vote.
    if not verify_sequential_vdf(slot_header["vdf"]):
        return {"ok": False, "error_code": "SLOT_HEADER_VDF_INVALID"}

    return {"ok": True, "error_code": "SLOT_HEADER_OK"}


def commitment_for_node(identity: str, cas) -> dict:
    """A node's representative PlotCommitment (a real, recomputable id bound
    to its advertised pinset)."""
    return make_plot_commitment(identity, "test", index=0, cas_root=cas_root_of(cas))


# Back-compat helper kept for callers that used the Phase-6 challenge form.
def pospace_challenge(slot: int, prev_header_hash: str) -> str:
    return chash("pospace-challenge", {"slot": slot, "prev": prev_header_hash})
