"""Phase 14 CLI tests: chronarch rewards inspect --home DIR."""
import json

from chronarch_cli import main
from chronarch_node import Node
from chronarch_node.cluster import STEWARD_LOCK_CHRONONS
from chronarch_spec.constants import SPACE_SHARE_CHRONONS


def _seed(home, slots=5):
    node = Node("A", 1, home=home, space_table={"A": 1})
    node.hearth.lock("A", STEWARD_LOCK_CHRONONS, slot=0)
    won = 0
    for slot in range(1, slots + 1):
        if node.produce_slot(slot):
            won += 1
    return node, won


def test_rewards_inspect_reports_totals(tmp_path, capsys):
    home = str(tmp_path / "h")
    node, won = _seed(home)
    rc = main(["rewards", "inspect", "--home", home])
    out = json.loads(capsys.readouterr().out)
    assert rc == 0 and out["ok"]
    assert out["result"]["totals"]["space"] == won * SPACE_SHARE_CHRONONS
    assert out["result"]["last_slot"] == won
    assert out["result"]["credits"] == len(node.reward_credits)


def test_rewards_inspect_uninitialized_home_is_bad_home(tmp_path, capsys):
    rc = main(["rewards", "inspect", "--home", str(tmp_path / "nope")])
    out = json.loads(capsys.readouterr().out)
    assert rc == 1 and out["error_code"] == "BAD_HOME"


def test_rewards_inspect_home_without_wins_is_empty(tmp_path, capsys):
    # A home that booted but never won a slot has no rewards.jsonl yet.
    home = str(tmp_path / "h")
    Node("A", 1, home=home, space_table={"A": 1})  # boot, never produce
    rc = main(["rewards", "inspect", "--home", home])
    out = json.loads(capsys.readouterr().out)
    assert rc == 0 and out["ok"]
    assert out["result"]["totals"] == {}
    assert out["result"]["last_slot"] is None
    assert out["result"]["credits"] == 0
