"""Phase 21: the operator path is a test, not prose.

Drive the OPERATOR.md sequence through the real CLI (`chronarch_cli.main`) and
assert the mechanics: two homes converge, a peer-set change needs a ballot, a
passing ballot ratifies the change onto every home, and the single-home pulse
still works afterward. This is a lab net — no public network, no chiapos, no
AMM. (The illegal-ratification path is already covered in
test_council_home.py / test_peer_change.py and is not repeated here.)
"""
import io
import json
import contextlib

from chronarch_cli.main import main


def _run(*argv):
    """Invoke the CLI exactly as an operator would and parse its JSON stdout."""
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        rc = main(list(argv))
    return rc, json.loads(buf.getvalue())


def test_operator_path_end_to_end(tmp_path):
    solo = str(tmp_path / "solo")
    solo2 = str(tmp_path / "solo2")
    a = str(tmp_path / "a")
    b = str(tmp_path / "b")

    # 2. pulse one home -----------------------------------------------------
    rc, out = _run("pulse", "--home", solo)
    assert rc == 0 and out["ok"]
    pulse = out["result"]
    assert set(pulse) >= {"identity", "height", "won_slots", "credits_by_reason",
                          "pins_ok", "i3", "head_hash"}
    assert pulse["won_slots"] >= 1
    assert pulse["credits_by_reason"]["space"] > 0

    # 3. run a two-home net -> converges ------------------------------------
    rc, out = _run("net", "--homes", f"{a},{b}", "--slots", "4")
    assert rc == 0 and out["ok"]
    net = out["result"]
    assert net["converged"] is True
    assert {h["identity"] for h in net["homes"]} == {"net-node-0", "net-node-1"}
    assert sum(h["won_slots"] for h in net["homes"]) == len(net["leaders"])
    # both homes hold the same head
    assert len({h["head_hash"] for h in net["homes"]}) == 1

    # 4. propose a peer-set change -> needs a ballot, enacts nothing --------
    peers_before = open(f"{a}/peers.json", "rb").read()
    rc, out = _run("peers", "propose", "--home", a, "--kind", "peer_add",
                   "--identity", "net-node-2", "--units", "3")
    assert rc == 0 and out["ok"]
    proposal = out["result"]
    assert proposal["status"] == "MAJOR_NEEDS_COUNCIL"
    assert proposal["major_class"] == "M6"
    proposal_id = proposal["proposal_id"]
    # proposing changed nothing on disk (no self-enact)
    assert open(f"{a}/peers.json", "rb").read() == peers_before

    # 5. ballot from each steward (real path: liens, weight, eligibility) ---
    for steward in ("net-node-0", "net-node-1"):
        rc, out = _run("council", "ballot", "--home", a, "--proposal-id",
                       proposal_id, "--identity", steward, "--vote", "yes")
        assert rc == 0 and out["ok"]
        assert out["result"]["status"] == "cast"
        assert out["result"]["identity"] == steward

    # 6. tally + ratify onto every home -------------------------------------
    rc, out = _run("council", "tally", "--home", a, "--proposal-id",
                   proposal_id, "--homes", f"{a},{b}")
    assert rc == 0 and out["ok"]
    tally = out["result"]
    assert tally["outcome"] == "approved"
    assert tally["ratified"] is True
    assert tally["applied"] == {"kind": "peer_add", "identity": "net-node-2",
                                "space_units": 3}

    # 7. net status -> the ratified fleet, lottery now weighs the new unit ---
    rc, out = _run("net", "status", "--homes", f"{a},{b}")
    assert rc == 0 and out["ok"]
    for home in out["result"]["homes"]:
        assert home["peer_count"] == 3
        assert home["peers_ok"] is True

    from chronarch_node import NodeHome, space_table_from_peers
    fleet = space_table_from_peers(NodeHome(a).read_peers())
    assert fleet == {"net-node-0": 1, "net-node-1": 2, "net-node-2": 3}

    # 8. pulse still works after the net ------------------------------------
    rc, out = _run("pulse", "--home", solo2)
    assert rc == 0 and out["ok"]
    assert out["result"]["won_slots"] >= 1
    assert out["result"]["credits_by_reason"]["space"] > 0


def test_operator_proposal_needs_ballot_no_self_enact(tmp_path):
    # A proposal without a tally never changes the fleet — the vote is the only
    # path (no self-enact).
    a = str(tmp_path / "a")
    b = str(tmp_path / "b")
    _run("net", "--homes", f"{a},{b}", "--slots", "2")
    before = open(f"{a}/peers.json", "rb").read()
    rc, out = _run("peers", "propose", "--home", a, "--kind", "peer_add",
                   "--identity", "net-node-2", "--units", "3")
    assert rc == 0
    # status shows it is voting but not ratified
    rc, status = _run("council", "status", "--home", a)
    assert rc == 0
    proposal = status["result"]["proposals"][0]
    assert proposal["status"] == "voting"
    assert proposal["outcome"] is None
    # no ballots, no tally → peers.json untouched
    assert open(f"{a}/peers.json", "rb").read() == before
