"""The node's SlotHeader — Chronarch-native space/time body.

Canonical primitive names (see specs/CHRONARCH_POST.md):

  SpaceSeal    = the PlotCommitment (+ space_units, optional cas_root)
  SpaceProof   = the ProofOfSpace (challenge, plot_id, proof_bytes, quality)
  Pulse        = the infused challenge chain
  Filter       = quality prefix bits           -> field `filter_bits`
  TimeSeal     = the SequentialVDF on discrete slots
  TimeProof    = the optional Wesolowski-style proof (test group) -> `time_proof`
  extra_weight = a lottery-INERT header field   -> field `extra_weight`

Chia inspired the body; Chronarch owns these objects and does not implement
CHIP-48. The lottery ignores every field here — the VDF does not vote, and
`extra_weight` cannot change a winner. Slots stay discrete (no wall clock).

Backward compat: `extra_delta=` / `with_wesolowski=` kwargs remain aliases
for `extra_weight=` / `with_time_proof=`.
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

# Optional TimeProof iterations (small; the field is off by default).
TIME_PROOF_ITERATIONS = 64

_SLOT_HEADER_FIELDS = (
    "slot", "leader", "plot_id", "space_units", "plot_commitment_hash",
    "infused_challenge", "prev_quality", "pospace", "plot_filter_ok", "vdf",
    # Chronarch-native names (Phase 9 canonical):
    "filter_bits", "quality_string", "extra_weight", "prev_vdf_output",
    "time_proof",
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
                      extra_weight: int = 0, extra_delta: int | None = None,
                      with_time_proof: bool = False,
                      with_wesolowski: bool | None = None) -> dict:
    """Leader-side. `extra_delta=` and `with_wesolowski=` are accepted as
    aliases for `extra_weight=` and `with_time_proof=`."""
    verify_plot_commitment(commitment)
    # Resolve deprecated aliases.
    if extra_delta is not None:
        extra_weight = extra_delta
    if with_wesolowski is not None:
        with_time_proof = with_wesolowski

    challenge, prev_quality = _challenge_for(slot, prev_slot_header)
    proof = make_pospace(commitment["plot_id"], challenge, space_units,
                         filter_prefix_bits=FILTER_PREFIX_BITS)
    quality = proof["quality_string"]

    prev_vdf_output = _prev_vdf_output(prev_slot_header)
    vdf_input = timechain_vdf_input(challenge, prev_vdf_output)
    vdf = make_sequential_vdf(vdf_input, vdf_iterations)

    time_proof = (
        wesolowski.prove(challenge, TIME_PROOF_ITERATIONS) if with_time_proof else None)

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
        "filter_bits": FILTER_PREFIX_BITS,
        "quality_string": quality,
        "extra_weight": int(extra_weight),
        "prev_vdf_output": prev_vdf_output,
        "time_proof": time_proof,
    }


def verify_slot_header(slot_header: dict, *, space_units: int,
                       prev_slot_header: dict | None = None) -> dict:
    """Follower-side: returns {ok, error_code}. Fails closed on a missing
    field. The TimeSeal, TimeProof, and extra_weight never change the winner."""
    if not isinstance(slot_header, dict) or set(slot_header) != set(_SLOT_HEADER_FIELDS):
        return {"ok": False, "error_code": "SLOT_HEADER_BAD_STRUCTURE"}
    if not slot_header["plot_commitment_hash"]:
        return {"ok": False, "error_code": "SLOT_HEADER_NO_PLOT_COMMITMENT"}

    # extra_weight must be a uint and is otherwise inert (it does not vote).
    weight = slot_header["extra_weight"]
    if not isinstance(weight, int) or isinstance(weight, bool) or weight < 0:
        return {"ok": False, "error_code": "SLOT_HEADER_BAD_EXTRA_WEIGHT"}

    # Pulse: infused challenge chain.
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

    # Filter — fail closed. filter_bits cannot claim a weaker filter, and
    # quality_string must match the SpaceProof.
    if slot_header["filter_bits"] != FILTER_PREFIX_BITS:
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

    # TimeSeal chain: prev_vdf_output must match, and the SequentialVDF input
    # must commit to it.
    expected_prev_vdf = _prev_vdf_output(prev_slot_header)
    if slot_header["prev_vdf_output"] != expected_prev_vdf:
        return {"ok": False, "error_code": "SLOT_HEADER_PREV_VDF_MISMATCH"}
    expected_vdf_input = timechain_vdf_input(
        slot_header["infused_challenge"], expected_prev_vdf)
    if slot_header["vdf"].get("input") != expected_vdf_input:
        return {"ok": False, "error_code": "SLOT_HEADER_VDF_INPUT_MISMATCH"}
    if not verify_sequential_vdf(slot_header["vdf"]):
        return {"ok": False, "error_code": "SLOT_HEADER_VDF_INVALID"}

    # OPTIONAL TimeProof: verify iff present; absent is still valid.
    time_proof = slot_header["time_proof"]
    if time_proof is not None:
        if not wesolowski.verify(slot_header["infused_challenge"], time_proof):
            return {"ok": False, "error_code": "SLOT_HEADER_TIME_PROOF_INVALID"}

    return {"ok": True, "error_code": "SLOT_HEADER_OK"}


def commitment_for_node(identity: str, cas) -> dict:
    return make_plot_commitment(identity, "test", index=0, cas_root=cas_root_of(cas))


def pospace_challenge(slot: int, prev_header_hash: str) -> str:
    return chash("pospace-challenge", {"slot": slot, "prev": prev_header_hash})
