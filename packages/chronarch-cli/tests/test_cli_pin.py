"""Phase 12 CLI tests: `chronarch pin put|get|verify`, JSON out."""
import json

from chronarch_cli import main
from chronarch_farm import make_space_seal, write_space_seal


def test_pin_put_get(capsys, tmp_path):
    obj = tmp_path / "obj.json"
    obj.write_text('{"ring":"experience"}')
    pd = str(tmp_path / "pins")
    rc = main(["pins", "put", "--dir", pd, "--file", str(obj)])
    put = json.loads(capsys.readouterr().out)
    assert rc == 0 and put["ok"]
    h = put["result"]["hash"]

    rc = main(["pins", "get", "--dir", pd, "--hash", h])
    got = json.loads(capsys.readouterr().out)
    assert rc == 0 and got["result"]["found"] and got["result"]["verified"]


def test_pin_put_k18_rejected(capsys, tmp_path):
    obj = tmp_path / "bad.json"
    obj.write_text('{"admin_key":"x"}')
    rc = main(["pins", "put", "--dir", str(tmp_path / "pins"), "--file", str(obj)])
    out = json.loads(capsys.readouterr().out)
    assert rc == 1 and out["error_code"] == "PIN_REJECTED"


def test_pin_get_missing(capsys, tmp_path):
    rc = main(["pins", "get", "--dir", str(tmp_path / "pins"), "--hash", "0" * 64])
    out = json.loads(capsys.readouterr().out)
    assert rc == 1 and not out["result"]["found"]


def test_pin_verify_against_cseal(capsys, tmp_path):
    from chronarch_core import PinStore
    pd = str(tmp_path / "pins")
    store = PinStore(pd)
    store.put_object({"x": 1})
    seal = make_space_seal("f", "test", cas_root=store.cas_root())
    space = str(tmp_path / "s.cseal")
    write_space_seal(space, seal)

    rc = main(["pins", "verify", "--space", space, "--dir", pd])
    ok = json.loads(capsys.readouterr().out)
    assert rc == 0 and ok["ok"] and ok["result"]["code"] == "PINS_OK"

    # Withhold and re-verify → I3 PIN_MISSING.
    store.withhold(store.pins()[0])
    rc = main(["pins", "verify", "--space", space, "--dir", pd])
    bad = json.loads(capsys.readouterr().out)
    assert rc == 1 and bad["result"]["code"] == "PIN_MISSING"
    assert bad["result"]["i3"]["interface"] == "I3"


def test_pin_verbs_registered():
    from chronarch_cli import build_parser
    parser = build_parser()
    top = [a for a in parser._actions if hasattr(a, "choices") and a.choices][0]
    assert "pins" in top.choices
