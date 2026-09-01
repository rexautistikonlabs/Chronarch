"""Phase 15 CLI tests: chronarch compute submit --home DIR ..."""
import json

from chronarch_cli import main
from chronarch_node import Node


def _home(tmp_path):
    home = str(tmp_path / "h")
    Node("A", 1, home=home, space_table={"A": 1})  # initialize the home
    return home


def test_compute_submit_dummymind_ok(tmp_path, capsys):
    home = _home(tmp_path)
    rc = main(["compute", "submit", "--home", home, "--job-kind", "dummymind",
               "--job-id", "injection_screen_sense", "--input", "deadbeef",
               "--worker", "gpu-1"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 0 and out["ok"]
    assert out["result"]["code"] == "COMPUTE_OK"
    assert out["result"]["worker"] == "gpu-1"


def test_compute_submit_gym_ok(tmp_path, capsys):
    home = _home(tmp_path)
    rc = main(["compute", "submit", "--home", home, "--job-kind", "gym",
               "--job-id", "fake_admin_key_tx"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 0 and out["ok"] and out["result"]["code"] == "COMPUTE_OK"


def test_compute_submit_unknown_faculty_is_unattested(tmp_path, capsys):
    home = _home(tmp_path)
    rc = main(["compute", "submit", "--home", home, "--job-kind", "dummymind",
               "--job-id", "not_a_faculty", "--input", "ab"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 1 and out["error_code"] == "COMPUTE_UNATTESTED"


def test_compute_submit_gym_foreign_target(tmp_path, capsys, monkeypatch):
    # The CLI defaults to a Chronarch fixture, so exercise the foreign path via
    # the library the CLI calls.
    from chronarch_core import ForeignGymTargetError, make_compute_receipt
    import pytest
    with pytest.raises(ForeignGymTargetError):
        make_compute_receipt("w", "gym", "forged_ring", target_class="external")


def test_compute_submit_uninitialized_home_is_bad_home(tmp_path, capsys):
    rc = main(["compute", "submit", "--home", str(tmp_path / "nope"),
               "--job-kind", "gym", "--job-id", "forged_ring"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 1 and out["error_code"] == "BAD_HOME"
