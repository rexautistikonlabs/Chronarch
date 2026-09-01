"""Phase 16 CLI tests: chronarch pulse --home DIR [--space ...] [--slots N]."""
import json
import os

from chronarch_cli import main
from chronarch_farm import make_space_seal, write_space_seal


def test_pulse_fresh_home(tmp_path, capsys):
    home = str(tmp_path / "h")
    rc = main(["pulse", "--home", home, "--slots", "2"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 0 and out["ok"]
    r = out["result"]
    assert r["won_slots"] >= 1
    assert r["credits_by_reason"]["space"] > 0
    assert r["credits_by_reason"]["compute"] > 0
    assert r["pins_ok"] is True


def test_pulse_bad_space_file(tmp_path, capsys):
    rc = main(["pulse", "--home", str(tmp_path / "h"), "--space", "/nope.cseal"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 1 and out["error_code"] == "BAD_SPACE"


def test_pulse_space_units_mismatch(tmp_path, capsys):
    small = str(tmp_path / "s.cseal")
    big = str(tmp_path / "b.cseal")
    write_space_seal(small, make_space_seal("F", "test"))
    write_space_seal(big, make_space_seal("F", "k25"))
    home = str(tmp_path / "h")
    main(["pulse", "--home", home, "--space", small])
    capsys.readouterr()
    rc = main(["pulse", "--home", home, "--space", big])
    out = json.loads(capsys.readouterr().out)
    assert rc == 1 and out["error_code"] == "SPACE_UNITS_MISMATCH"
