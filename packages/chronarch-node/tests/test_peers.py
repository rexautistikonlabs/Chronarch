"""Phase 18 tests: persist the peer/space table so a net home resumes without a
hidden conductor.

home/peers.json is the canonical fleet — every home writes identical bytes. A
bare Node(home=DIR) adopts it as its space table and can replay a net-produced
ledger with peer-led slots. A peers.json that disagrees with the home's own
identity/units, or with the planned fleet, fails closed as PEERS_MISMATCH.
"""
import json
import os

import pytest

from chronarch_node import (
    Node,
    PeersError,
    canonical_peers,
    net_run,
    net_status,
    pulse,
    verify_peers,
)
from chronarch_node.leader import slot_leader


def _homes(tmp_path, n=2):
    return [str(tmp_path / f"home-{i}") for i in range(n)]


def _peers_path(home):
    return os.path.join(home, "peers.json")


# -- peers.json is written, canonical, and identical across homes -----------
def test_net_run_writes_identical_peers_json(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=4)
    blobs = [open(_peers_path(h), "rb").read() for h in homes]
    assert blobs[0] == blobs[1]  # byte-for-byte identical fleet
    peers = json.loads(blobs[0].decode())
    assert peers == [{"identity": "net-node-0", "space_units": 1},
                     {"identity": "net-node-1", "space_units": 2}]


def test_peers_schema_is_closed_and_integer():
    verify_peers([{"identity": "b", "space_units": 2},
                  {"identity": "a", "space_units": 1}])  # unsorted input ok
    # a foreign key is rejected
    with pytest.raises(PeersError):
        verify_peers([{"identity": "a", "space_units": 1, "chronos": 5}])
    # a non-integer unit is rejected
    with pytest.raises(PeersError):
        verify_peers([{"identity": "a", "space_units": 1.5}])
    # a boolean is not an integer here
    with pytest.raises(PeersError):
        verify_peers([{"identity": "a", "space_units": True}])
    # a duplicate identity is rejected
    with pytest.raises(PeersError):
        verify_peers([{"identity": "a", "space_units": 1},
                      {"identity": "a", "space_units": 2}])


def test_verify_peers_rejects_k18_forbidden_key():
    with pytest.raises(Exception):
        verify_peers([{"identity": "a", "space_units": 1, "admin_key": "0" * 64}])


# -- a bare Node resumes a net ledger with peer-led slots -------------------
def test_bare_node_resumes_peer_led_ledger(tmp_path):
    homes = _homes(tmp_path)
    result = net_run(homes, slots=6)
    head = {h["identity"]: h["head_hash"] for h in result["homes"]}
    for home in homes:
        node = Node("ignored-identity", home=home)  # no space_table passed
        assert node.space_table == {"net-node-0": 1, "net-node-1": 2}  # adopted
        assert node.ledger.verify_full()
        assert node.ledger.head_hash == head[node.identity]


def test_resume_keeps_identical_lottery_winners_for_same_units(tmp_path):
    homes = _homes(tmp_path)
    result = net_run(homes, slots=10)
    node = Node("x", home=homes[0])  # adopts the persisted units
    eligible = set(node.space_table)  # same eligible set net_run had (all bonded)
    recomputed = [slot_leader(s, node.space_table, eligible) for s in range(1, 11)]
    assert recomputed == result["leaders"]


# -- fail closed on a tampered / disagreeing peers.json ---------------------
def test_tampered_own_units_is_peers_mismatch(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=3)
    peers = json.loads(open(_peers_path(homes[0])).read())
    for entry in peers:
        if entry["identity"] == "net-node-0":
            entry["space_units"] = 999  # tamper this home's own units
    with open(_peers_path(homes[0]), "w") as f:
        f.write(json.dumps(peers))
    with pytest.raises(PeersError) as exc:
        Node("x", home=homes[0])
    assert "PEERS_MISMATCH" in str(exc.value)


def test_missing_own_identity_is_peers_mismatch(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=3)
    # drop this home's own entry from its peers.json
    peers = [e for e in json.loads(open(_peers_path(homes[0])).read())
             if e["identity"] != "net-node-0"]
    peers.append({"identity": "net-node-0-typo", "space_units": 1})
    with open(_peers_path(homes[0]), "w") as f:
        f.write(json.dumps(peers))
    with pytest.raises(PeersError) as exc:
        Node("x", home=homes[0])
    assert "PEERS_MISMATCH" in str(exc.value)


def test_net_run_refuses_to_rewrite_disagreeing_peers(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=3)
    peers = json.loads(open(_peers_path(homes[0])).read())
    peers[0]["space_units"] = 42  # a fleet that disagrees with the plan
    with open(_peers_path(homes[0]), "w") as f:
        f.write(json.dumps(peers))
    with pytest.raises(PeersError) as exc:
        net_run(homes, slots=2)
    assert "PEERS_MISMATCH" in str(exc.value)
    # the tampered file was NOT silently overwritten
    assert json.loads(open(_peers_path(homes[0])).read())[0]["space_units"] == 42


# -- resume and status ------------------------------------------------------
def test_net_run_resumes_with_matching_peers(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=3)
    result = net_run(homes, slots=3)  # peers.json already present + matching
    assert result["converged"] is True
    assert all(h["height"] == 6 for h in result["homes"])


def test_net_status_reports_peers(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=4)
    status = net_status(homes)
    assert len(status["homes"]) == 2
    for entry in status["homes"]:
        assert entry["peer_count"] == 2
        assert entry["peers_ok"] is True
        assert entry["height"] == 4
        assert entry["identity"] in {"net-node-0", "net-node-1"}
    # both homes report the same head_hash
    assert len({e["head_hash"] for e in status["homes"]}) == 1


def test_net_status_flags_tampered_peers(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=3)
    peers = json.loads(open(_peers_path(homes[0])).read())
    for entry in peers:
        if entry["identity"] == "net-node-0":
            entry["space_units"] = 7
    with open(_peers_path(homes[0]), "w") as f:
        f.write(json.dumps(peers))
    status = net_status(homes)
    by_id = {e["identity"]: e for e in status["homes"]}
    assert by_id["net-node-0"]["peers_ok"] is False  # own units disagree


# -- a lone home without peers.json still works (pulse) ---------------------
def test_pulse_home_has_no_peers_and_single_node_table(tmp_path):
    home = str(tmp_path / "solo")
    pulse(home)
    assert not os.path.exists(_peers_path(home))
    node = Node("x", home=home)  # no peers.json → single-node table
    assert node.space_table == {node.identity: node.space_units}


def test_pulse_still_works(tmp_path):
    result = pulse(str(tmp_path / "solo"))
    assert result["won_slots"] >= 1
    assert result["credits_by_reason"]["space"] > 0


def test_canonical_peers_sorts_by_identity():
    peers = canonical_peers({"z": 3, "a": 1, "m": 2})
    assert [p["identity"] for p in peers] == ["a", "m", "z"]
    assert all(isinstance(p["space_units"], int) for p in peers)
