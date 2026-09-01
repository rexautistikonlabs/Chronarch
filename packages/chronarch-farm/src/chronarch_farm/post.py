"""Chronarch Proof of Space and Time — the farmer-facing façade (Phase 9).

Canonical Chronarch primitive names over the existing internals. Chia
inspired the body; these are Chronarch's own objects. Chronarch does NOT
implement CHIP-48 and claims no Chia mainnet compatibility.

  SpaceSeal  = a PlotCommitment (space_units + optional cas_root)
  SpaceProof = a ProofOfSpace  (challenge, plot_id, proof_bytes, quality)
  Pulse      = the infused challenge chain
  Filter     = quality prefix bits
  TimeSeal   = a SequentialVDF on discrete slots
  TimeProof  = an OPTIONAL Wesolowski-style proof (test group)

The law, in one paragraph: Plots prove space. CAS stores memory. Time is
sequential and does not vote. Chronos is blood, not conscience. Major change
is Proposal + Ballot.

This module adds NO lottery math — it only renames and composes the frozen
pospace / infusion / wesolowski internals.
"""
from __future__ import annotations

from . import wesolowski as _wesolowski
from .infusion import (
    FILTER_PREFIX_BITS,
    genesis_challenge,
    infuse_challenge,
    make_sequential_vdf,
    plot_filter_ok,
    timechain_vdf_input,
    verify_sequential_vdf,
)
from .plots import make_plot_commitment, verify_plot_commitment
from .pospace import make_pospace, verify_pospace

# ---------------------------------------------------------------- SpaceSeal --

def make_space_seal(farmer_id: str, k_size: str = "test", *, index: int = 0,
                    cas_root: str = "") -> dict:
    """A SpaceSeal is a PlotCommitment: it seals reserved space to a farmer."""
    return make_plot_commitment(farmer_id, k_size, index=index, cas_root=cas_root)


def verify_space_seal(space_seal: dict) -> dict:
    return verify_plot_commitment(space_seal)


# --------------------------------------------------------------- SpaceProof --

def make_space_proof(space_seal: dict, challenge: str) -> dict:
    """A SpaceProof answers a Pulse challenge for a SpaceSeal, at that seal's
    space, satisfying both the difficulty and the Filter."""
    verify_plot_commitment(space_seal)
    return make_pospace(space_seal["plot_id"], challenge, space_seal["space_units"],
                        filter_prefix_bits=FILTER_PREFIX_BITS)


def verify_space_proof(space_proof: dict, space_units: int) -> dict:
    """Returns {ok, error_code, quality} — the frozen Phase-6 verifier."""
    return verify_pospace(space_proof, space_units)


# --------------------------------------------------- Filter (quality prefix) --

def filter_ok(quality: str, prefix_bits: int = FILTER_PREFIX_BITS) -> bool:
    return plot_filter_ok(quality, prefix_bits)


# --------------------------------------------------------------- Pulse -------

def genesis_pulse() -> str:
    """The slot-0 Pulse challenge."""
    return genesis_challenge()


def next_pulse(prev_quality: str, prev_pulse: str, slot: int) -> str:
    """The next Pulse = infusion of the previous slot's quality + challenge."""
    return infuse_challenge(prev_quality, prev_pulse, slot)


def verify_pulse(pulse: str, prev_quality: str, prev_pulse: str, slot: int) -> bool:
    """A Pulse is valid iff it recomputes from its predecessor (slot 0 uses
    the genesis pulse)."""
    if slot == 0 or not prev_pulse:
        return pulse == genesis_challenge()
    return pulse == infuse_challenge(prev_quality, prev_pulse, slot)


# -------------------------------------------------------------- TimeSeal -----

def make_time_seal(pulse: str, prev_vdf_output: str = "", *, iterations: int = 16) -> dict:
    """A TimeSeal is a SequentialVDF whose input commits to this Pulse and the
    previous TimeSeal's output (the time chain). It does NOT vote."""
    vdf_input = timechain_vdf_input(pulse, prev_vdf_output)
    return make_sequential_vdf(vdf_input, iterations)


def verify_time_seal(time_seal: dict, pulse: str, prev_vdf_output: str = "") -> bool:
    expected_input = timechain_vdf_input(pulse, prev_vdf_output)
    if time_seal.get("input") != expected_input:
        return False
    return verify_sequential_vdf(time_seal)


# ------------------------------------------------------------- TimeProof -----

def make_time_proof(pulse: str, iterations: int = 64) -> dict:
    """An OPTIONAL Wesolowski-style TimeProof over a Pulse (test group)."""
    return _wesolowski.prove(pulse, iterations)


def verify_time_proof(pulse: str, time_proof: dict) -> bool:
    """Verify an optional TimeProof. An absent proof is the caller's choice;
    this verifies a present one."""
    return _wesolowski.verify(pulse, time_proof)
