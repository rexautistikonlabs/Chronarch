"""Lab journal library: off-chain by construction.

The journal module never reaches the consensus surface: an AST scan proves it
names no seal / submit_tx / propose / pin-store API and boots no Node, and its
lines are canonical (no floats) with integer time.
"""
import ast
import inspect
import time

import pytest

from chronarch_node import JOURNAL_KEYS, JournalError, journal_append, journal_list, pulse
from chronarch_node import journal as journal_module
from chronarch_spec import canonical_bytes

CONSENSUS_NAMES = {
    "seal", "seal_ring", "seal_scar", "forget_scar", "submit_tx", "_rpc_submit_tx",
    "propose", "_rpc_propose", "peer_change_proposal", "council_propose",
    "produce_slot", "PinStore", "put", "Node", "Timechain", "resume_append",
    "make_pin_offers", "append_reward", "write_head", "_home_append", "_persist_ring",
    "initialize", "write_peers", "write_council", "copy_space_seal",
}


def test_journal_source_names_no_consensus_api():
    tree = ast.parse(inspect.getsource(journal_module))
    seen = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name):
            seen.add(node.id)
        elif isinstance(node, ast.Attribute):
            seen.add(node.attr)
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            for alias in node.names:
                seen.add(alias.name.split(".")[-1])
    hits = seen & CONSENSUS_NAMES
    assert not hits, f"journal reaches the consensus surface via {sorted(hits)}"


def test_journal_keys_are_closed():
    assert JOURNAL_KEYS == ("slot_hint", "ts_unix_int", "text", "text_hash")


def test_append_and_list_roundtrip_with_explicit_ints(tmp_path):
    home = str(tmp_path / "h")
    pulse(home, slots=1)
    out = journal_append(home, "a note", slot_hint=3, ts_unix_int=1_700_000_000)
    assert out["entry"] == {"slot_hint": 3, "ts_unix_int": 1_700_000_000, "text": "a note",
                            "text_hash": out["entry"]["text_hash"]}
    assert journal_list(home) == [out["entry"]]
    # the stored line IS the canonical encoding of the entry
    with open(f"{home}/journal.jsonl", "rb") as f:
        assert f.read() == canonical_bytes(out["entry"]) + b"\n"


def test_default_time_is_integer_seconds(tmp_path):
    home = str(tmp_path / "h")
    pulse(home, slots=1)
    before = int(time.time())
    entry = journal_append(home, "now")["entry"]
    assert type(entry["ts_unix_int"]) is int
    assert before <= entry["ts_unix_int"] <= int(time.time()) + 1


def test_floats_and_bools_are_refused_as_time_or_slot(tmp_path):
    home = str(tmp_path / "h")
    pulse(home, slots=1)
    with pytest.raises(JournalError, match="JOURNAL_REJECTED"):
        journal_append(home, "x", ts_unix_int=1.5)
    with pytest.raises(JournalError, match="JOURNAL_REJECTED"):
        journal_append(home, "x", slot_hint=True)
    with pytest.raises(JournalError, match="JOURNAL_REJECTED"):
        journal_append(home, "x", slot_hint=-1)
    assert journal_list(home) == []


def test_missing_home_fails_closed(tmp_path):
    with pytest.raises(JournalError, match="BAD_HOME"):
        journal_append(str(tmp_path / "nope"), "x")
    with pytest.raises(JournalError, match="BAD_HOME"):
        journal_list(str(tmp_path / "nope"))
    assert not (tmp_path / "nope").exists()
