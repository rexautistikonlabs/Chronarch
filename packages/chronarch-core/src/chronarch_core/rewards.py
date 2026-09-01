"""Reward router (K12): per-slot issuance split by frozen bps, and (Phase 14)
the concrete per-slot Chronos crediting for space, pins, and compute.

No mint exists outside this schedule (TOKEN.md); changing it is M4.

Chronos is blood, not conscience (G2). Nothing here rewards a Challenge pass,
a Ballot yes, a self-PoQ score, an LLM draft, or a hat role — the router only
knows who led the slot's space lottery, which farmers' pins verified, and which
compute receipts were attested. Rewards are a separate ledger; they never touch
Challenge/Ballot legality, Hearth salience, vote weight, or the lottery.
"""
from __future__ import annotations

from dataclasses import dataclass

from chronarch_spec.constants import (
    BASE_REWARD_PER_SLOT_CHRONONS,
    COMPUTE_SHARE_CHRONONS,
    HALVING_INTERVAL_SLOTS,
    PIN_SHARE_CHRONONS,
    REWARD_REASONS,
    REWARD_ROUTER_BPS,
    REWARD_TREASURY_ACCOUNT,
    SLOT_REWARD_CHRONONS,
    SPACE_SHARE_CHRONONS,
    TREASURY_SHARE_CHRONONS,
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


# --------------------------------------------------------------------------
# Phase 14: Chronos issuance for space, pins, and compute.
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class Credit:
    """One chronon credit to one account for one slot. `reason` is one of
    space | pin | compute | treasury. A Credit is inert accounting — it grants
    no salience, no vote weight, no lottery weight."""

    account: str
    amount: int
    reason: str
    slot: int

    def __post_init__(self) -> None:
        if self.reason not in REWARD_REASONS:
            raise ValueError(f"unknown reward reason {self.reason!r}")
        if self.amount < 0:
            raise ValueError("credit amount cannot be negative")

    def as_dict(self) -> dict:
        return {"account": self.account, "amount": self.amount,
                "reason": self.reason, "slot": self.slot}


def _receipt_worker(receipt) -> str:
    """A compute receipt names the worker account being paid. Accept a dict
    (with a 'worker'/'account' key) or a bare worker id string."""
    if isinstance(receipt, str):
        if not receipt:
            raise ValueError("compute receipt worker id is empty")
        return receipt
    if isinstance(receipt, dict):
        worker = receipt.get("worker") or receipt.get("account")
        if not worker:
            raise ValueError("compute receipt needs a 'worker' account")
        return worker
    raise ValueError("compute receipt must be a dict or a worker id")


def _split(accounts, pot: int, reason: str, slot: int, out: list) -> int:
    """Pay `pot` evenly across the unique accounts (deterministic order),
    appending Credits to `out`. Returns the UNPAID remainder: the whole pot
    when there is nobody to pay, otherwise the floor-division dust. Integer
    math only — the caller sends the remainder to the treasury so no chronon
    is minted or lost."""
    unique = sorted(set(accounts))
    if not unique:
        return pot
    each = pot // len(unique)
    for account in unique:
        out.append(Credit(account, each, reason, slot))
    return pot - each * len(unique)


def reward_slot(slot: int, leader_id: str, pin_ok_ids=None,
                compute_receipts=None) -> list[Credit]:
    """Credit one winning slot. Integers only; the four shares always sum to
    SLOT_REWARD_CHRONONS.

      * SPACE   -> the slot leader (always — the leader won the space lottery).
      * PIN     -> split across pin-ok farmers this slot. If NO farmer's pins
                   verify (pins_ok false), no farmer is paid the pin share —
                   a pin-failing farmer is NEVER paid — and the unpaid pin
                   share falls to the treasury sink.
      * COMPUTE -> split across attested compute receipts' workers. If there
                   are no receipts this slot, the compute share falls to the
                   treasury sink (it is never left unissued — documented).
      * TREASURY-> the fixed treasury share PLUS every unpaid remainder above,
                   to a protocol sink account (not an admin key).
    """
    if slot < 0:
        raise ValueError("negative slot")
    if not leader_id:
        raise ValueError("a winning slot must have a leader")
    pin_ok_ids = list(pin_ok_ids or [])
    compute_receipts = list(compute_receipts or [])

    credits: list[Credit] = []
    treasury = TREASURY_SHARE_CHRONONS

    credits.append(Credit(leader_id, SPACE_SHARE_CHRONONS, "space", slot))
    treasury += _split(pin_ok_ids, PIN_SHARE_CHRONONS, "pin", slot, credits)
    workers = [_receipt_worker(r) for r in compute_receipts]
    treasury += _split(workers, COMPUTE_SHARE_CHRONONS, "compute", slot, credits)
    credits.append(Credit(REWARD_TREASURY_ACCOUNT, treasury, "treasury", slot))

    assert sum(c.amount for c in credits) == SLOT_REWARD_CHRONONS
    return credits


def totals_by_reason(credits) -> dict:
    """Sum credit amounts by reason (space|pin|compute|treasury)."""
    out: dict[str, int] = {}
    for c in credits:
        reason = c["reason"] if isinstance(c, dict) else c.reason
        amount = c["amount"] if isinstance(c, dict) else c.amount
        out[reason] = out.get(reason, 0) + amount
    return out
