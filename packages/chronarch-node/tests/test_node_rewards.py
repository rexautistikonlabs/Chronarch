"""Phase 14 node tests: a node credits the slots it wins, persists them in its
home, and the credit ledger never touches consensus.

Chronos is blood, not conscience: credits change no Hearth salience, no vote
weight, no lottery winner, and there is nowhere to put Chronos in Challenge or
Ballot judgment.
"""
import copy
import json
import os

import pytest

from chronarch_core import judge_challenge
from chronarch_node import Node
from chronarch_node.cluster import STEWARD_LOCK_CHRONONS
from chronarch_node.leader import slot_leader
from chronarch_spec.constants import (
    COMPUTE_SHARE_CHRONONS,
    PIN_SHARE_CHRONONS,
    SLOT_REWARD_CHRONONS,
    SPACE_SHARE_CHRONONS,
)


def _bonded(node, identity=None):
    node.hearth.lock(identity or node.identity, STEWARD_LOCK_CHRONONS, slot=0)
    return node


def _win(node, n_slots, start=1):
    won = 0
    for slot in range(start, start + n_slots):
        if node.produce_slot(slot):
            won += 1
    return won


def test_in_memory_node_accrues_credit_ledger():
    node = _bonded(Node("A", 1, space_table={"A": 1}))
    won = _win(node, 5)
    assert won == 5
    # 3 credits per won slot (space, pin-ok, treasury; compute folds to treasury)
    assert len(node.reward_credits) == won * 3
    totals = node.reward_totals()
    assert totals["totals"]["space"] == won * SPACE_SHARE_CHRONONS
    assert totals["totals"]["pin"] == won * PIN_SHARE_CHRONONS
    assert totals["last_slot"] == 5


def test_home_node_persists_rewards_and_resumes(tmp_path):
    home = str(tmp_path / "h")
    n1 = _bonded(Node("A", 1, home=home, space_table={"A": 1}))
    _win(n1, 4)
    assert os.path.isfile(os.path.join(home, "rewards.jsonl"))
    persisted = [json.loads(x) for x in open(os.path.join(home, "rewards.jsonl")) if x.strip()]
    assert len(persisted) == len(n1.reward_credits)

    n2 = Node("x", home=home, space_table={"A": 1})  # resume
    assert len(n2.reward_credits) == len(n1.reward_credits)
    assert n2.reward_totals() == n1.reward_totals()


def test_compute_receipt_pays_worker(tmp_path):
    # Phase 15: the receipt now goes through attestation (a real DummyMind job),
    # not a hand-built dict. This is a genuine attested receipt, not a backdoor.
    from chronarch_core import make_compute_receipt

    node = _bonded(Node("A", 1, space_table={"A": 1}))
    receipt = make_compute_receipt("gpu-1", "dummymind", "injection_screen_sense",
                                   node=node, inputs={"tx": {"amount": 1}})
    node.submit_compute_receipt(receipt)
    node.produce_slot(1)
    compute = [c for c in node.reward_credits if c["reason"] == "compute"]
    assert len(compute) == 1
    assert compute[0]["account"] == "gpu-1"
    assert compute[0]["amount"] == COMPUTE_SHARE_CHRONONS
    # the buffer is consumed — the next slot has no receipt
    node.produce_slot(2)
    slot2 = [c for c in node.reward_credits if c["slot"] == 2 and c["reason"] == "compute"]
    assert slot2 == []


def test_leader_with_pins_ok_false_gets_space_not_pin(tmp_path):
    # A file-backed node committing to a cas_root whose pins are absent reports
    # pins_ok False — it still wins slots (space) but earns no pin credit.
    from chronarch_core import PinStore
    from chronarch_farm import make_space_seal

    pd = str(tmp_path / "pins")
    store = PinStore(pd)
    committed = store.put_object({"x": 1})
    seal = make_space_seal("A", "test", cas_root=store.cas_root())
    node = _bonded(Node("A", space_seal=seal, pin_dir=pd, space_table={"A": 1}))
    store.withhold(committed)  # now pins_ok is False
    assert not node.verify_pins()["ok"]

    node.produce_slot(1)
    reasons = {c["reason"] for c in node.reward_credits}
    assert "space" in reasons
    assert "pin" not in reasons  # pin-fail is never paid
    assert sum(c["amount"] for c in node.reward_credits) == SLOT_REWARD_CHRONONS


def test_credit_does_not_change_hearth_salience_or_bond():
    node = _bonded(Node("A", 1, space_table={"A": 1}))
    before = copy.deepcopy(node.hearth.position("A"))
    solvency_before = node.hearth.solvency()
    _win(node, 5)
    after = node.hearth.position("A")
    # The bonded position — bond leg, liquidity leg, everything — is untouched.
    assert after == before
    # And the Hearth's solvency/vote-weight inputs are unchanged.
    assert node.hearth.solvency() == solvency_before


def test_credit_balances_do_not_change_lottery_winners():
    # Two farmers; run the lottery, then issue a lopsided pile of credits to one
    # farmer, and confirm every slot elects the identical leader.
    node = _bonded(Node("A", 1, space_table={"A": 1, "B": 6}))
    _bonded(node, "B")
    before = [slot_leader(s, node.space_table, node.eligible_leaders(s)) for s in range(1, 40)]
    _win(node, 20)  # A accrues credits when it wins
    after = [slot_leader(s, node.space_table, node.eligible_leaders(s)) for s in range(1, 40)]
    assert before == after


def test_chronos_cannot_enter_challenge_judgment():
    # judge_challenge has nowhere to put Chronos — a reward/chronos kwarg is a
    # TypeError, so a reward can never flip a Challenge outcome (G2).
    challenge = {}
    with pytest.raises(TypeError):
        judge_challenge(challenge, {"x": 1}, ["w1", "w2", "w3"], chronos=10**12)
    with pytest.raises(TypeError):
        judge_challenge(challenge, {"x": 1}, ["w1"], reward=1)


def test_reward_ring_is_not_gossiped_or_sealed():
    # Rewards are a separate ledger: producing a slot returns exactly the three
    # consensus gossip messages (slot_header, ring, header) — no reward message
    # — and the sealed economic ring body carries no credit list.
    node = _bonded(Node("A", 1, space_table={"A": 1}))
    msgs = node.produce_slot(1)
    kinds = [m["kind"] for m in msgs]
    assert kinds == ["slot_header", "ring", "header"]
    ring_body = next(m["body"] for m in msgs if m["kind"] == "ring")
    assert "credit" not in ring_body and "reward" not in ring_body
    assert set(ring_body) == {"event", "slot", "leader", "issuance"}
