"""Phase 10 CLI tests: `chronarch farm init|inspect|prove`, JSON out."""
import json
import os

from chronarch_cli import build_parser, main


def test_farm_init_inspect_prove_roundtrip(capsys, tmp_path):
    out = str(tmp_path / "farm.cseal")
    rc = main(["farm", "init", "--farmer-id", "alice", "--units", "1", "--out", out])
    res = json.loads(capsys.readouterr().out)
    assert rc == 0 and res["ok"]
    assert os.path.exists(out)
    assert res["result"]["k_size"] == "test" and res["result"]["space_units"] == 1

    rc = main(["farm", "inspect", out])
    info = json.loads(capsys.readouterr().out)
    assert rc == 0 and info["result"]["farmer_id"] == "alice"
    assert info["result"]["body_bytes"] == 4096

    rc = main(["farm", "prove", out, "--challenge", "abc123"])
    proof = json.loads(capsys.readouterr().out)
    assert rc == 0 and proof["ok"] and proof["result"]["verify"]["ok"]


def test_farm_init_bad_units(capsys, tmp_path):
    out = str(tmp_path / "bad.cseal")
    rc = main(["farm", "init", "--farmer-id", "bob", "--units", "7", "--out", out])
    res = json.loads(capsys.readouterr().out)
    assert rc == 1 and res["error_code"] == "BAD_UNITS"
    assert not os.path.exists(out)


def test_farm_init_with_cas_root(capsys, tmp_path):
    out = str(tmp_path / "cr.cseal")
    rc = main(["farm", "init", "--farmer-id", "carol", "--units", "1",
               "--out", out, "--cas-root", "cd" * 32])
    assert rc == 0
    capsys.readouterr()
    main(["farm", "inspect", out])
    info = json.loads(capsys.readouterr().out)
    assert info["result"]["cas_root"] == "cd" * 32


def test_farm_verbs_registered():
    parser = build_parser()
    top = [a for a in parser._actions if hasattr(a, "choices") and a.choices][0]
    assert "farm" in top.choices
