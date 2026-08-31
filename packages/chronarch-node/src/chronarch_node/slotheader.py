"""Phase 6/7/8 — the node's SlotHeader extension (research-fork path).

A node-level object, separate from the frozen kernel `Header`. Layers:

  Phase 6: PlotCommitment + local ProofOfSpace stand-in.
  Phase 7: infused challenge chain, plot filter, SequentialVDF.
  Phase 8: CHIP-48-SHAPED fields (naming only — NOT a CHIP-48 implementation,
           NOT mainnet compatible), a VDF time chain (the SequentialVDF input
           commits to the previous slot's VDF output), and an OPTIONAL
           Wesolowski test-group proof.

The lottery is unchanged and ignores every field here: neither the VDF, the
Wesolowski proof, nor `extra_delta` changes the elected leader. The VDF does
not vote; slots stay discrete (no wall clock).
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
    timechain_vdf_input,
    verify_plot_commitment,
    verify_pospace,
    verify_sequential_vdf,
    wesolowski,
)
from chronarch_spec import chash

# Wesolowski test-group proof iterations (small; optional field).
WESOLOWSKI_ITERATIONS = 64

_SLOT_HEADER_FIELDS = (
    "slot", "leader", "plot_id", "space_units", "plot_commitment_hash",
    "infused_challenge", "prev_quality", "pospace", "plot_filter_ok", "vdf",
    # Phase 8 CHIP-48-shaped + time-chain + optional Wesolowski fields:
    "plot_filter_bits", "quality_string", "extra_delta", "prev_vdf_output",
    "wesolowski_proof",
)


class SlotHeaderError(ValueError):
    pass


def _challenge_for(slot: int, prev_slot_header: dict | None) -> tuple[str, str]:
    if prev_slot_header is None:
        return genesis_challenge(), ""
    prev_quality = prev_slot_header["pospace"]["quality_string"]
    prev_challenge = prev_slot_header["infused_challenge"]
    return infuse_challenge(prev_quality, prev_challenge, slot), prev_quality


def _prev_vdf_output(prev_slot_header: dict | None) -> str:
    return "" if prev_slot_header is None else prev_slot_header["vdf"]["output"]


def build_slot_header(*, slot: int, leader: str, commitment: dict,
                      space_units: int, prev_slot_header: dict | None = None,
                      prev_header_hash: str = "", vdf_placeholder=None,
                      vdf_iterations: int = DEFAULT_VDF_ITERATIONS,
                      extra_delta: int = 0, with_wesolowski: bool = False) -> dict:
    """Leader-side. `prev_header_hash`/`vdf_placeholder` are accepted for
    call-compat but superseded. `wesolowski_proof` is OPTIONAL (off by
    default): a header without it is still valid."""
    verify_plot_commitment(commitment)
    challenge, prev_quality = _challenge_for(slot, prev_slot_header)
    proof = make_pospace(commitment["plot_id"], challenge, space_units,
                         filter_prefix_bits=FILTER_PREFIX_BITS)
    quality = proof["quality_string"]

    # Phase 8 time chain: the VDF input commits to the previous VDF output.
    prev_vdf_output = _prev_vdf_output(prev_slot_header)
    vdf_input = timechain_vdf_input(challenge, prev_vdf_output)
    vdf = make_sequential_vdf(vdf_input, vdf_iterations)

    wesolowski_proof = (
        wesolowski.prove(challenge, WESOLOWSKI_ITERATIONS) if with_wesolowski else None)

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
        # Phase 8 fields:
        "plot_filter_bits": FILTER_PREFIX_BITS,
        "quality_string": quality,
        "extra_delta": int(extra_delta),
        "prev_vdf_output": prev_vdf_output,
        "wesolowski_proof": wesolowski_proof,
    }


def verify_slot_header(slot_header: dict, *, space_units: int,
                       prev_slot_header: dict | None = None) -> dict:
    """Follower-side: returns {ok, error_code}. Fails closed on a missing
    field. The VDF, Wesolowski proof, and extra_delta never change the
    elected leader."""
    if not isinstance(slot_header, dict) or set(slot_header) != set(_SLOT_HEADER_FIELDS):
        return {"ok": False, "error_code": "SLOT_HEADER_BAD_STRUCTURE"}
    if not slot_header["plot_commitment_hash"]:
        return {"ok": False, "error_code": "SLOT_HEADER_NO_PLOT_COMMITMENT"}

    # extra_delta must be a uint and is otherwise inert (it does not vote).
    delta = slot_header["extra_delta"]
    if not isinstance(delta, int) or isinstance(delta, bool) or delta < 0:
        return {"ok": False, "error_code": "SLOT_HEADER_BAD_EXTRA_DELTA"}

    # Infused challenge chain.
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

    # Plot filter — fail closed. plot_filter_bits cannot claim a weaker filter,
    # and quality_string must match the ProofOfSpace.
    if slot_header["plot_filter_bits"] != FILTER_PREFIX_BITS:
        return {"ok": False, "error_code": "SLOT_HEADER_FILTER_BITS_MISMATCH"}
    quality = pospace.get("quality_string", "")
    if slot_header["quality_string"] != quality:
        return {"ok": False, "error_code": "SLOT_HEADER_QUALITY_MISMATCH"}
    if not (quality and plot_filter_ok(quality)):
        return {"ok": False, "error_code": "SLOT_HEADER_FILTER_FAIL"}
    if slot_header["plot_filter_ok"] is not True:
        return {"ok": False, "error_code": "SLOT_HEADER_FILTER_CLAIM_MISMATCH"}

    result = verify_pospace(pospace, space_units)
    if not result["ok"]:
        return {"ok": False, "error_code": result["error_code"]}

    # Phase 8 time chain: prev_vdf_output must match the follower's own prev,
    # and the SequentialVDF input must commit to it.
    expected_prev_vdf = _prev_vdf_output(prev_slot_header)
    if slot_header["prev_vdf_output"] != expected_prev_vdf:
        return {"ok": False, "error_code": "SLOT_HEADER_PREV_VDF_MISMATCH"}
    expected_vdf_input = timechain_vdf_input(
        slot_header["infused_challenge"], expected_prev_vdf)
    if slot_header["vdf"].get("input") != expected_vdf_input:
        return {"ok": False, "error_code": "SLOT_HEADER_VDF_INPUT_MISMATCH"}
    if not verify_sequential_vdf(slot_header["vdf"]):
        return {"ok": False, "error_code": "SLOT_HEADER_VDF_INVALID"}

    # OPTIONAL Wesolowski proof: verify iff present; absent is still valid.
    weso = slot_header["wesolowski_proof"]
    if weso is not None:
        if not wesolowski.verify(slot_header["infused_challenge"], weso):
            return {"ok": False, "error_code": "SLOT_HEADER_WESOLOWSKI_INVALID"}

    return {"ok": True, "error_code": "SLOT_HEADER_OK"}


def commitment_for_node(identity: str, cas) -> dict:
    return make_plot_commitment(identity, "test", index=0, cas_root=cas_root_of(cas))


def pospace_challenge(slot: int, prev_header_hash: str) -> str:
    return chash("pospace-challenge", {"slot": slot, "prev": prev_header_hash})
