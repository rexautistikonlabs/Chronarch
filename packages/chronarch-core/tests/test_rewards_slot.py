"""Phase 14 tests: Chronos issuance for space, pins, and compute.

Chronos is blood, not conscience (G2). The router credits space/pin/compute/
treasury with integers that always sum to SLOT_REWARD; it never rewards a
Challenge pass, a Ballot yes, self-PoQ, an LLM draft, or a hat role, and a
pin-failing farmer is never paid.
"""
import pytest

from chronarch_core import Credit, reward_slot, totals_by_reason
from chronarch_spec.constants import (
    COMPUTE_SHARE_CHRONONS,
    PIN_SHARE_CHRONONS,
    REWARD_TREASURY_ACCOUNT,
    SLOT_REWARD_CHRONONS,
    SPACE_SHARE_CHRONONS,
    TREASURY_SHARE_CHRONONS,
)


def _by_reason(credits):
    out = {}
    for c in credits:
        out.setdefault(c.reason, []).append(c)
    return out


def test_shares_sum_to_slot_reward_constant():
    assert (SPACE_SHARE_CHRONONS + PIN_SHARE_CHRONONS + COMPUTE_SHARE_CHRONONS
            + TREASURY_SHARE_CHRONONS) == SLOT_REWARD_CHRONONS


def test_full_slot_sums_to_slot_reward():
    credits = reward_slot(5, "A", pin_ok_ids=["A"], compute_receipts=[{"worker": "W"}])
    assert sum(c.amount for c in credits) == SLOT_REWARD_CHRONONS
    kinds = {c.reason for c in credits}
    assert kinds == {"space", "pin", "compute", "treasury"}


def test_leader_gets_space():
    credits = reward_slot(9, "leader-1", pin_ok_ids=["leader-1"])
    space = [c for c in credits if c.reason == "space"]
    assert len(space) == 1
    assert space[0].account == "leader-1"
    assert space[0].amount == SPACE_SHARE_CHRONONS


def test_pins_ok_false_pays_space_not_pin():
    # No pin-ok farmers this slot: the leader still earns SPACE, but NO pin
    # credit is issued (pin-fail-still-paid is rejected). The pin share folds
    # into the treasury sink, and the slot still emits exactly SLOT_REWARD.
    credits = reward_slot(5, "A", pin_ok_ids=[], compute_receipts=[])
    by = _by_reason(credits)
    assert [c.account for c in by["space"]] == ["A"]
    assert "pin" not in by  # no farmer is paid the pin share
    treasury = sum(c.amount for c in by["treasury"])
    assert treasury == TREASURY_SHARE_CHRONONS + PIN_SHARE_CHRONONS + COMPUTE_SHARE_CHRONONS
    assert sum(c.amount for c in credits) == SLOT_REWARD_CHRONONS


def test_compute_missing_folds_to_treasury():
    # Documented choice: a slot with no attested compute receipt sends the
    # compute share to the treasury sink (never left unissued).
    credits = reward_slot(3, "A", pin_ok_ids=["A"], compute_receipts=[])
    by = _by_reason(credits)
    assert "compute" not in by
    treasury = sum(c.amount for c in by["treasury"])
    assert treasury == TREASURY_SHARE_CHRONONS + COMPUTE_SHARE_CHRONONS
    assert sum(c.amount for c in credits) == SLOT_REWARD_CHRONONS


def test_pin_split_is_integer_with_dust_to_treasury():
    credits = reward_slot(7, "A", pin_ok_ids=["A", "B", "C"])  # 3-way, not exact
    pins = [c for c in credits if c.reason == "pin"]
    assert len(pins) == 3
    each = PIN_SHARE_CHRONONS // 3
    assert all(c.amount == each for c in pins)
    # dust (PIN_SHARE - 3*each) went to treasury; total still exact
    assert sum(c.amount for c in credits) == SLOT_REWARD_CHRONONS
    assert all(isinstance(c.amount, int) for c in credits)  # integers only


def test_compute_receipt_worker_forms():
    a = reward_slot(1, "A", compute_receipts=[{"worker": "W1"}])
    b = reward_slot(1, "A", compute_receipts=["W1"])
    c = reward_slot(1, "A", compute_receipts=[{"account": "W1"}])
    for credits in (a, b, c):
        workers = [x.account for x in credits if x.reason == "compute"]
        assert workers == ["W1"]


def test_bad_compute_receipt_rejected():
    with pytest.raises(ValueError):
        reward_slot(1, "A", compute_receipts=[{"no_worker": 1}])


def test_treasury_account_is_a_sink_not_a_key():
    credits = reward_slot(1, "A")
    treasury = [c for c in credits if c.reason == "treasury"]
    assert treasury and treasury[0].account == REWARD_TREASURY_ACCOUNT
    assert "key" not in REWARD_TREASURY_ACCOUNT  # a protocol sink, never a key


def test_negative_slot_and_missing_leader_rejected():
    with pytest.raises(ValueError):
        reward_slot(-1, "A")
    with pytest.raises(ValueError):
        reward_slot(1, "")


def test_credit_rejects_unknown_reason():
    with pytest.raises(ValueError):
        Credit("A", 1, "ballot_yes", 1)  # rewards never attach to a Ballot yes


def test_totals_by_reason_accepts_dicts_and_objects():
    credits = reward_slot(2, "A", pin_ok_ids=["A"], compute_receipts=["W"])
    from_objs = totals_by_reason(credits)
    from_dicts = totals_by_reason([c.as_dict() for c in credits])
    assert from_objs == from_dicts
    assert sum(from_objs.values()) == SLOT_REWARD_CHRONONS
