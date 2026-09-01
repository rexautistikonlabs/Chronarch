"""Phase 17 CLI tests: chronarch net --homes DIR1,DIR2 [--slots N]."""
import json


from chronarch_cli import main


def test_net_two_homes_converge(tmp_path, capsys):
    a, b = str(tmp_path / "a"), str(tmp_path / "b")
    rc = main(["net", "--homes", f"{a},{b}", "--slots", "4"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 0 and out["ok"]
    r = out["result"]
    assert r["converged"] is True
    assert {h["identity"] for h in r["homes"]} == {"net-node-0", "net-node-1"}
    assert sum(h["won_slots"] for h in r["homes"]) == len(r["leaders"])


def test_net_resumes(tmp_path, capsys):
    a, b = str(tmp_path / "a"), str(tmp_path / "b")
    main(["net", "--homes", f"{a},{b}", "--slots", "3"])
    capsys.readouterr()
    rc = main(["net", "--homes", f"{a},{b}", "--slots", "3"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 0
    assert all(h["height"] == 6 for h in out["result"]["homes"])


def test_net_needs_two_homes(tmp_path, capsys):
    rc = main(["net", "--homes", str(tmp_path / "only")])
    out = json.loads(capsys.readouterr().out)
    assert rc == 1 and out["error_code"] == "BAD_REQUEST"
