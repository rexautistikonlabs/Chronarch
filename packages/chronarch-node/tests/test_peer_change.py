"""Phase 19 tests: a peer-set change is a Proposal ring plus a slashing-backed
vote — never an admin key, never an AI self-enact.

A PeerChange rides in a Council Proposal's `changes` (as an M6 membership
change). It updates home/peers.json only after the Council APPROVES it (turnout
+ weight + seats) and the activation height is reached. Without a passing
ballot, peers.json is byte-for-byte unchanged. Chronarch may draft one but
cannot activate it.
"""
import json
import os

import pytest

from chronarch_core import Timechain
from chronarch_hearth import HearthState
from chronarch_council import CouncilState
from chronarch_node import (
    Node,
    NodeHome,
    PeersError,
    net_run,
    peer_change_proposal,
    ratify_peer_change,
    space_table_from_peers,
    verify_peer_change,
)
from chronarch_node.leader import slot_leader
from chronarch_spec import build_kernel, build_ring0
from chronarch_spec.constants import MIN_COUNCIL_BOND_CHRONONS

LOCK = 2 * MIN_COUNCIL_BOND_CHRONONS


def _homes(tmp_path, n=2):
    return [str(tmp_path / f"home-{i}") for i in range(n)]


def _council():
    chain = Timechain(build_ring0(build_kernel()))
    hearth = HearthState()
    council = CouncilState(hearth)
    for i in range(5):
        steward = f"stew-{i}"
        hearth.lock(steward, LOCK, slot=0)
        council.register_seat(f"seat-{i}", steward, pinset_size=8, last_challenge_pass_slot=0)
    return council, chain, hearth


def _run_ballot(council, chain, proposal, vote="yes"):
    council.submit_proposal(proposal, chain=chain, slot=1)
    council.attach_reports(proposal["proposal_id"], transmission_report_hash="11" * 32,
                           gym_report_hash="22" * 32, chain=chain, slot=2)
    for seat, weight in council.eligible_seats(2).items():
        council.cast_ballot({"proposal_id": proposal["proposal_id"], "seat": seat,
                             "vote": vote, "bond_weight_chronons": weight, "cast_slot": 3},
                            chain=chain, slot=3)
    return council.tally(proposal["proposal_id"], chain=chain, slot=3)


# -- PeerChange schema ------------------------------------------------------
def test_peer_change_schema_is_closed_and_k18():
    verify_peer_change({"kind": "peer_add", "identity": "x", "space_units": 3})
    for bad in (
        {"kind": "peer_add", "identity": "x", "space_units": 3, "chronos": 1},  # extra key
        {"kind": "grant", "identity": "x", "space_units": 3},                    # bad kind
        {"kind": "peer_add", "identity": "", "space_units": 3},                  # empty id
        {"kind": "peer_add", "identity": "x", "space_units": 0},                 # non-positive
        {"kind": "peer_add", "identity": "x", "space_units": 1.5},               # float
        {"kind": "peer_add", "identity": "x", "space_units": True},              # bool
    ):
        with pytest.raises(PeersError):
            verify_peer_change(bad)
    with pytest.raises(Exception):  # K18 forbidden key
        verify_peer_change({"kind": "peer_add", "identity": "x", "space_units": 1,
                            "admin_key": "0" * 64})


# -- add + passing ballot updates peers.json, lottery sees new units --------
def test_peer_add_with_passing_ballot_updates_fleet(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=3)
    before = [open(os.path.join(h, "peers.json"), "rb").read() for h in homes]

    council, chain, _ = _council()
    body = {"kind": "peer_add", "identity": "net-node-2", "space_units": 3}
    proposal = peer_change_proposal("add-2", "councilor:net-node-0", body, slot=1)
    result = _run_ballot(council, chain, proposal, "yes")
    assert result["outcome"] == "approved"

    ratify_peer_change(homes, council, "add-2", at_slot=result["activation_slot"])
    fleet = space_table_from_peers(NodeHome(homes[0]).read_peers())
    assert fleet == {"net-node-0": 1, "net-node-1": 2, "net-node-2": 3}
    # both homes still hold byte-identical peers.json
    after = [open(os.path.join(h, "peers.json"), "rb").read() for h in homes]
    assert after[0] == after[1] and after[0] != before[0]

    # the lottery now weighs the new peer (the units it just ratified)
    eligible = set(fleet)
    winners = [slot_leader(s, fleet, eligible) for s in range(1, 40)]
    assert "net-node-2" in winners


def test_peer_remove_with_passing_ballot_updates_fleet(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=2)
    council, chain, _ = _council()
    body = {"kind": "peer_remove", "identity": "net-node-1", "space_units": 2}
    proposal = peer_change_proposal("rem-1", "councilor:net-node-0", body, slot=1)
    result = _run_ballot(council, chain, proposal, "yes")
    ratify_peer_change(homes, council, "rem-1", at_slot=result["activation_slot"])
    assert space_table_from_peers(NodeHome(homes[0]).read_peers()) == {"net-node-0": 1}


# -- without a ballot, peers.json is unchanged ------------------------------
def test_peer_change_without_ballot_leaves_peers_unchanged(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=2)
    before = open(os.path.join(homes[0], "peers.json"), "rb").read()

    council, chain, _ = _council()
    proposal = peer_change_proposal("no-ballot", "councilor:net-node-0",
                                    {"kind": "peer_add", "identity": "z", "space_units": 4}, slot=1)
    council.submit_proposal(proposal, chain=chain, slot=1)  # submitted, never tallied
    with pytest.raises(PeersError) as exc:
        ratify_peer_change(homes, council, "no-ballot", at_slot=999)
    assert "PEERS_MISMATCH" in str(exc.value)
    assert open(os.path.join(homes[0], "peers.json"), "rb").read() == before


def test_rejected_ballot_leaves_peers_unchanged(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=2)
    before = open(os.path.join(homes[0], "peers.json"), "rb").read()
    council, chain, _ = _council()
    proposal = peer_change_proposal("rej", "councilor:net-node-0",
                                    {"kind": "peer_add", "identity": "z", "space_units": 4}, slot=1)
    result = _run_ballot(council, chain, proposal, "no")  # everyone votes no
    assert result["outcome"] == "rejected"
    with pytest.raises(PeersError):
        ratify_peer_change(homes, council, "rej", at_slot=result["activation_slot"])
    assert open(os.path.join(homes[0], "peers.json"), "rb").read() == before


def test_ratify_before_activation_height_is_rejected(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=2)
    before = open(os.path.join(homes[0], "peers.json"), "rb").read()
    council, chain, _ = _council()
    proposal = peer_change_proposal("early", "councilor:net-node-0",
                                    {"kind": "peer_add", "identity": "z", "space_units": 4}, slot=1)
    result = _run_ballot(council, chain, proposal, "yes")
    with pytest.raises(PeersError):
        ratify_peer_change(homes, council, "early", at_slot=result["activation_slot"] - 1)
    assert open(os.path.join(homes[0], "peers.json"), "rb").read() == before


# -- illegal ratification still slashes + I8 --------------------------------
def test_illegal_peer_change_is_invalid_and_slashes(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=2)
    before = open(os.path.join(homes[0], "peers.json"), "rb").read()
    council, chain, _ = _council()
    # an identity crafted to match an illegal pattern (G1 repeal) trips
    # check_legality during tally.
    proposal = peer_change_proposal("illegal", "councilor:net-node-0",
                                    {"kind": "peer_add", "identity": "genesis_law.G1",
                                     "space_units": 1}, slot=1)
    result = _run_ballot(council, chain, proposal, "yes")
    assert result["outcome"] == "invalid"
    assert len(council.slash_log) == 5  # every yes-voter slashed
    scars = [r for r in chain.scars() if r["body"]["interface"] == "I8"]
    assert scars and "illegal ratification" in scars[0]["body"]["cause"]
    with pytest.raises(PeersError):
        ratify_peer_change(homes, council, "illegal", at_slot=result["activation_slot"] or 999)
    assert open(os.path.join(homes[0], "peers.json"), "rb").read() == before


# -- Chronarch cannot self-enact -------------------------------------------
def test_chronarch_authored_peer_change_does_not_self_activate(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=2)
    before = open(os.path.join(homes[0], "peers.json"), "rb").read()
    council, chain, _ = _council()
    # Chronarch drafts a PeerChange (proposer="chronarch"), submits it — but
    # never gets a ballot. It stays inert.
    proposal = peer_change_proposal("chr", "chronarch",
                                    {"kind": "peer_add", "identity": "chr-peer", "space_units": 5}, slot=1)
    council.submit_proposal(proposal, chain=chain, slot=1)
    with pytest.raises(PeersError):
        ratify_peer_change(homes, council, "chr", at_slot=999)
    assert open(os.path.join(homes[0], "peers.json"), "rb").read() == before


def test_agent_has_no_peer_apply_verb():
    from chronarch_agent.tools import ALLOWED_VERBS
    assert not any("peer" in v.lower() or v in ("activate_faculty", "ratify")
                   for v in ALLOWED_VERBS)


# -- net_run guards ---------------------------------------------------------
def test_first_net_run_writes_peers(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=2)
    for home in homes:
        assert os.path.isfile(os.path.join(home, "peers.json"))


def test_extra_unknown_home_is_peers_mismatch(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=2)
    extra = str(tmp_path / "extra")  # a fresh home not in peers.json
    with pytest.raises(PeersError):
        net_run(homes + [extra], slots=2)


def test_ratify_requires_established_homes(tmp_path):
    # Ratification amends an existing fleet; it does not conjure a peers.json on
    # a home that has none (a joining node's home is initialised + synced
    # separately, out of scope here).
    homes = _homes(tmp_path)
    net_run(homes, slots=2)
    council, chain, _ = _council()
    body = {"kind": "peer_add", "identity": "net-node-2", "space_units": 3}
    proposal = peer_change_proposal("add-2", "councilor:net-node-0", body, slot=1)
    result = _run_ballot(council, chain, proposal, "yes")
    fresh = str(tmp_path / "fresh")  # no peers.json
    with pytest.raises(PeersError):
        ratify_peer_change(homes + [fresh], council, "add-2", at_slot=result["activation_slot"])


def test_net_run_still_rejects_extra_home_after_unrelated_ratify(tmp_path):
    # A ratified peer_add updates the fleet in peers.json; net_run then requires
    # a home for EVERY fleet member. Running the old 2 homes now disagrees with
    # the 3-entry peers.json → PEERS_MISMATCH (the fleet grew).
    homes = _homes(tmp_path)
    net_run(homes, slots=2)
    council, chain, _ = _council()
    body = {"kind": "peer_add", "identity": "net-node-2", "space_units": 3}
    proposal = peer_change_proposal("add-2", "councilor:net-node-0", body, slot=1)
    result = _run_ballot(council, chain, proposal, "yes")
    ratify_peer_change(homes, council, "add-2", at_slot=result["activation_slot"])
    # peers.json now has 3 entries but only 2 homes are given → mismatch
    with pytest.raises(PeersError):
        net_run(homes, slots=2)
