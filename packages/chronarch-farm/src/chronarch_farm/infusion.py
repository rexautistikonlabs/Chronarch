"""Phase 7 — infused challenge chain, plot filter, and a sequential-time VDF.

Still a research fork: no chia-blockchain vendored, no mainnet, no
Wesolowski/Pietrzak. This wraps the Phase-6 local PoSpace stand-in (which
stays the DEFAULT backend) with:

  * an infused challenge chain — each slot's PoSpace challenge is derived
    from the previous slot's quality and challenge, so a leader cannot pick a
    favourable challenge;
  * a plot filter — only qualities with enough leading zero bits pass
    (fail closed: a missing filter field is a reject);
  * a SequentialVDF — output = H(H(...H(input)...)) for a small, pinned
    number of rounds. It is a genuine sequential computation (not one hash),
    but it is NOT a proof of elapsed time and the lottery ignores it: the
    VDF does not vote and slots stay discrete (no wall clock).

Deterministic: no randomness, no wall clock.
"""
from __future__ import annotations

from chronarch_spec import hash_bytes

from .plots import PlotError

_INFUSE_DOMAIN = b"chronarch/v0/infuse\n"
_GENESIS_DOMAIN = b"chronarch/v0/pospace-genesis\n"
_SEQVDF_DOMAIN = b"chronarch/v0/seqvdf\n"

# Plot filter strength. Small for tests: N zero bits => ~2^N grind tries.
# FROZEN-MVP; changing it post-genesis is an M1 genesis-param change (G14).
FILTER_PREFIX_BITS = 4

# Sequential VDF round count. Small and pinned for tests.
DEFAULT_VDF_ITERATIONS = 16
MAX_VDF_ITERATIONS = 4096


# ---------------------------------------------------------------------------
# Infused challenge chain
# ---------------------------------------------------------------------------

def genesis_challenge() -> str:
    """The slot-0 challenge: a fixed domain constant (no previous slot)."""
    return hash_bytes(_GENESIS_DOMAIN)


def infuse_challenge(prev_quality: str, prev_challenge: str, slot: int) -> str:
    """Slot n challenge = SHA256(domain || prev_quality || prev_challenge || slot)."""
    data = (_INFUSE_DOMAIN + prev_quality.encode() + prev_challenge.encode()
            + str(slot).encode())
    return hash_bytes(data)


# ---------------------------------------------------------------------------
# Plot filter
# ---------------------------------------------------------------------------

def leading_zero_bits(hex_hash: str) -> int:
    value = int(hex_hash, 16)
    total_bits = len(hex_hash) * 4
    return total_bits - value.bit_length() if value else total_bits


def plot_filter_ok(quality: str, prefix_bits: int = FILTER_PREFIX_BITS) -> bool:
    return leading_zero_bits(quality) >= prefix_bits


# ---------------------------------------------------------------------------
# SequentialVDF (sequential, domain-separated hashing — NOT Wesolowski)
# ---------------------------------------------------------------------------
_SEQVDF_FIELDS = ("input", "output", "iterations")


def make_sequential_vdf(vdf_input: str, iterations: int = DEFAULT_VDF_ITERATIONS) -> dict:
    if not isinstance(iterations, int) or isinstance(iterations, bool):
        raise PlotError("iterations must be an int")
    if not 0 <= iterations <= MAX_VDF_ITERATIONS:
        raise PlotError(f"iterations out of bounds [0, {MAX_VDF_ITERATIONS}]")
    cur = vdf_input
    for _ in range(iterations):
        cur = hash_bytes(_SEQVDF_DOMAIN + cur.encode())
    return {"input": vdf_input, "output": cur, "iterations": iterations}


def verify_sequential_vdf(record: dict) -> bool:
    """Recompute the whole chain. This proves the sequential work was done
    (each round feeds the next), NOT that wall-clock time elapsed."""
    if not isinstance(record, dict) or set(record) != set(_SEQVDF_FIELDS):
        return False
    iterations = record["iterations"]
    if not isinstance(iterations, int) or isinstance(iterations, bool):
        return False
    if not 0 <= iterations <= MAX_VDF_ITERATIONS:
        return False
    cur = str(record["input"])
    for _ in range(iterations):
        cur = hash_bytes(_SEQVDF_DOMAIN + cur.encode())
    return record["output"] == cur
