"""Phase 3 cluster tests: the SimWorld-equivalent loop over real gossip.

Independent per-node ledgers converge to an identical head after each slot,
and a forged ring injected into the gossip stream is rejected fleet-wide.
"""
import pytest

from chronarch_node import Cluster


def test_cluster_converges_over_slots():
    cluster = Cluster(n_nodes=4)
    cluster.run_slots(6)
    assert cluster.converged()
    assert cluster.all_verify()
    assert cluster.head_height() == 6
    # Every node's ledger head AND header head are identical.
    heads = {n.ledger.head_hash for n in cluster.nodes.values()}
    headers = {n.last_header_hash for n in cluster.nodes.values()}
    assert len(heads) == 1 and len(headers) == 1


def test_all_nodes_share_ring0():
    cluster = Cluster(n_nodes=3)
    ring0s = {n.ledger.hash_at(0) for n in cluster.nodes.values()}
    assert len(ring0s) == 1  # identical genesis across the fleet (G11)


def test_leaders_track_space_weight():
    # node-3 holds the most space (space_per_node*4), so it should lead most.
    cluster = Cluster(n_nodes=4)
    log = cluster.run_slots(12)
    from collections import Counter
    wins = Counter(r["leader"] for r in log)
    assert wins["node-3"] >= wins["node-0"]


def test_forged_ring_in_gossip_stream_is_rejected():
    cluster = Cluster(n_nodes=3)
    cluster.run_slots(2)
    victim = cluster.nodes["node-0"]
    forged = {"kind": "ring", "ring_type": "economic",
              "body": {"event": "slot", "evil": True}, "author": "attacker",
              "slot": 99, "witnesses": [], "height": victim.ledger.height + 1,
              "ring_hash": "0" * 64}
    with pytest.raises(Exception):
        victim.on_gossip("attacker", forged)
    # The rest of the fleet is untouched and still converged.
    assert cluster.nodes["node-1"].ledger.verify_full()


def test_unbonded_cluster_has_no_leader():
    # With no bonds, no node meets the prestress floor -> no leader, no rings.
    cluster = Cluster(n_nodes=3, bond=False)
    log = cluster.run_slots(3)
    assert all(r["leader"] is None for r in log)
    assert cluster.head_height() == 0
