"""Phase 19 CLI tests: chronarch peers propose."""
import json

from chronarch_cli import main
from chronarch_node import net_run


def _net(tmp_path):
    homes = [str(tmp_path / "a"), str(tmp_path / "b")]
    net_run(homes, slots=2)
    return homes


def test_peers_propose_add(tmp_path, capsys):
    homes = _net(tmp_path)
    rc = main(["peers", "propose", "--home", homes[0], "--kind", "peer_add",
               "--identity", "net-node-2", "--units", "3"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 0 and out["ok"]
    r = out["result"]
    assert r["status"] == "MAJOR_NEEDS_COUNCIL"
    assert r["major_class"] == "M6"
    assert r["kind"] == "peer_add" and r["identity"] == "net-node-2"
    assert "proposal_id" in r


def test_peers_propose_add_existing_is_mismatch(tmp_path, capsys):
    homes = _net(tmp_path)
    rc = main(["peers", "propose", "--home", homes[0], "--kind", "peer_add",
               "--identity", "net-node-0", "--units", "1"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 1 and out["error_code"] == "PEERS_MISMATCH"


def test_peers_propose_remove_absent_is_mismatch(tmp_path, capsys):
    homes = _net(tmp_path)
    rc = main(["peers", "propose", "--home", homes[0], "--kind", "peer_remove",
               "--identity", "ghost", "--units", "1"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 1 and out["error_code"] == "PEERS_MISMATCH"


def test_peers_propose_uninitialized_home_is_bad_home(tmp_path, capsys):
    rc = main(["peers", "propose", "--home", str(tmp_path / "nope"), "--kind",
               "peer_add", "--identity", "x", "--units", "1"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 1 and out["error_code"] == "BAD_HOME"


def test_peers_propose_does_not_change_peers_file(tmp_path, capsys):
    import os
    homes = _net(tmp_path)
    before = open(os.path.join(homes[0], "peers.json"), "rb").read()
    main(["peers", "propose", "--home", homes[0], "--kind", "peer_add",
          "--identity", "net-node-9", "--units", "9"])
    # Proposing is not enacting: the fleet file is untouched.
    assert open(os.path.join(homes[0], "peers.json"), "rb").read() == before
