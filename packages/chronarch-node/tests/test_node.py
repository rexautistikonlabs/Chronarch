"""Phase 3 node tests: the eight RPC verbs, leader election, and gossip
integrity. A red test here that traces to the frozen kernel is the license
the task grants to touch admission/Council; so far none does — the node only
routes through the kernel.
"""
import pytest

from chronarch_node import Node, NodeError, slot_leader, verify_leader
from chronarch_node.leader import plot_challenge_proof


@pytest.fixture()
def node():
    return Node("solo", 100)


# --------------------------------------------------------------- RPC verbs --

def test_init_reports_boot(node):
    r = node.rpc("init", {})
    assert r["boot_ok"] and r["identity"] == "solo"
    assert len(r["ring0_hash"]) == 64


def test_seal_and_verify(node):
    r = node.rpc("seal", {"ring_type": "experience", "body": {"note": "hi"}})
    assert r["height"] == 1
    v = node.rpc("verify", {})
    assert v["chain_ok"] and v["headers_ok"] and v["height"] == 1


def test_seal_rejects_non_sealable_ring_type(node):
    for banned in ("proposal", "ballot", "scar", "genesis", "challenge", "council"):
        with pytest.raises(NodeError):
            node.rpc("seal", {"ring_type": banned, "body": {}})


def test_seal_rejects_admin_key_body(node):
    from chronarch_spec import SchemaError
    with pytest.raises(SchemaError):
        node.rpc("seal", {"ring_type": "experience", "body": {"admin_key": "0" * 64}})
    with pytest.raises(SchemaError):
        node.rpc("seal", {"ring_type": "experience",
                          "body": {"deep": {"helm_override": True}}})


def test_pin_verifies(node):
    r = node.rpc("pin", {"object": {"k": "v"}})
    assert r["verified"] and r["pinset_size"] >= 5


def test_challenge_passes_and_is_consensus_grade(node):
    r = node.rpc("challenge", {"witnesses": ["a", "b", "c"]})
    assert r["passed"] and r["consensus_grade"]
    # A single attestor is not consensus grade (K11).
    solo = node.rpc("challenge", {"witnesses": ["only-me"], "slot": 2})
    assert solo["passed"] and not solo["consensus_grade"]


def test_health_publishes_full_vector(node):
    v = node.rpc("health", {"slot": 32})
    assert v["epoch"] == 1 and len(v["components"]) == 9


def test_submit_tx_rejects_override_and_scars(node):
    r = node.rpc("submit_tx", {"tx": {"tx_type": "helm_override", "sender": "x"}})
    assert not r["accepted"] and r["scar_hash"]


def test_unknown_rpc_method(node):
    with pytest.raises(NodeError):
        node.rpc("evacuate_treasury", {})


# ---------------------------------------------------------- leader election --

def test_leader_is_deterministic():
    space = {"a": 10, "b": 10, "c": 10}
    assert slot_leader(5, space) == slot_leader(5, space)
    assert verify_leader(5, slot_leader(5, space), space)


def test_leader_is_space_weighted():
    space = {"small": 1, "big": 200}
    wins = {"small": 0, "big": 0}
    for slot in range(300):
        wins[slot_leader(slot, space)] += 1
    # Space-proportional: the 200x node wins the overwhelming majority.
    assert wins["big"] > wins["small"] * 50


def test_leader_none_when_no_eligible():
    assert slot_leader(1, {"a": 10}, eligible=set()) is None
    assert slot_leader(1, {}, None) is None


def test_plot_proof_is_recomputable():
    assert plot_challenge_proof(3, "a", 10) == plot_challenge_proof(3, "a", 10)
    assert plot_challenge_proof(3, "a", 10) != plot_challenge_proof(3, "b", 10)


def test_prestress_gates_eligibility():
    # An unbonded node is not eligible to lead (bond floor, ARCHITECTURE §5).
    node = Node("lonely", 100, space_table={"lonely": 100})
    assert node.eligible_leaders(1) == set()  # no bond -> demoted out of the draw


# --------------------------------------------------------- gossip integrity --

def test_forged_gossip_ring_is_rejected(node):
    # A ring claiming a hash its body does not produce is a detected forgery.
    forged = {"kind": "ring", "ring_type": "economic",
              "body": {"event": "slot", "tampered": True},
              "author": "attacker", "slot": 1, "witnesses": [],
              "height": node.ledger.height + 1, "ring_hash": "f" * 64}
    with pytest.raises(NodeError, match="hash mismatch"):
        node.on_gossip("attacker", forged)


def test_out_of_order_ring_ignored(node):
    before = node.ledger.height
    node.on_gossip("x", {"kind": "ring", "ring_type": "economic", "body": {},
                         "author": "x", "slot": 9, "witnesses": [],
                         "height": before + 5, "ring_hash": "a" * 64})
    assert node.ledger.height == before  # gap -> not applied, no crash


def test_header_claiming_wrong_leader_rejected():
    node = Node("node-0", 100, space_table={"node-0": 100, "node-1": 100})
    # Forge a header for a slot, claiming a leader who did not win.
    slot = 1
    real = slot_leader(slot, node.space_table, {"node-0", "node-1"})
    liar = "node-1" if real == "node-0" else "node-0"
    header = node.build_header(slot, liar)
    with pytest.raises(NodeError, match="wrong leader"):
        node._apply_header({"kind": "header", "header": header, "leader": liar})
