"""Phase 5 CLI tests: the agent subcommands are JSON in / JSON out."""
import json

from chronarch_cli import build_parser, main


def test_agent_health_json(capsys):
    rc = main(["agent", "health", "--json", json.dumps({"slot": 32})])
    out = json.loads(capsys.readouterr().out)
    assert rc == 0 and out["ok"]
    assert out["result"]["epoch"] == 1 and len(out["result"]["components"]) == 9


def test_agent_turn_json_seals_ring(capsys):
    rc = main(["agent", "turn", "--json", json.dumps({"text": "hi from cli"})])
    out = json.loads(capsys.readouterr().out)
    assert rc == 0 and out["ok"] and out["ring_hash"]
    assert out["result"]["mind"] == "dummymind"


def test_agent_recall_missing_ref_returns_error_code(capsys):
    rc = main(["agent", "recall", "--json", json.dumps({"evidence_refs": ["0" * 64]})])
    out = json.loads(capsys.readouterr().out)
    assert rc == 1 and out["error_code"] == "EVIDENCE_MISSING"


def test_agent_verbs_registered():
    parser = build_parser()
    top = [a for a in parser._actions if hasattr(a, "choices") and a.choices][0]
    assert "agent" in top.choices
