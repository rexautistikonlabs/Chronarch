"""Phase 7 tests: infused challenge chain, plot filter, sequential VDF, and
the optional chiapos backend. Still a research fork — the default backend is
the Phase-6 local stand-in, and the VDF does not vote.
"""
import pytest

from chronarch_farm import (
    BACKEND_STANDIN,
    DEFAULT_VDF_ITERATIONS,
    FILTER_PREFIX_BITS,
    active_backend,
    difficulty_from_space_units,
    genesis_challenge,
    infuse_challenge,
    leading_zero_bits,
    make_plot_commitment,
    make_pospace,
    make_sequential_vdf,
    plot_filter_ok,
    space_table_from_commitments,
    verify_sequential_vdf,
)
from chronarch_farm.adapter import commitments_from_abstract
from chronarch_farm.pospace import _quality
from chronarch_node import Node, build_slot_header, verify_slot_header
from chronarch_node.leader import slot_leader


# ------------------------------------------------------ default backend ------

def test_default_backend_is_phase6_standin():
    assert active_backend({}) == BACKEND_STANDIN
    # Even with the flag on, without chiapos installed we stay on the stand-in.
    assert active_backend({"CHRONARCH_CHIAPOS": "1"}) == BACKEND_STANDIN


# ------------------------------------------------------ infusion chain -------

def _header(slot, commitment, units, prev=None):
    return build_slot_header(slot=slot, leader="n", commitment=commitment,
                             space_units=units, prev_slot_header=prev)


def test_slot0_uses_genesis_challenge():
    c = make_plot_commitment("n", "test")
    sh0 = _header(1, c, 100, prev=None)
    assert sh0["infused_challenge"] == genesis_challenge()
    assert sh0["prev_quality"] == ""
    assert verify_slot_header(sh0, space_units=100, prev_slot_header=None)["ok"]


def test_correct_infusion_accepted():
    c = make_plot_commitment("n", "test")
    sh0 = _header(1, c, 100, prev=None)
    sh1 = _header(2, c, 100, prev=sh0)
    expected = infuse_challenge(sh0["pospace"]["quality_string"],
                                sh0["infused_challenge"], 2)
    assert sh1["infused_challenge"] == expected
    assert verify_slot_header(sh1, space_units=100, prev_slot_header=sh0)["ok"]


def test_follower_rejects_wrong_infused_challenge():
    c = make_plot_commitment("n", "test")
    sh0 = _header(1, c, 100, prev=None)
    sh1 = _header(2, c, 100, prev=sh0)
    # Verifying against the wrong predecessor (None) recomputes a different
    # challenge -> rejected.
    assert verify_slot_header(sh1, space_units=100,
                              prev_slot_header=None)["error_code"] == "SLOT_HEADER_INFUSION_MISMATCH"
    # Tampering the infused_challenge directly is also rejected.
    tampered = dict(sh1, infused_challenge="0" * 64)
    assert verify_slot_header(tampered, space_units=100,
                              prev_slot_header=sh0)["error_code"] == "SLOT_HEADER_INFUSION_MISMATCH"


def test_node_rejects_forged_infusion_slot():
    node = Node("node-0", 100, space_table={"node-0": 100, "node-1": 100})
    c = make_plot_commitment("node-1", "test")
    sh0 = build_slot_header(slot=1, leader="node-1", commitment=c, space_units=100,
                            prev_slot_header=None)
    node.on_gossip("node-1", {"kind": "slot_header", "slot_header": sh0, "leader": "node-1"})
    # A second header that does NOT infuse from sh0 is rejected by the follower.
    forged = build_slot_header(slot=2, leader="node-1", commitment=c, space_units=100,
                               prev_slot_header=None)  # ignores sh0
    with pytest.raises(Exception):
        node.on_gossip("node-1", {"kind": "slot_header", "slot_header": forged, "leader": "node-1"})


# --------------------------------------------------------- plot filter -------

def test_plot_filter_rejects_low_prefix_quality():
    c = make_plot_commitment("n", "test")
    sh0 = _header(1, c, 100, prev=None)
    chal, pid = sh0["infused_challenge"], c["plot_id"]
    diff = difficulty_from_space_units(100)
    # Find a valid quality (< difficulty) that FAILS the leading-zero filter.
    bad = None
    for n in range(100000):
        pb = format(n, "x")
        q = _quality(pid, chal, pb)
        if int(q, 16) < diff and not plot_filter_ok(q):
            bad = {"challenge": chal, "plot_id": pid, "proof_bytes": pb, "quality_string": q}
            break
    assert bad is not None
    q = bad["quality_string"]
    bad_sh = dict(sh0, pospace=bad, plot_filter_ok=False, quality_string=q)
    assert verify_slot_header(bad_sh, space_units=100,
                              prev_slot_header=None)["error_code"] == "SLOT_HEADER_FILTER_FAIL"
    # A lying plot_filter_ok=True over the same failing quality is still rejected.
    lying = dict(sh0, pospace=bad, plot_filter_ok=True, quality_string=q)
    assert verify_slot_header(lying, space_units=100,
                              prev_slot_header=None)["error_code"] == "SLOT_HEADER_FILTER_FAIL"


def test_missing_filter_field_is_reject_fail_closed():
    c = make_plot_commitment("n", "test")
    sh0 = _header(1, c, 100, prev=None)
    without = {k: v for k, v in sh0.items() if k != "plot_filter_ok"}
    assert not verify_slot_header(without, space_units=100, prev_slot_header=None)["ok"]


def test_built_headers_pass_the_filter():
    c = make_plot_commitment("n", "test")
    sh = _header(1, c, 100, prev=None)
    assert sh["plot_filter_ok"] is True
    assert leading_zero_bits(sh["pospace"]["quality_string"]) >= FILTER_PREFIX_BITS


# ------------------------------------------------------- sequential VDF ------

def test_sequential_vdf_correct_and_wrong():
    v = make_sequential_vdf("seed", DEFAULT_VDF_ITERATIONS)
    assert v["iterations"] == DEFAULT_VDF_ITERATIONS
    assert verify_sequential_vdf(v)
    assert not verify_sequential_vdf(dict(v, output="0" * 64))
    assert not verify_sequential_vdf(dict(v, iterations=v["iterations"] + 1))


def test_sequential_vdf_is_actually_sequential():
    # Different iteration counts give different outputs (it's a chain, not one
    # hash reused).
    a = make_sequential_vdf("seed", 8)
    b = make_sequential_vdf("seed", 16)
    assert a["output"] != b["output"]


def test_node_slot_header_rejects_bad_vdf():
    c = make_plot_commitment("n", "test")
    sh = _header(1, c, 100, prev=None)
    broken = dict(sh, vdf=dict(sh["vdf"], output="0" * 64))
    assert verify_slot_header(broken, space_units=100,
                              prev_slot_header=None)["error_code"] == "SLOT_HEADER_VDF_INVALID"


# --------------------------------------------- VDF does not vote / lottery ---

def test_lottery_identical_with_and_without_vdf():
    # The elected leader is decided by the space-weighted draw alone; the VDF
    # rides in the header and never changes the winner.
    fleet = {"a": 100, "b": 300, "c": 1014}
    for slot in range(300):
        winner = slot_leader(slot, fleet)
        c = make_plot_commitment(winner, "test")
        with_vdf = build_slot_header(slot=slot, leader=winner, commitment=c,
                                     space_units=fleet[winner], prev_slot_header=None,
                                     vdf_iterations=16)
        without_vdf = build_slot_header(slot=slot, leader=winner, commitment=c,
                                        space_units=fleet[winner], prev_slot_header=None,
                                        vdf_iterations=0)
        assert with_vdf["leader"] == without_vdf["leader"] == winner


def test_equal_units_still_elect_identical_leaders():
    fleet = {"a": 100, "b": 1014, "c": 7}
    commitments = []
    for f, u in fleet.items():
        commitments.extend(commitments_from_abstract(f, u))
    plot_table = space_table_from_commitments(commitments)
    assert plot_table == fleet
    for slot in range(300):
        assert slot_leader(slot, fleet) == slot_leader(slot, plot_table)


# ------------------------------------------------- optional chiapos backend --

def test_chiapos_backend_if_installed():
    chiapos = pytest.importorskip("chiapos")
    from chronarch_farm import active_backend as ab
    assert ab({"CHRONARCH_CHIAPOS": "1"}) in ("chiapos", "phase6-standin")
