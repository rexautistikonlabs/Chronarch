"""Phase 6 tests: the local PoSpace stand-in, the SlotHeader path, and the
VDF stub. The verifier BODY is real-enough; the signatures and the lottery
math are unchanged.
"""
import inspect

import pytest

from chronarch_farm import (
    POSPACE_QUALITY_MISMATCH,
    POSPACE_ZERO_SPACE,
    SIZE_TABLE,
    difficulty_from_space_units,
    make_plot_commitment,
    make_pospace,
    make_vdf_record,
    space_table_from_commitments,
    verify_plot_commitment,
    verify_plot_proof,
    verify_pospace,
    verify_vdf_record,
)
from chronarch_farm.adapter import commitments_from_abstract
from chronarch_node import Cluster, Node, build_slot_header, verify_slot_header
from chronarch_node.leader import slot_leader


# ------------------------------------------- signature is unchanged (frozen) --

def test_verify_plot_proof_signature_unchanged():
    # The call-site contract stays (proof, commitment). Phase 6 adds NEW
    # functions; it does not re-sign the existing one.
    sig = inspect.signature(verify_plot_proof)
    assert list(sig.parameters) == ["proof", "commitment"]


def test_pospace_functions_are_additive():
    assert list(inspect.signature(verify_pospace).parameters) == ["pospace", "space_units"]


# ----------------------------------------- lottery unchanged (equal units) --

def test_equal_units_elect_identical_leaders():
    fleet = {"a": 100, "b": 1014, "c": 7}
    commitments = []
    for f, u in fleet.items():
        commitments.extend(commitments_from_abstract(f, u))
    plot_table = space_table_from_commitments(commitments)
    assert plot_table == fleet
    for slot in range(400):
        assert slot_leader(slot, fleet) == slot_leader(slot, plot_table), slot


# --------------------------------------------------- local PoSpace verifier --

def test_valid_pospace_accepted():
    commitment = make_plot_commitment("farmer", "k32")
    proof = make_pospace(commitment["plot_id"], "challenge-1", commitment["space_units"])
    assert verify_pospace(proof, commitment["space_units"])["ok"]


def test_garbage_pospace_rejected():
    commitment = make_plot_commitment("farmer", "k32")
    proof = make_pospace(commitment["plot_id"], "challenge-1", commitment["space_units"])
    tampered = dict(proof, proof_bytes="deadbeef")
    assert verify_pospace(tampered, commitment["space_units"])["error_code"] == POSPACE_QUALITY_MISMATCH
    # Wrong quality string too.
    assert not verify_pospace(dict(proof, quality_string="0" * 64), commitment["space_units"])["ok"]


def test_zero_space_never_passes():
    proof = make_pospace("plot", "chal", 100)
    assert verify_pospace(proof, 0)["error_code"] == POSPACE_ZERO_SPACE


def test_difficulty_monotone_in_space():
    # More space -> higher (easier) threshold.
    assert difficulty_from_space_units(1) < difficulty_from_space_units(1014)
    assert difficulty_from_space_units(0) == 0


def test_pospace_is_deterministic():
    a = make_pospace("plot", "chal", SIZE_TABLE["k25"])
    b = make_pospace("plot", "chal", SIZE_TABLE["k25"])
    assert a == b  # deterministic nonce walk, reproducible


# ------------------------------------------------------- SlotHeader on node --

def test_slot_header_valid_and_missing_commitment():
    commitment = make_plot_commitment("node-x", "test")
    sh = build_slot_header(slot=1, leader="node-x", commitment=commitment,
                           space_units=100, prev_header_hash="")
    assert verify_slot_header(sh, space_units=100)["ok"]
    # Missing plot_commitment_hash is rejected on the proof path.
    bad = dict(sh, plot_commitment_hash="")
    assert verify_slot_header(bad, space_units=100)["error_code"] == "SLOT_HEADER_NO_PLOT_COMMITMENT"


def test_follower_rejects_garbage_pospace_slot():
    node = Node("node-0", 100, space_table={"node-0": 100, "node-1": 100})
    commitment = make_plot_commitment("node-1", "test")
    sh = build_slot_header(slot=1, leader="node-1", commitment=commitment,
                           space_units=100, prev_header_hash="")
    # Corrupt the proof: a follower must reject the slot.
    sh["pospace"] = dict(sh["pospace"], proof_bytes="ffff")
    with pytest.raises(Exception):
        node.on_gossip("node-1", {"kind": "slot_header", "slot_header": sh, "leader": "node-1"})


def test_cluster_converges_with_pospace_attached():
    cluster = Cluster(n_nodes=4)
    cluster.run_slots(6)
    assert cluster.converged() and cluster.all_verify()
    # Every leader-produced slot carried a verifiable SlotHeader, and the
    # whole infusion chain re-verifies against its predecessors.
    for node in cluster.nodes.values():
        prev = None
        for sh in node.slot_headers:
            leader = sh["leader"]
            result = verify_slot_header(sh, space_units=cluster.space_table[leader],
                                        prev_slot_header=prev)
            assert result["ok"], result
            prev = sh
    # All nodes agree on the identical slot-header chain (converged infusion).
    chains = {tuple(sh["infused_challenge"] for sh in n.slot_headers)
              for n in cluster.nodes.values()}
    assert len(chains) == 1


# ------------------------------------------------ vdf ignored by the lottery --

def test_vdf_placeholder_ignored_by_lottery():
    # Building a slot header with a VDF placeholder vs none must not change the
    # elected leader — the lottery never consults it.
    fleet = {"a": 100, "b": 300}
    vdf = make_vdf_record("prev-output", 1000)
    for slot in range(200):
        leader_plain = slot_leader(slot, fleet)
        # The header attaches vdf or not; the winner is decided BEFORE and
        # independently of the header.
        commitment = make_plot_commitment(leader_plain, "test")
        with_vdf = build_slot_header(slot=slot, leader=leader_plain,
                                     commitment=commitment, space_units=fleet[leader_plain],
                                     prev_header_hash="", vdf_placeholder=vdf)
        without = build_slot_header(slot=slot, leader=leader_plain,
                                    commitment=commitment, space_units=fleet[leader_plain],
                                    prev_header_hash="", vdf_placeholder=None)
        # Same winner regardless; both verify.
        assert with_vdf["leader"] == without["leader"] == leader_plain
        assert verify_slot_header(with_vdf, space_units=fleet[leader_plain])["ok"]
        assert verify_slot_header(without, space_units=fleet[leader_plain])["ok"]


def test_vdf_stub_integrity():
    v = make_vdf_record("input-x", 42)
    assert verify_vdf_record(v)
    assert not verify_vdf_record(dict(v, output="0" * 64))
    assert not verify_vdf_record(dict(v, iterations=43))
