"""Lab CLI: chronarch memory --home DIR — read-only, fail-closed, exact shape."""
import hashlib
import json
import os

from chronarch_cli import main
from chronarch_node import MEMORY_KEYS

EXPECTED_KEYS = {"identity", "height", "head_hash", "ring_count", "scar_count",
                 "pins_ok", "i3", "credits_by_reason"}


def _run(capsys, *argv):
    rc = main(list(argv))
    return rc, json.loads(capsys.readouterr().out)


def _snapshot(root: str) -> dict:
    """Every file under the home with its bytes' hash: a read must not change it."""
    out = {}
    for dirpath, _dirs, files in os.walk(root):
        for name in files:
            path = os.path.join(dirpath, name)
            with open(path, "rb") as f:
                out[os.path.relpath(path, root)] = hashlib.sha256(f.read()).hexdigest()
    return out


def test_memory_keys_are_the_closed_shape():
    assert set(MEMORY_KEYS) == EXPECTED_KEYS


def test_memory_on_pulsed_home(tmp_path, capsys):
    home = str(tmp_path / "solo")
    rc, pulsed = _run(capsys, "pulse", "--home", home, "--slots", "1")
    assert rc == 0 and pulsed["ok"]

    rc, out = _run(capsys, "memory", "--home", home)
    assert rc == 0 and out["ok"]
    mem = out["result"]
    assert set(mem) == EXPECTED_KEYS
    assert mem["height"] >= 1
    assert mem["scar_count"] >= 0
    assert mem["ring_count"] == mem["height"] + 1  # Ring 0 counts
    assert mem["identity"] == pulsed["result"]["identity"]
    assert mem["head_hash"] == pulsed["result"]["head_hash"]
    assert mem["pins_ok"] is True and mem["i3"] is None
    assert mem["credits_by_reason"] == pulsed["result"]["credits_by_reason"]
    assert mem["credits_by_reason"]["space"] > 0


def test_memory_is_read_only(tmp_path, capsys):
    home = str(tmp_path / "solo")
    _run(capsys, "pulse", "--home", home, "--slots", "2")
    before = _snapshot(home)
    rc, out = _run(capsys, "memory", "--home", home)
    assert rc == 0 and out["ok"]
    # Same files, same bytes: no ring rewritten, no head refreshed, no credit
    # appended, no scar touched.
    assert _snapshot(home) == before


def test_memory_persists_across_pulses(tmp_path, capsys):
    home = str(tmp_path / "solo")
    _run(capsys, "pulse", "--home", home, "--slots", "1")
    _, first = _run(capsys, "memory", "--home", home)
    _run(capsys, "pulse", "--home", home, "--slots", "2")
    _, second = _run(capsys, "memory", "--home", home)
    # The second pulse resumed the same organism and extended its memory.
    assert second["result"]["identity"] == first["result"]["identity"]
    assert second["result"]["height"] > first["result"]["height"]
    assert second["result"]["head_hash"] != first["result"]["head_hash"]
    assert (second["result"]["credits_by_reason"]["space"]
            > first["result"]["credits_by_reason"]["space"])


def test_memory_on_missing_home_is_bad_home_and_creates_nothing(tmp_path, capsys):
    home = str(tmp_path / "nope")
    rc, out = _run(capsys, "memory", "--home", home)
    assert rc == 1 and out["error_code"] == "BAD_HOME"
    assert not os.path.exists(home)


def test_memory_fails_closed_on_corrupt_ledger(tmp_path, capsys):
    home = str(tmp_path / "solo")
    _run(capsys, "pulse", "--home", home, "--slots", "1")
    with open(os.path.join(home, "ledger", "log.jsonl"), "a", encoding="utf-8") as f:
        f.write('{"t": "ring", "height": 99')  # a truncated tail line
    rc, out = _run(capsys, "memory", "--home", home)
    assert rc == 1 and out["error_code"] == "BAD_HOME"
    assert "ledger" in out["result"]["detail"]


def test_memory_fails_closed_on_mutated_ring(tmp_path, capsys):
    home = str(tmp_path / "solo")
    _run(capsys, "pulse", "--home", home, "--slots", "1")
    log_path = os.path.join(home, "ledger", "log.jsonl")
    with open(log_path, "r", encoding="utf-8") as f:
        lines = f.read().splitlines()
    for i, line in enumerate(lines):
        entry = json.loads(line)
        if entry["t"] == "ring":
            entry["slot"] = entry["slot"] + 1000  # rewrite a past ring
            lines[i] = json.dumps(entry, sort_keys=True)
            break
    with open(log_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    rc, out = _run(capsys, "memory", "--home", home)
    # The stored ring_hash no longer matches: memory refuses, it does not guess.
    assert rc == 1 and out["error_code"] == "BAD_HOME"
    assert "hash mismatch" in out["result"]["detail"]
