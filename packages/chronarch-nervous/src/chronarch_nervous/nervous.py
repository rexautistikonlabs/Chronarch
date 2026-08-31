"""Nervous system (K7): measure -> RestrictionState -> predict -> test -> HealthVector.

Method (Rex Autistikon, analogical): measure restriction at named
interfaces; hold a latent restriction/prestress state; predict load
transmission through the tensegrity network; test. If the prediction fails,
the health MODEL is wrong — and that is also a scar (G18: falsifiable
instrumentation, not metaphysics).

Tensegrity mapping: compression members take load (plots, CAS pins, full
nodes); tension members hold shape (hash-links, witness bonds, Hearth
bonds, covenant, challenge obligations). Prestress floors keep the organism
from ever going slack. Healing restores prestress WITHOUT cutting tension
members — there is no silent history delete anywhere in this module.
"""
from __future__ import annotations

from chronarch_spec import chash, validate
from chronarch_spec.constants import (
    HEALTH_COMPONENTS,
    INTERFACE_IDS,
    MAX_CHALLENGE_GAP_SLOTS,
    MIN_COUNCIL_BOND_CHRONONS,
    MIN_PINSET_SIZE,
)

# Static strain-transmission adjacency: an unmetabolized restriction at one
# interface transmits strain to its neighbors (continuous tension —
# discontinuous compression: no single interface is the spine).
ADJACENCY: dict[str, tuple[str, ...]] = {
    "I1": ("I3", "I5"),          # broken hash walk strains retrieval + replay
    "I2": ("I1", "I9"),          # dishonest plots strain the clock + economics
    "I3": ("I4", "I5"),          # missing pins strain challenges + replay
    "I4": ("I5", "I10"),         # failing challenges strain replay + council
    "I5": ("I4", "I6"),          # replay drift strains challenges + mempool
    "I6": ("I8",),               # injection pressure strains the covenant
    "I7": ("I1", "I10"),         # eclipse strains the walk + council liveness
    "I8": ("I10", "I6"),         # covenant drift strains council + mempool
    "I9": ("I10", "I2"),         # insolvency strains council + farming
    "I10": ("I8", "I9"),         # dead council strains covenant + hearth
}
assert set(ADJACENCY) == set(INTERFACE_IDS)

# Strain decays by half as it crosses one interface boundary (integer bps).
_TRANSMISSION_DECAY_NUM = 1
_TRANSMISSION_DECAY_DEN = 2


def measure_restriction(interface: str, magnitude_bps: int, *, slot: int) -> dict:
    """Wrap a raw measurement into a RestrictionState with its prediction."""
    if interface not in INTERFACE_IDS:
        raise ValueError(f"unknown interface {interface!r}")
    magnitude_bps = max(0, min(10000, magnitude_bps))
    state = {
        "interface": interface,
        "restricted": magnitude_bps > 0,
        "magnitude_bps": magnitude_bps,
        "measured_slot": slot,
        "prediction": predict_transmission(interface, magnitude_bps),
    }
    return validate("RestrictionState", state)


def predict_transmission(interface: str, magnitude_bps: int) -> dict:
    """Predict strain at adjacent interfaces (one hop, halved)."""
    predicted = magnitude_bps * _TRANSMISSION_DECAY_NUM // _TRANSMISSION_DECAY_DEN
    return {adjacent: predicted for adjacent in ADJACENCY[interface]}


def test_transmission(restriction: dict, observed: dict) -> dict:
    """Compare prediction with observation. A failed prediction falsifies
    the model — the caller MUST seal that as a scar too (G18)."""
    predicted = restriction["prediction"]
    # The model is falsified when observed strain lands where none was
    # predicted, or is more than double / less than half the prediction.
    falsified = False
    for interface, strain in observed.items():
        expected = predicted.get(interface, 0)
        if expected == 0 and strain > 500:
            falsified = True
        elif expected > 0 and not (expected // 2 <= strain <= expected * 2):
            falsified = True
    report = {
        "restriction_hash": chash("RestrictionState", restriction),
        "predicted": dict(predicted),
        "observed": dict(observed),
        "model_falsified": falsified,
    }
    return validate("TransmissionReport", report)


def prestress_ok(*, bond_chronons: int, pinset_size: int,
                 last_challenge_pass_slot: int, slot: int) -> dict:
    """Prestress floors: minimum bond, minimum pin-set, mandatory gym
    cadence. Below floor -> demote slot eligibility (never silent control,
    never a history edit)."""
    checks = {
        "bond": bond_chronons >= MIN_COUNCIL_BOND_CHRONONS,
        "pinset": pinset_size >= MIN_PINSET_SIZE,
        "cadence": (slot - last_challenge_pass_slot) <= MAX_CHALLENGE_GAP_SLOTS,
    }
    return {"ok": all(checks.values()), "checks": checks}


def build_health_vector(epoch: int, components: dict) -> dict:
    """Fold per-component scores (0..10000 bps) into the epoch HealthVector."""
    filled = {name: max(0, min(10000, int(components.get(name, 0))))
              for name in HEALTH_COMPONENTS}
    vector = {
        "epoch": epoch,
        "components": filled,
        "total_bps": sum(filled.values()) // len(HEALTH_COMPONENTS),
    }
    return validate("HealthVector", vector)
