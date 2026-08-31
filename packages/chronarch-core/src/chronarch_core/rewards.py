"""Reward router (K12): per-slot issuance split by frozen bps.

No mint exists outside this schedule (TOKEN.md); changing it is M4.
"""
from __future__ import annotations

from chronarch_spec.constants import (
    BASE_REWARD_PER_SLOT_CHRONONS,
    HALVING_INTERVAL_SLOTS,
    REWARD_ROUTER_BPS,
)


def slot_issuance_chronons(slot: int) -> int:
    if slot < 0:
        raise ValueError("negative slot")
    return BASE_REWARD_PER_SLOT_CHRONONS >> (slot // HALVING_INTERVAL_SLOTS)


def route_slot_reward(slot: int) -> dict:
    """Split one slot's issuance across the router. Integer math; the
    remainder from floor division goes to treasury so no chronon is lost
    and none is minted."""
    issuance = slot_issuance_chronons(slot)
    shares = {name: issuance * bps // 10000 for name, bps in REWARD_ROUTER_BPS.items()}
    remainder = issuance - sum(shares.values())
    shares["treasury_share"] += remainder
    assert sum(shares.values()) == issuance
    return shares
