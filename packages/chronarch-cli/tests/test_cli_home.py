"""Phase 13 CLI tests: durable node home — serve --home and home inspect."""
import json

from chronarch_cli import main
from chronarch_cli.main import build_node_from_space
from chronarch_node import Node
from chronarch_node.cluster import STEWARD_LOCK_CHRONONS


def _seed_home(home, identity="A", units=1, slots=5):
    node = Node(identity, units, home=home, space_table={identity: units})
    node.hearth.lock(identity, STEWARD_LOCK_CHRONONS, slot=0)
    for slot in range(1, slots + 1):
        node.produce_slot(slot)
    return node


def test_build_node_with_fresh_home(tmp_path):
    home = str(tmp_path / "h")
    node = build_node_from_space("A", "1", 8, home=home)
    assert node.space_units == 1
    assert node._home is not None


def test_build_node_resumes_home_without_space(tmp_path):
    home = str(tmp_path / "h")
    n1 = _seed_home(home)
    height = n1.ledger.height
    # No --space on resume: the home is the source of truth.
    node = build_node_from_space("ignored", None, 8, home=home)
    assert node.identity == "A"
    assert node.ledger.height == height


def test_home_inspect_reports_state(tmp_path, capsys):
    home = str(tmp_path / "h")
    n1 = _seed_home(home)
    rc = main(["home", "inspect", "--home", home])
    out = json.loads(capsys.readouterr().out)
    assert rc == 0 and out["ok"]
    assert out["result"]["identity"] == "A"
    assert out["result"]["height"] == n1.ledger.height
    assert out["result"]["space_units"] == 1
    assert out["result"]["pins_ok"] is True


def test_home_inspect_uninitialized_is_bad_home(tmp_path, capsys):
    home = str(tmp_path / "empty")
    rc = main(["home", "inspect", "--home", home])
    out = json.loads(capsys.readouterr().out)
    assert rc == 1 and out["error_code"] == "BAD_HOME"
