"""Phase 8 tests: test-group Wesolowski VDF, CHIP-48-shaped fields, the VDF
time chain, and the optional Wesolowski SlotHeader field. Research-grade,
not production crypto; the VDF still does not vote.
"""
import pytest

from chronarch_farm import make_plot_commitment, timechain_vdf_input, wesolowski
from chronarch_node import Cluster, Node, build_slot_header, verify_slot_header
from chronarch_node.leader import slot_leader


# ------------------------------------------------ Wesolowski prove/verify ----

def test_wesolowski_honest_proof_accepted():
    proof = wesolowski.prove("input-xyz", 64)
    assert set(proof) == {"y", "pi", "iterations", "group_id"}
    assert proof["group_id"] == wesolowski.GROUP_ID
    assert wesolowski.verify("input-xyz", proof)


def test_wesolowski_rejects_tampered_y_and_pi():
    proof = wesolowski.prove("input-xyz", 64)
    assert not wesolowski.verify("input-xyz", dict(proof, y=(proof["y"] + 1) % wesolowski.TEST_MODULUS))
    assert not wesolowski.verify("input-xyz", dict(proof, pi=(proof["pi"] + 1) % wesolowski.TEST_MODULUS))
    assert not wesolowski.verify("input-xyz", dict(proof, iterations=proof["iterations"] + 1))


def test_wesolowski_rejects_wrong_input_and_bad_structure():
    proof = wesolowski.prove("input-xyz", 64)
    assert not wesolowski.verify("different-input", proof)
    assert not wesolowski.verify("input-xyz", {"y": 1, "pi": 1})  # missing fields
    assert not wesolowski.verify("input-xyz", dict(proof, group_id="mainnet"))


def test_wesolowski_is_deterministic():
    assert wesolowski.prove("seed", 32) == wesolowski.prove("seed", 32)


def test_wesolowski_uses_a_tiny_documented_prime():
    # A toy modulus, explicitly NOT 2048-bit RSA / class group.
    assert wesolowski.TEST_MODULUS == (1 << 127) - 1
    assert wesolowski.TEST_MODULUS.bit_length() == 127


# ---------------------------------------------- optional header proof --------

def _header(slot, commitment, units, prev=None, **kw):
    return build_slot_header(slot=slot, leader="n", commitment=commitment,
                             space_units=units, prev_slot_header=prev, **kw)


def test_header_valid_without_time_proof():
    c = make_plot_commitment("n", "test")
    sh = _header(1, c, 100)
    assert sh["time_proof"] is None
    assert verify_slot_header(sh, space_units=100, prev_slot_header=None)["ok"]


def test_header_with_valid_optional_proof_accepted():
    c = make_plot_commitment("n", "test")
    sh = _header(1, c, 100, with_wesolowski=True)
    assert sh["time_proof"] is not None
    assert verify_slot_header(sh, space_units=100, prev_slot_header=None)["ok"]


def test_header_with_garbled_optional_proof_rejected():
    c = make_plot_commitment("n", "test")
    sh = _header(1, c, 100, with_wesolowski=True)
    garbled = dict(sh, time_proof=dict(sh["time_proof"], y=0))
    assert verify_slot_header(garbled, space_units=100,
                              prev_slot_header=None)["error_code"] == "SLOT_HEADER_TIME_PROOF_INVALID"


# --------------------------------------------- CHIP-48-shaped fields ---------

def test_chip48_shaped_fields_present():
    c = make_plot_commitment("n", "test")
    sh = _header(1, c, 100)
    for field in ("filter_bits", "quality_string", "infused_challenge", "extra_weight"):
        assert field in sh
    assert sh["quality_string"] == sh["pospace"]["quality_string"]
    from chronarch_farm import FILTER_PREFIX_BITS
    assert sh["filter_bits"] == FILTER_PREFIX_BITS


def test_extra_delta_does_not_change_lottery_winners():
    fleet = {"a": 100, "b": 300, "c": 1014}
    for slot in range(300):
        winner = slot_leader(slot, fleet)
        c = make_plot_commitment(winner, "test")
        d0 = build_slot_header(slot=slot, leader=winner, commitment=c,
                               space_units=fleet[winner], prev_slot_header=None, extra_delta=0)
        d9 = build_slot_header(slot=slot, leader=winner, commitment=c,
                               space_units=fleet[winner], prev_slot_header=None, extra_delta=999999)
        assert d0["leader"] == d9["leader"] == winner
        # Both verify; the delta is inert.
        assert verify_slot_header(d0, space_units=fleet[winner], prev_slot_header=None)["ok"]
        assert verify_slot_header(d9, space_units=fleet[winner], prev_slot_header=None)["ok"]


def test_negative_extra_weight_rejected():
    c = make_plot_commitment("n", "test")
    sh = _header(1, c, 100)
    bad = dict(sh, extra_weight=-1)
    assert verify_slot_header(bad, space_units=100,
                              prev_slot_header=None)["error_code"] == "SLOT_HEADER_BAD_EXTRA_WEIGHT"


def test_extra_delta_kwarg_alias_still_works():
    # The deprecated extra_delta= kwarg maps onto the canonical extra_weight.
    c = make_plot_commitment("n", "test")
    sh = build_slot_header(slot=1, leader="n", commitment=c, space_units=100,
                           prev_slot_header=None, extra_delta=7)
    assert sh["extra_weight"] == 7
    assert "extra_delta" not in sh  # canonical field only
    assert verify_slot_header(sh, space_units=100, prev_slot_header=None)["ok"]


# ------------------------------------------------------ VDF time chain -------

def test_time_chain_commits_prev_vdf_output():
    c = make_plot_commitment("n", "test")
    sh0 = _header(1, c, 100, prev=None)
    assert sh0["prev_vdf_output"] == ""  # genesis
    sh1 = _header(2, c, 100, prev=sh0)
    assert sh1["prev_vdf_output"] == sh0["vdf"]["output"]
    expected_input = timechain_vdf_input(sh1["infused_challenge"], sh0["vdf"]["output"])
    assert sh1["vdf"]["input"] == expected_input
    assert verify_slot_header(sh1, space_units=100, prev_slot_header=sh0)["ok"]


def test_prev_vdf_output_mismatch_rejected():
    c = make_plot_commitment("n", "test")
    sh0 = _header(1, c, 100, prev=None)
    sh1 = _header(2, c, 100, prev=sh0)
    tampered = dict(sh1, prev_vdf_output="0" * 64)
    assert verify_slot_header(tampered, space_units=100,
                              prev_slot_header=sh0)["error_code"] == "SLOT_HEADER_PREV_VDF_MISMATCH"
    # Verifying against the wrong predecessor is also caught (prev mismatch or
    # infusion mismatch — both reject).
    assert not verify_slot_header(sh1, space_units=100, prev_slot_header=None)["ok"]


def test_node_time_chains_across_slots():
    node = Node("node-0", 100, space_table={"node-0": 100, "node-1": 100})
    c = make_plot_commitment("node-1", "test")
    sh0 = build_slot_header(slot=1, leader="node-1", commitment=c, space_units=100,
                            prev_slot_header=None)
    node.on_gossip("node-1", {"kind": "slot_header", "slot_header": sh0, "leader": "node-1"})
    sh1 = build_slot_header(slot=2, leader="node-1", commitment=c, space_units=100,
                            prev_slot_header=sh0)
    node.on_gossip("node-1", {"kind": "slot_header", "slot_header": sh1, "leader": "node-1"})
    assert node.last_slot_header["prev_vdf_output"] == sh0["vdf"]["output"]
    # A slot whose prev_vdf_output does not match the node's chain is rejected.
    forged = dict(build_slot_header(slot=3, leader="node-1", commitment=c,
                                    space_units=100, prev_slot_header=sh1),
                  prev_vdf_output="0" * 64)
    with pytest.raises(Exception):
        node.on_gossip("node-1", {"kind": "slot_header", "slot_header": forged, "leader": "node-1"})


# ------------------------------------------------------------- cluster -------

def test_cluster_still_converges_with_phase8_fields():
    cluster = Cluster(n_nodes=4)
    cluster.run_slots(6)
    assert cluster.converged() and cluster.all_verify()
    prev = None
    for sh in cluster.nodes["node-0"].slot_headers:
        assert verify_slot_header(sh, space_units=cluster.space_table[sh["leader"]],
                                  prev_slot_header=prev)["ok"]
        prev = sh


def test_equal_units_still_elect_identical_leaders():
    from chronarch_farm import space_table_from_commitments
    from chronarch_farm.adapter import commitments_from_abstract
    fleet = {"a": 100, "b": 1014, "c": 7}
    commitments = []
    for f, u in fleet.items():
        commitments.extend(commitments_from_abstract(f, u))
    assert space_table_from_commitments(commitments) == fleet
    for slot in range(300):
        assert slot_leader(slot, fleet) == slot_leader(slot, space_table_from_commitments(commitments))
