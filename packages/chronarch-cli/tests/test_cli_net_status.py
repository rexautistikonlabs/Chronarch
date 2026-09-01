"""Phase 18 CLI tests: chronarch net status --homes DIR1,DIR2, and net peers."""
import json
import os

from chronarch_cli import main


def test_net_status_reports_homes(tmp_path, capsys):
    a, b = str(tmp_path / "a"), str(tmp_path / "b")
    main(["net", "--homes", f"{a},{b}", "--slots", "3"])
    capsys.readouterr()
    rc = main(["net", "status", "--homes", f"{a},{b}"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 0 and out["ok"]
    homes = out["result"]["homes"]
    assert len(homes) == 2
    for entry in homes:
        assert entry["peer_count"] == 2
        assert entry["peers_ok"] is True
        assert entry["height"] == 3
        assert isinstance(entry["head_hash"], str)


def test_net_run_still_works_without_subcommand(tmp_path, capsys):
    a, b = str(tmp_path / "a"), str(tmp_path / "b")
    rc = main(["net", "--homes", f"{a},{b}", "--slots", "2"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 0 and out["result"]["converged"] is True


def test_net_status_flags_tampered_peers(tmp_path, capsys):
    a, b = str(tmp_path / "a"), str(tmp_path / "b")
    main(["net", "--homes", f"{a},{b}", "--slots", "2"])
    capsys.readouterr()
    peers_path = os.path.join(a, "peers.json")
    peers = json.loads(open(peers_path).read())
    for entry in peers:
        if entry["identity"] == "net-node-0":
            entry["space_units"] = 99
    with open(peers_path, "w") as f:
        f.write(json.dumps(peers))
    rc = main(["net", "status", "--homes", f"{a},{b}"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 1  # not all peers_ok
    by_id = {e["identity"]: e for e in out["result"]["homes"]}
    assert by_id["net-node-0"]["peers_ok"] is False


def test_net_run_peers_mismatch_error_code(tmp_path, capsys):
    a, b = str(tmp_path / "a"), str(tmp_path / "b")
    main(["net", "--homes", f"{a},{b}", "--slots", "2"])
    capsys.readouterr()
    peers_path = os.path.join(a, "peers.json")
    peers = json.loads(open(peers_path).read())
    peers[0]["space_units"] = 77
    with open(peers_path, "w") as f:
        f.write(json.dumps(peers))
    rc = main(["net", "--homes", f"{a},{b}", "--slots", "2"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 1 and out["error_code"] == "PEERS_MISMATCH"
