"""Phase 6 — local Proof-of-Space stand-in + VDF stub (Chia-family body).

This replaces the *verification body* of the farm's plot proofs with a
real-enough, deterministic local verifier. It is a **Phase-6 local PoSpace
stand-in, not Chia mainnet proofs**: no chia-blockchain is vendored, no
CHIP-48 / mainnet compatibility is claimed, and real plot tables + a real
VDF (Wesolowski/Pietrzak) are an explicit Phase-7 non-goal.

The existing `verify_plot_proof(proof, commitment)` signature is untouched
(see plots.py) — this module adds new objects and functions alongside it.

Determinism: the proof search is a deterministic nonce walk (increment from
0). No wall clock, no randomness. The lottery stays space-weighted and
prestress-gated; nothing here votes.
"""
from __future__ import annotations

from chronarch_spec import hash_bytes

from .plots import PlotError

_MAX256 = (1 << 256) - 1
_POSPACE_DOMAIN = b"chronarch/v0/pospace\n"
_VDF_DOMAIN = b"chronarch/v0/vdf\n"

# Stable error codes for the PoSpace verifier.
POSPACE_OK = "POSPACE_OK"
POSPACE_BAD_STRUCTURE = "POSPACE_BAD_STRUCTURE"
POSPACE_QUALITY_MISMATCH = "POSPACE_QUALITY_MISMATCH"
POSPACE_BELOW_DIFFICULTY = "POSPACE_BELOW_DIFFICULTY"  # quality >= difficulty threshold
POSPACE_ZERO_SPACE = "POSPACE_ZERO_SPACE"
POSPACE_CHIAPOS_REJECT = "POSPACE_CHIAPOS_REJECT"  # opt-in extra rejected (never in default CI)

_POSPACE_FIELDS = ("challenge", "plot_id", "proof_bytes", "quality_string")
_MAX_GRIND = 100_000  # a positive-space farmer passes within a couple of tries


def difficulty_from_space_units(space_units: int) -> int:
    """Threshold a quality must fall under. More space -> higher threshold
    (easier). Zero/negative space -> 0 (impossible to beat).

    threshold = MAX256 * units / (units + 1): units=1 -> ~2 expected grind
    tries; large units -> ~1. Monotone in space, so more committed space is
    strictly easier — the Chia-family shape, without the tables.
    """
    if space_units <= 0:
        return 0
    return _MAX256 * space_units // (space_units + 1)


def _quality(plot_id: str, challenge: str, proof_bytes: str) -> str:
    data = _POSPACE_DOMAIN + plot_id.encode() + challenge.encode() + proof_bytes.encode()
    return hash_bytes(data)


def make_pospace(plot_id: str, challenge: str, space_units: int,
                 filter_prefix_bits: int = 0) -> dict:
    """Grind a valid ProofOfSpace for (plot_id, challenge) at the farmer's
    space. Deterministic nonce walk from 0.

    `filter_prefix_bits` (Phase 7, default 0 = Phase-6 behavior) also requires
    the quality to carry that many leading zero bits (the plot filter). With
    the default 0 this is identical to Phase 6."""
    if space_units <= 0:
        raise PlotError("cannot make a pospace for zero space")
    difficulty = difficulty_from_space_units(space_units)
    nonce = 0
    while nonce < _MAX_GRIND:
        proof_bytes = format(nonce, "x")
        quality = _quality(plot_id, challenge, proof_bytes)
        if int(quality, 16) < difficulty:
            if filter_prefix_bits <= 0 or _leading_zero_bits(quality) >= filter_prefix_bits:
                return {
                    "challenge": challenge,
                    "plot_id": plot_id,
                    "proof_bytes": proof_bytes,
                    "quality_string": quality,
                }
        nonce += 1
    raise PlotError("pospace grind exhausted (difficulty/filter too hard for stand-in)")


def _leading_zero_bits(hex_hash: str) -> int:
    value = int(hex_hash, 16)
    total_bits = len(hex_hash) * 4
    return total_bits - value.bit_length() if value else total_bits


def verify_pospace(pospace: dict, space_units: int) -> dict:
    """Verify a ProofOfSpace against a claimed space. Returns
    {ok, error_code, quality}. Stable codes; never raises on a bad proof.

    The hash stand-in below is the DEFAULT and stands entirely on its own. When
    (and only when) `CHRONARCH_CHIAPOS=1` and the optional `chiapos` package
    imports, an OPTIONAL cross-check may additionally reject the proof
    (`verify_pospace_extra`) — an opt-in extra, never a compatibility claim, and
    it never changes the lottery (it can only make a proof stricter). With no
    opt-in the extra returns None and this function is the frozen Phase-6
    verifier — the signature is unchanged."""
    if not isinstance(pospace, dict) or set(pospace) != set(_POSPACE_FIELDS):
        return {"ok": False, "error_code": POSPACE_BAD_STRUCTURE, "quality": ""}
    for field in _POSPACE_FIELDS:
        if not isinstance(pospace[field], str):
            return {"ok": False, "error_code": POSPACE_BAD_STRUCTURE, "quality": ""}
    if space_units <= 0:
        return {"ok": False, "error_code": POSPACE_ZERO_SPACE, "quality": ""}
    recomputed = _quality(pospace["plot_id"], pospace["challenge"], pospace["proof_bytes"])
    if recomputed != pospace["quality_string"]:
        return {"ok": False, "error_code": POSPACE_QUALITY_MISMATCH, "quality": recomputed}
    if int(recomputed, 16) >= difficulty_from_space_units(space_units):
        return {"ok": False, "error_code": POSPACE_BELOW_DIFFICULTY, "quality": recomputed}
    from .chiapos_backend import verify_pospace_extra
    if verify_pospace_extra(pospace) is False:  # None (default, no opt-in) → no change
        return {"ok": False, "error_code": POSPACE_CHIAPOS_REJECT, "quality": recomputed}
    return {"ok": True, "error_code": POSPACE_OK, "quality": recomputed}


# ---------------------------------------------------------------------------
# VDF stub (typed record only). NOT Wesolowski/Pietrzak; does not change slot
# time to wall-clock; does not vote. The lottery ignores it entirely.
# ---------------------------------------------------------------------------
_VDF_FIELDS = ("input", "output", "iterations")


def make_vdf_record(vdf_input: str, iterations: int) -> dict:
    if not isinstance(iterations, int) or isinstance(iterations, bool) or iterations < 0:
        raise PlotError("iterations must be a non-negative int")
    output = hash_bytes(_VDF_DOMAIN + vdf_input.encode() + str(iterations).encode())
    return {"input": vdf_input, "output": output, "iterations": iterations}


def verify_vdf_record(record: dict) -> bool:
    """Stub check: output == SHA256(domain || input || iterations). This
    proves record integrity only — it is NOT a proof of elapsed time."""
    if not isinstance(record, dict) or set(record) != set(_VDF_FIELDS):
        return False
    expected = hash_bytes(
        _VDF_DOMAIN + str(record["input"]).encode() + str(record["iterations"]).encode())
    return record["output"] == expected
