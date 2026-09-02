"""Phase 20 tests: Council operator layer persisted on a home.

The Council's voting state lives in home/council.json so CLI ballots survive
process exit. G14 is untouched: propose → ballot (real path) → tally, with the
frozen lien/slash/tally math. An illegal proposal still slashes + I8 and does
not ratify. Chronarch cannot self-enact.
"""
import json
import os

import pytest

from chronarch_council import CouncilError
from chronarch_node import (
    CouncilHomeError,
    HomeError,
    NodeHome,
    council_cast,
    council_propose,
    council_status,
    council_tally,
    net_run,
    peer_change_proposal,
    space_table_from_peers,
)


def _net(tmp_path, n=2):
    homes = [str(tmp_path / f"h{i}") for i in range(n)]
    net_run(homes, slots=2)
    return homes


def _propose_add(home, identity="net-node-2", units=3, proposal_id="add"):
    body = {"kind": "peer_add", "identity": identity, "space_units": units}
    proposal = peer_change_proposal(proposal_id, "councilor:net-node-0", body, slot=0)
    return council_propose(home, proposal)


def _both_vote(home, proposal_id, vote="yes"):
    council_cast(home, proposal_id, "net-node-0", vote)
    council_cast(home, proposal_id, "net-node-1", vote)


# -- persistence: restart still sees the proposal ---------------------------
def test_propose_persists_council_json(tmp_path):
    homes = _net(tmp_path)
    _propose_add(homes[0])
    assert os.path.isfile(os.path.join(homes[0], "council.json"))
    # A fresh read (new "process") still sees the proposal in voting.
    status = council_status(homes[0])
    assert status["proposals"][0]["proposal_id"] == "add"
    assert status["proposals"][0]["status"] == "voting"
    assert status["fleet"] == 2


# -- propose -> ballot yes from eligible stewards -> tally approved ----------
def test_propose_ballot_tally_approved(tmp_path):
    homes = _net(tmp_path)
    _propose_add(homes[0])
    _both_vote(homes[0], "add", "yes")
    result = council_tally(homes[0], "add")
    assert result["outcome"] == "approved"
    assert result["yes_seats"] == 2
    assert result["needs_ratify"] is True  # no --homes passed


def test_tally_with_homes_ratifies_peer_change(tmp_path):
    homes = _net(tmp_path)
    _propose_add(homes[0])
    _both_vote(homes[0], "add", "yes")
    result = council_tally(homes[0], "add", homes_to_ratify=homes)
    assert result["outcome"] == "approved" and result["ratified"] is True
    fleet = space_table_from_peers(NodeHome(homes[0]).read_peers())
    assert fleet == {"net-node-0": 1, "net-node-1": 2, "net-node-2": 3}


# -- illegal proposal slashes and does not ratify ---------------------------
def test_illegal_proposal_slashes_and_does_not_ratify(tmp_path):
    homes = _net(tmp_path)
    before = open(os.path.join(homes[0], "peers.json"), "rb").read()
    _propose_add(homes[0], identity="genesis_law.G1", units=1, proposal_id="ill")
    _both_vote(homes[0], "ill", "yes")
    result = council_tally(homes[0], "ill", homes_to_ratify=homes)
    assert result["outcome"] == "invalid"
    assert result["slashes"] == 2
    assert "ratified" not in result
    assert open(os.path.join(homes[0], "peers.json"), "rb").read() == before
    # slashes are durable across a restart
    assert council_status(homes[0])["slashes"] == 2


def test_rejected_ballot_does_not_ratify(tmp_path):
    homes = _net(tmp_path)
    before = open(os.path.join(homes[0], "peers.json"), "rb").read()
    _propose_add(homes[0], proposal_id="rej")
    _both_vote(homes[0], "rej", "no")
    result = council_tally(homes[0], "rej", homes_to_ratify=homes)
    assert result["outcome"] == "rejected" and "ratified" not in result
    assert open(os.path.join(homes[0], "peers.json"), "rb").read() == before


# -- the real Ballot path: double vote slashes ------------------------------
def test_double_ballot_slashes_via_real_path(tmp_path):
    homes = _net(tmp_path)
    _propose_add(homes[0], proposal_id="dbl")
    council_cast(homes[0], "dbl", "net-node-0", "yes")
    with pytest.raises(CouncilError):
        council_cast(homes[0], "dbl", "net-node-0", "yes")  # double vote
    assert council_status(homes[0])["slashes"] == 1  # slashed, persisted


def test_ballot_from_non_steward_is_rejected(tmp_path):
    homes = _net(tmp_path)
    _propose_add(homes[0], proposal_id="p")
    with pytest.raises(CouncilError):
        council_cast(homes[0], "p", "not-in-fleet", "yes")


# -- fail closed on a corrupt council.json ----------------------------------
def test_corrupt_council_json_fails_closed(tmp_path):
    homes = _net(tmp_path)
    _propose_add(homes[0])
    with open(os.path.join(homes[0], "council.json"), "w") as f:
        f.write("{ this is not json")
    with pytest.raises((CouncilHomeError, HomeError)):
        council_status(homes[0])


def test_tampered_council_schema_fails_closed(tmp_path):
    homes = _net(tmp_path)
    _propose_add(homes[0])
    with open(os.path.join(homes[0], "council.json"), "w") as f:
        f.write(json.dumps({"version": 1, "proposals": {}, "results": {},
                            "slash_log": [], "extra": 1}))
    with pytest.raises(CouncilHomeError):
        council_status(homes[0])


# -- governance is a net concept -------------------------------------------
def test_council_requires_a_fleet(tmp_path):
    from chronarch_node import pulse
    home = str(tmp_path / "solo")
    pulse(home)  # a lone home has no peers.json fleet
    with pytest.raises(CouncilHomeError):
        council_status(home)


def test_council_is_not_in_a_cseal(tmp_path):
    homes = _net(tmp_path)
    _propose_add(homes[0])
    # council.json is JSON node state, never the CSL1 .cseal magic.
    head = open(os.path.join(homes[0], "council.json"), "rb").read(4)
    assert head != b"CSL1"
    assert not os.path.exists(os.path.join(homes[0], "space.cseal"))


def test_agent_has_no_tally_or_activate_verb():
    from chronarch_agent.tools import ALLOWED_VERBS, FORBIDDEN_VERBS
    assert "execute_upgrade" in FORBIDDEN_VERBS
    assert "execute_upgrade" not in ALLOWED_VERBS
    assert not any(v in ALLOWED_VERBS for v in ("tally", "activate_faculty", "ratify"))
