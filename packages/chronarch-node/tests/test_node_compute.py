"""Phase 15 node tests: submit_compute_receipt gates on attestation.

An unattested receipt is rejected and never buffered, so COMPUTE is paid only
for a DummyMind/gym job that verifies; when there is no attested receipt the
COMPUTE share folds to the treasury (the Phase 14 rule, unchanged). Chronos
still cannot enter Challenge judgment.
"""
import pytest

from chronarch_core import COMPUTE_OK, judge_challenge, make_compute_receipt
from chronarch_node import Node, NodeError
from chronarch_node.cluster import STEWARD_LOCK_CHRONONS
from chronarch_spec.constants import COMPUTE_SHARE_CHRONONS, TREASURY_SHARE_CHRONONS


def _bonded(node):
    node.hearth.lock(node.identity, STEWARD_LOCK_CHRONONS, slot=0)
    return node


def test_submit_attests_and_buffers_then_pays_on_win():
    node = _bonded(Node("A", 1, space_table={"A": 1}))
    receipt = make_compute_receipt("gpu-1", "dummymind", "injection_screen_sense",
                                   node=node, inputs={"tx": {"x": 1}})
    result = node.submit_compute_receipt(receipt)
    assert result["code"] == COMPUTE_OK
    assert len(node.compute_receipts) == 1

    node.produce_slot(1)
    compute = [c for c in node.reward_credits if c["reason"] == "compute"]
    assert len(compute) == 1
    assert compute[0]["account"] == "gpu-1"
    assert compute[0]["amount"] == COMPUTE_SHARE_CHRONONS
    assert node.compute_receipts == []  # consumed


def test_gym_receipt_attests_and_pays_on_win():
    node = _bonded(Node("A", 1, space_table={"A": 1}))
    receipt = make_compute_receipt("gym-worker", "gym", "forged_ring")
    node.submit_compute_receipt(receipt)
    node.produce_slot(1)
    compute = [c for c in node.reward_credits if c["reason"] == "compute"]
    assert compute and compute[0]["account"] == "gym-worker"


def test_unattested_receipt_rejected_and_compute_folds_to_treasury():
    node = _bonded(Node("A", 1, space_table={"A": 1}))
    good = make_compute_receipt("gpu-1", "dummymind", "injection_screen_sense",
                                node=node, inputs={"tx": {"x": 1}})
    bad = {**good, "output_hash": "0" * 64}  # wrong output
    with pytest.raises(NodeError):
        node.submit_compute_receipt(bad)
    assert node.compute_receipts == []  # not buffered

    node.produce_slot(1)
    compute = [c for c in node.reward_credits if c["reason"] == "compute"]
    treasury = [c for c in node.reward_credits if c["reason"] == "treasury"]
    assert compute == []  # no compute credit
    # COMPUTE folded into the treasury sink (Phase 14 rule, unchanged).
    assert sum(c["amount"] for c in treasury) == TREASURY_SHARE_CHRONONS + COMPUTE_SHARE_CHRONONS


def test_hand_built_receipt_without_attestation_is_rejected():
    # A raw dict that never went through a real job cannot be buffered.
    node = _bonded(Node("A", 1, space_table={"A": 1}))
    with pytest.raises(NodeError):
        node.submit_compute_receipt({"worker": "cheater", "job": "gym-smoke"})
    assert node.compute_receipts == []


def test_challenge_still_rejects_chronos_kwarg():
    # Phase 15 must not add a Chronos parameter to Challenge judgment (G2).
    with pytest.raises(TypeError):
        judge_challenge({}, {"a": 1}, ["w1", "w2", "w3"], chronos=10 ** 12)
