"""Phase 3 real-transport test: the node RPC over an actual TCP socket, and
governance (propose/ballot) driven through the shared council.
"""
import pytest

from chronarch_node import Node, RpcServer, rpc_call
from chronarch_node.cluster import STEWARD_LOCK_CHRONONS
from chronarch_council import CouncilState
from chronarch_hearth import HearthState


@pytest.fixture()
def server():
    node = Node("tcp-node", 100)
    srv = RpcServer(node.rpc, host="127.0.0.1", port=0).start()
    yield srv, node
    srv.stop()


def test_rpc_round_trip_over_tcp(server):
    srv, _ = server
    init = rpc_call(srv.host, srv.port, "init", {})
    assert init["ok"] and init["result"]["boot_ok"]
    sealed = rpc_call(srv.host, srv.port, "seal",
                      {"ring_type": "experience", "body": {"note": "over-the-wire"}})
    assert sealed["ok"] and sealed["result"]["height"] == 1
    verified = rpc_call(srv.host, srv.port, "verify", {})
    assert verified["ok"] and verified["result"]["chain_ok"]


def test_rpc_errors_are_returned_not_fatal(server):
    srv, _ = server
    # A bad seal returns an error envelope; the server keeps serving.
    bad = rpc_call(srv.host, srv.port, "seal",
                   {"ring_type": "experience", "body": {"admin_key": "0" * 64}})
    assert not bad["ok"] and "error" in bad
    # Server still alive.
    assert rpc_call(srv.host, srv.port, "init", {})["ok"]


def test_override_tx_rejected_over_tcp(server):
    srv, _ = server
    reply = rpc_call(srv.host, srv.port, "submit_tx",
                     {"tx": {"tx_type": "helm_override", "sender": "x"}})
    assert reply["ok"] and not reply["result"]["accepted"]
    assert reply["result"]["scar_hash"]


def test_governance_rpc_through_shared_council():
    # A bonded, seated node can run the legal propose -> ballot flow via RPC.
    hearth = HearthState()
    council = CouncilState(hearth)
    hearth.lock("gov", STEWARD_LOCK_CHRONONS, slot=0)
    node = Node("gov", 100, hearth=hearth, council=council,
                space_table={"gov": 100})
    council.register_seat("seat-0", "gov", pinset_size=len(node.cas.pins()),
                          last_challenge_pass_slot=0)
    proposal = {"proposal_id": "p1", "proposer": "chronarch", "major_class": "M6",
                "spec_hash": "ab" * 32, "changes": {"voting_window_slots": 256},
                "deposit_chronons": 0, "submitted_slot": 0}
    assert node.rpc("propose", {"proposal": proposal, "slot": 0})["status"] == "proposed"
    council.attach_reports("p1", transmission_report_hash="11" * 32,
                           gym_report_hash="22" * 32, chain=node.ledger, slot=1)
    weight = council.eligible_seats(2)["seat-0"]
    cast = node.rpc("ballot", {"ballot": {"proposal_id": "p1", "seat": "seat-0",
                                          "vote": "yes",
                                          "bond_weight_chronons": weight,
                                          "cast_slot": 2}, "slot": 2})
    assert cast["status"] == "cast"
    result = council.tally("p1", chain=node.ledger, slot=2)
    assert result["outcome"] == "approved"


def test_propose_illegal_is_still_invalid_via_node():
    # The node is not a bypass: an illegal proposal, if ratified, is invalid
    # and slashes — exactly as the Council machine rules (G16).
    hearth = HearthState()
    council = CouncilState(hearth)
    for i in range(3):
        hearth.lock(f"n{i}", STEWARD_LOCK_CHRONONS, slot=0)
    node = Node("n0", 100, hearth=hearth, council=council,
                space_table={"n0": 100})
    for i in range(3):
        council.register_seat(f"seat-{i}", f"n{i}", pinset_size=len(node.cas.pins()),
                              last_challenge_pass_slot=0)
    proposal = {"proposal_id": "bad", "proposer": "chronarch", "major_class": "M1",
                "spec_hash": "ab" * 32,
                "changes": {"genesis_law.G1": "history mutable"},
                "deposit_chronons": 0, "submitted_slot": 0}
    node.rpc("propose", {"proposal": proposal, "slot": 0})
    council.attach_reports("bad", transmission_report_hash="11" * 32,
                           gym_report_hash="22" * 32, chain=node.ledger, slot=1)
    for seat, weight in council.eligible_seats(2).items():
        node.rpc("ballot", {"ballot": {"proposal_id": "bad", "seat": seat,
                                       "vote": "yes", "bond_weight_chronons": weight,
                                       "cast_slot": 2}, "slot": 2})
    result = council.tally("bad", chain=node.ledger, slot=2)
    assert result["outcome"] == "invalid"
