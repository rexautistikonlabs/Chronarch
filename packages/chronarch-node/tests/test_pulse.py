"""Phase 16 tests: the organism pulse.

One deterministic loop that farms, checks pins, attests a DummyMind compute
job, and credits Chronos on a home. No wall clock, no randomness beyond the
lottery. The pulse is not an admin path: it never creates a live faculty or a
proposal, and it never seals a Chronos credit into the Timechain.
"""
import json
import os

import pytest

from chronarch_core import PinStore
from chronarch_farm import make_space_seal, write_space_seal
from chronarch_node import Node, NodeError, pulse


def test_pulse_on_fresh_home_grows_height_and_pays_space(tmp_path):
    home = str(tmp_path / "h")
    result = pulse(home)
    assert result["height"] >= 1
    assert result["won_slots"] >= 1
    assert result["credits_by_reason"]["space"] > 0
    assert result["pins_ok"] is True and result["i3"] is None
    assert len(result["head_hash"]) == 64


def test_pulse_attests_dummymind_and_pays_compute(tmp_path):
    home = str(tmp_path / "h")
    result = pulse(home)
    # A DummyMind receipt attested and was consumed on a win → COMPUTE > 0.
    assert result["credits_by_reason"]["compute"] > 0


def test_pulse_is_deterministic(tmp_path):
    a = pulse(str(tmp_path / "a"))
    b = pulse(str(tmp_path / "b"))
    # Two fresh homes with the same defaults produce identical head + credits.
    assert a["head_hash"] == b["head_hash"]
    assert a["credits_by_reason"] == b["credits_by_reason"]
    assert a["won_slots"] == b["won_slots"]


def test_pulse_resumes_and_extends(tmp_path):
    home = str(tmp_path / "h")
    first = pulse(home)
    second = pulse(home)
    assert second["height"] > first["height"]
    assert second["won_slots"] >= 1
    assert second["credits_by_reason"]["space"] > first["credits_by_reason"]["space"]


def test_pulse_with_withheld_pin_still_returns_and_pays_space(tmp_path):
    home = str(tmp_path / "h")
    pulse(home)  # lays out the home + pins
    store = PinStore(os.path.join(home, "pins"))
    store.withhold(store.pins()[0])  # withhold a committed pin (an I3 event)

    result = pulse(home)
    assert result["pins_ok"] is False
    assert result["i3"] is not None and result["i3"]["interface"] == "I3"
    # A pin failure is nervous, never a space defect: the node still farms.
    assert result["won_slots"] >= 1
    assert result["credits_by_reason"]["space"] > 0


def test_pulse_file_backed_uses_farmer_id_and_copies_cseal(tmp_path):
    src = str(tmp_path / "F.cseal")
    write_space_seal(src, make_space_seal("farmer-F", "test"))
    home = str(tmp_path / "h")
    result = pulse(home, space_path=src)
    assert result["identity"] == "farmer-F"
    assert result["won_slots"] >= 1
    assert os.path.isfile(os.path.join(home, "space.cseal"))


def test_pulse_space_units_mismatch_on_resume(tmp_path):
    small = str(tmp_path / "small.cseal")
    big = str(tmp_path / "big.cseal")
    write_space_seal(small, make_space_seal("F", "test"))   # 1 unit
    write_space_seal(big, make_space_seal("F", "k25"))      # 6 units
    home = str(tmp_path / "h")
    pulse(home, space_path=small)
    with pytest.raises(NodeError) as exc:
        pulse(home, space_path=big)
    assert "SPACE_UNITS_MISMATCH" in str(exc.value)


def test_pulse_does_not_create_faculties_or_proposals(tmp_path):
    home = str(tmp_path / "h")
    pulse(home)
    # A resumed node's registry holds ONLY the seed faculties — the pulse never
    # registered an authored/live faculty (G3/G4).
    resumed = Node("x", home=home)
    plain = Node("y", 1, space_table={"y": 1})
    assert set(resumed.registry.names()) == set(plain.registry.names())
    # The consensus ledger carries only economic slot rings — no proposal ring,
    # no faculty-activation ring, and no Chronos credit.
    log = os.path.join(home, "ledger", "log.jsonl")
    ring_types = set()
    for line in open(log):
        obj = json.loads(line)
        if obj["t"] == "ring":
            ring_types.add(obj["ring_type"])
    assert ring_types <= {"economic"}


def test_pulse_does_not_seal_credits_into_the_timechain(tmp_path):
    home = str(tmp_path / "h")
    pulse(home)
    # Credits live in the separate blood ledger, never the consensus log.
    assert os.path.isfile(os.path.join(home, "rewards.jsonl"))
    log_text = open(os.path.join(home, "ledger", "log.jsonl")).read()
    assert "chronos:treasury" not in log_text
    assert '"reason"' not in log_text


def test_pulse_rejects_zero_slots(tmp_path):
    with pytest.raises(ValueError):
        pulse(str(tmp_path / "h"), slots=0)
