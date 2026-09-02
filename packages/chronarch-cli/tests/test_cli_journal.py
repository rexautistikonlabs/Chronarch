"""Lab journal CLI: chronarch journal --home DIR append --text ... | list.

Off-chain operator notes. Appending never moves the Timechain; a note shaped
like a consensus object is refused via the K18 screen; a missing home errors.
"""
import hashlib
import json
import os

from chronarch_cli import main


def _run(capsys, *argv):
    rc = main(list(argv))
    return rc, json.loads(capsys.readouterr().out)


def _pulsed_home(tmp_path, capsys, slots="1"):
    home = str(tmp_path / "solo")
    rc, out = _run(capsys, "pulse", "--home", home, "--slots", slots)
    assert rc == 0 and out["ok"]
    return home


def test_append_then_list(tmp_path, capsys):
    home = _pulsed_home(tmp_path, capsys)
    rc, out = _run(capsys, "journal", "--home", home, "append", "--text", "pulsed one slot; pins ok")
    assert rc == 0 and out["ok"]
    entry = out["result"]["entry"]
    assert set(entry) == {"slot_hint", "ts_unix_int", "text", "text_hash"}
    assert entry["text"] == "pulsed one slot; pins ok"
    assert entry["text_hash"] == hashlib.sha256(b"pulsed one slot; pins ok").hexdigest()
    assert isinstance(entry["ts_unix_int"], int) and not isinstance(entry["ts_unix_int"], bool)
    assert entry["slot_hint"] == 1  # defaults to the home's persisted height
    assert out["result"]["entries"] == 1

    rc, out = _run(capsys, "journal", "--home", home, "append", "--text", "second note", "--slot-hint", "7")
    assert rc == 0 and out["result"]["entry"]["slot_hint"] == 7

    rc, out = _run(capsys, "journal", "--home", home, "list")
    assert rc == 0 and out["ok"]
    assert out["result"]["count"] == 2
    assert [e["text"] for e in out["result"]["entries"]] == ["pulsed one slot; pins ok", "second note"]
    assert out["result"]["entries"][0] == entry


def test_journal_lines_are_canonical_json_with_integer_time(tmp_path, capsys):
    home = _pulsed_home(tmp_path, capsys)
    _run(capsys, "journal", "--home", home, "append", "--text", "héllo — note")
    with open(os.path.join(home, "journal.jsonl"), "rb") as f:
        raw = f.read()
    lines = raw.split(b"\n")
    assert lines[-1] == b"" and len(lines) == 2
    line = lines[0]
    obj = json.loads(line)
    # canonical: sorted keys, compact separators, ASCII only, no floats
    assert line == json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()
    assert list(obj) == ["slot_hint", "text", "text_hash", "ts_unix_int"]
    assert b"." not in json.dumps(obj["ts_unix_int"]).encode()
    assert type(obj["ts_unix_int"]) is int and type(obj["slot_hint"]) is int


def test_append_leaves_the_timechain_unchanged(tmp_path, capsys):
    home = _pulsed_home(tmp_path, capsys, slots="2")
    _, before = _run(capsys, "memory", "--home", home)
    with open(os.path.join(home, "ledger", "log.jsonl"), "rb") as f:
        log_before = f.read()
    for i in range(3):
        rc, _ = _run(capsys, "journal", "--home", home, "append", "--text", f"note {i}")
        assert rc == 0
    _, after = _run(capsys, "memory", "--home", home)
    assert after["result"]["height"] == before["result"]["height"]
    assert after["result"]["head_hash"] == before["result"]["head_hash"]
    assert after["result"]["ring_count"] == before["result"]["ring_count"]
    assert after["result"]["credits_by_reason"] == before["result"]["credits_by_reason"]
    with open(os.path.join(home, "ledger", "log.jsonl"), "rb") as f:
        assert f.read() == log_before  # byte-for-byte: nothing sealed
    # and the pin lane did not grow: no consensus object was pinned
    assert not any(name.endswith(".jsonl") for name in os.listdir(os.path.join(home, "pins")))


def test_k18_forbidden_key_is_rejected(tmp_path, capsys):
    home = _pulsed_home(tmp_path, capsys)
    for text in ('{"admin_key": "abc"}',
                 'note: {"config": {"founder_key": 1}}',
                 '[{"helm_override": true}]'):
        rc, out = _run(capsys, "journal", "--home", home, "append", "--text", text)
        assert rc == 1 and out["error_code"] == "JOURNAL_REJECTED", text
        assert "K18" in out["result"]["detail"]
    rc, out = _run(capsys, "journal", "--home", home, "list")
    assert out["result"]["count"] == 0  # nothing leaked into the file


def test_tool_call_and_proposal_shapes_are_rejected(tmp_path, capsys):
    home = _pulsed_home(tmp_path, capsys)
    tool_call = json.dumps({"name": "seal_ring", "arguments": {"body": {}}})
    tool_calls = 'please run {"tool_calls": [{"id": "1"}]}'
    proposal = json.dumps({"proposal_id": "p1", "proposer": "chronarch", "major_class": "M3",
                           "spec_hash": "00" * 32, "changes": {}, "deposit_chronons": 1,
                           "submitted_slot": 1})
    for text, needle in ((tool_call, "tool-call"), (tool_calls, "tool-call"), (proposal, "Proposal")):
        rc, out = _run(capsys, "journal", "--home", home, "append", "--text", text)
        assert rc == 1 and out["error_code"] == "JOURNAL_REJECTED", text
        assert needle in out["result"]["detail"]
    # prose that merely mentions these words is a note, not an object
    rc, out = _run(capsys, "journal", "--home", home, "append", "--text",
                   "reminder: a proposal needs a ballot; no admin_key exists")
    assert rc == 0 and out["ok"]


def test_missing_home_errors_and_creates_nothing(tmp_path, capsys):
    home = str(tmp_path / "nope")
    rc, out = _run(capsys, "journal", "--home", home, "append", "--text", "hi")
    assert rc == 1 and out["error_code"] == "BAD_HOME"
    rc, out = _run(capsys, "journal", "--home", home, "list")
    assert rc == 1 and out["error_code"] == "BAD_HOME"
    assert not os.path.exists(home)


def test_empty_note_is_rejected(tmp_path, capsys):
    home = _pulsed_home(tmp_path, capsys)
    rc, out = _run(capsys, "journal", "--home", home, "append", "--text", "   ")
    assert rc == 1 and out["error_code"] == "JOURNAL_REJECTED"


def test_list_fails_closed_on_tampered_line(tmp_path, capsys):
    home = _pulsed_home(tmp_path, capsys)
    _run(capsys, "journal", "--home", home, "append", "--text", "original")
    path = os.path.join(home, "journal.jsonl")
    with open(path, "rb") as f:
        entry = json.loads(f.read().splitlines()[0])
    entry["text"] = "edited after the fact"
    with open(path, "wb") as f:
        f.write(json.dumps(entry, sort_keys=True, separators=(",", ":")).encode() + b"\n")
    rc, out = _run(capsys, "journal", "--home", home, "list")
    assert rc == 1 and out["error_code"] == "BAD_JOURNAL"
    assert "text_hash" in out["result"]["detail"]

    with open(path, "ab") as f:
        f.write(b'{"slot_hint": 1.5, "ts_unix_int": 1, "text": "x", "text_hash": "y"}\n')
    rc, out = _run(capsys, "journal", "--home", home, "list")
    assert rc == 1 and out["error_code"] == "BAD_JOURNAL"
