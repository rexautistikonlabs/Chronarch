"""Phase 20 CLI tests: chronarch council status/ballot/tally."""
import json
import os

from chronarch_cli import main
from chronarch_node import net_run, space_table_from_peers, NodeHome


def _run(capsys, *argv):
    rc = main(list(argv))
    return rc, json.loads(capsys.readouterr().out)


def _net(tmp_path):
    homes = [str(tmp_path / "a"), str(tmp_path / "b")]
    net_run(homes, slots=2)
    return homes


def _propose(capsys, home, identity="net-node-2", units=3):
    return _run(capsys, "peers", "propose", "--home", home, "--kind", "peer_add",
                "--identity", identity, "--units", str(units))


def test_propose_ballot_tally_ratify(tmp_path, capsys):
    a, b = _net(tmp_path)
    rc, out = _propose(capsys, a)
    assert rc == 0 and out["result"]["status"] == "MAJOR_NEEDS_COUNCIL"
    pid = out["result"]["proposal_id"]

    # restart: status still sees the proposal
    rc, out = _run(capsys, "council", "status", "--home", a)
    assert rc == 0 and out["result"]["proposals"][0]["proposal_id"] == pid
    assert out["result"]["proposals"][0]["status"] == "voting"

    # both stewards vote yes
    rc, _ = _run(capsys, "council", "ballot", "--home", a, "--proposal-id", pid, "--vote", "yes")
    assert rc == 0
    rc, _ = _run(capsys, "council", "ballot", "--home", a, "--proposal-id", pid,
                 "--vote", "yes", "--identity", "net-node-1")
    assert rc == 0

    # tally with ratify onto both homes
    rc, out = _run(capsys, "council", "tally", "--home", a, "--proposal-id", pid,
                   "--homes", f"{a},{b}")
    assert rc == 0 and out["result"]["outcome"] == "approved"
    assert out["result"]["ratified"] is True
    assert space_table_from_peers(NodeHome(a).read_peers()) == {
        "net-node-0": 1, "net-node-1": 2, "net-node-2": 3}


def test_tally_without_homes_shows_needs_ratify(tmp_path, capsys):
    a, b = _net(tmp_path)
    rc, out = _propose(capsys, a)
    pid = out["result"]["proposal_id"]
    _run(capsys, "council", "ballot", "--home", a, "--proposal-id", pid, "--vote", "yes")
    _run(capsys, "council", "ballot", "--home", a, "--proposal-id", pid, "--vote", "yes",
         "--identity", "net-node-1")
    rc, out = _run(capsys, "council", "tally", "--home", a, "--proposal-id", pid)
    assert rc == 0 and out["result"]["outcome"] == "approved"
    assert out["result"]["needs_ratify"] is True
    # status reflects the pending ratification
    rc, out = _run(capsys, "council", "status", "--home", a)
    assert out["result"]["proposals"][0]["needs_ratify"] is True


def test_illegal_tally_slashes_and_does_not_ratify(tmp_path, capsys):
    a, b = _net(tmp_path)
    before = open(os.path.join(a, "peers.json"), "rb").read()
    rc, out = _propose(capsys, a, identity="genesis_law.G1", units=1)
    pid = out["result"]["proposal_id"]
    _run(capsys, "council", "ballot", "--home", a, "--proposal-id", pid, "--vote", "yes")
    _run(capsys, "council", "ballot", "--home", a, "--proposal-id", pid, "--vote", "yes",
         "--identity", "net-node-1")
    rc, out = _run(capsys, "council", "tally", "--home", a, "--proposal-id", pid,
                   "--homes", f"{a},{b}")
    assert out["result"]["outcome"] == "invalid"
    assert out["result"]["slashes"] == 2
    assert "ratified" not in out["result"]
    assert open(os.path.join(a, "peers.json"), "rb").read() == before


def test_council_status_needs_a_fleet(tmp_path, capsys):
    from chronarch_node import pulse
    home = str(tmp_path / "solo")
    pulse(home)
    rc, out = _run(capsys, "council", "status", "--home", home)
    assert rc == 1 and out["error_code"] == "COUNCIL_UNAVAILABLE"


def test_council_status_bad_home(tmp_path, capsys):
    rc, out = _run(capsys, "council", "status", "--home", str(tmp_path / "nope"))
    assert rc == 1 and out["error_code"] == "BAD_HOME"
