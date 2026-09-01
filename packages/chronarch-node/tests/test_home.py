"""Phase 13 tests: a durable node home + resume.

A stopped node must come back as the same organism — same identity, same
ledger height, same head hash — by replaying home/ledger through the frozen
Timechain. Resume is fail-closed: a truncated or hash-broken log, a head
commitment that disagrees with the replayed rings, or a kernel/Ring 0 drift
all raise. The ledger is never stored inside a .cseal.
"""
import json
import os

import pytest

from chronarch_farm import make_space_seal, write_space_seal
from chronarch_node import HomeError, Node
from chronarch_node.cluster import STEWARD_LOCK_CHRONONS


def _bonded_home_node(home, identity="A", units=1, **kw):
    node = Node(identity, units, home=home, space_table={identity: units}, **kw)
    node.hearth.lock(identity, STEWARD_LOCK_CHRONONS, slot=0)
    return node


def _run(node, n_slots, start=1):
    led = 0
    for slot in range(start, start + n_slots):
        if node.produce_slot(slot):
            led += 1
    return led


# -- boot without a home still works (tests stay fast) ---------------------
def test_node_without_home_is_in_memory():
    node = Node("A", 1, space_table={"A": 1})
    assert node._home is None
    node.hearth.lock("A", STEWARD_LOCK_CHRONONS, slot=0)
    assert node.produce_slot(1)  # leads and seals purely in memory
    assert node.ledger.height == 1


# -- fresh home is laid out on disk ----------------------------------------
def test_fresh_home_layout(tmp_path):
    home = str(tmp_path / "node-home")
    _bonded_home_node(home)
    assert os.path.isfile(os.path.join(home, "identity"))
    assert os.path.isfile(os.path.join(home, "boot.json"))
    assert os.path.isdir(os.path.join(home, "pins"))
    assert os.path.isdir(os.path.join(home, "ledger"))
    # boot.json is the boot receipt verbatim — exactly the BootReport keys.
    report = json.load(open(os.path.join(home, "boot.json")))
    assert set(report) == {"identity", "steps", "boot_ok", "kernel_hash", "ring0_hash"}
    assert open(os.path.join(home, "identity")).read() == "A"


# -- resume: same organism, same height, same head hash --------------------
def test_resume_same_height_and_head(tmp_path):
    home = str(tmp_path / "h")
    n1 = _bonded_home_node(home)
    _run(n1, 10)
    assert n1.ledger.height >= 1
    height, head = n1.ledger.height, n1.ledger.head_hash

    # A second process with the SAME home, given a throwaway identity: the home
    # is authoritative, so it resumes as the same organism.
    n2 = Node("ignored-identity", 1, home=home, space_table={"A": 1})
    assert n2.identity == "A"
    assert n2.ledger.height == height
    assert n2.ledger.head_hash == head
    assert n2.ledger.verify_full()
    # Slot-header infusion chain and block headers are restored too.
    assert n2.last_slot_header == n1.last_slot_header
    assert n2.last_header_hash == n1.last_header_hash
    assert len(n2.slot_headers) == len(n1.slot_headers)

    # And it keeps going — the chain extends cleanly from the resumed head.
    n2.hearth.lock("A", STEWARD_LOCK_CHRONONS, slot=0)
    _run(n2, 6, start=11)
    assert n2.ledger.height > height
    assert n2.ledger.verify_full()


# -- resume from an existing home persists across a third process ----------
def test_resume_is_idempotent_across_processes(tmp_path):
    home = str(tmp_path / "h")
    n1 = _bonded_home_node(home)
    _run(n1, 8)
    h1 = n1.ledger.head_hash
    n2 = Node("x", home=home, space_table={"A": 1})  # units recovered from home
    assert n2.space_units == 1
    n3 = Node("x", home=home, space_table={"A": 1})
    assert n2.ledger.head_hash == h1 == n3.ledger.head_hash


# -- fail closed: truncated ledger -----------------------------------------
def test_truncated_ledger_fails_closed(tmp_path):
    home = str(tmp_path / "h")
    _run(_bonded_home_node(home), 6)
    log = os.path.join(home, "ledger", "log.jsonl")
    data = open(log, "rb").read()
    assert len(data) > 10
    with open(log, "wb") as f:
        f.write(data[:-6])  # chop the tail mid-line
    with pytest.raises(HomeError):
        Node("A", 1, home=home, space_table={"A": 1})


# -- fail closed: a hash-broken ledger object ------------------------------
def test_hash_broken_ledger_fails_closed(tmp_path):
    home = str(tmp_path / "h")
    _run(_bonded_home_node(home), 6)
    log = os.path.join(home, "ledger", "log.jsonl")
    lines = open(log).read().splitlines()
    for i, line in enumerate(lines):
        obj = json.loads(line)
        if obj.get("t") == "ring":
            obj["body"] = {**obj["body"], "tamper": 1}  # body no longer hashes to ring_hash
            lines[i] = json.dumps(obj, sort_keys=True)
            break
    with open(log, "w") as f:
        f.write("\n".join(lines) + "\n")
    with pytest.raises(HomeError):
        Node("A", 1, home=home, space_table={"A": 1})


# -- fail closed: head commitment shorter than the replayed chain ----------
def test_head_commitment_mismatch_fails_closed(tmp_path):
    home = str(tmp_path / "h")
    _run(_bonded_home_node(home), 6)
    head_path = os.path.join(home, "ledger", "head.json")
    head = json.load(open(head_path))
    head["height"] = head["height"] + 1  # claim a taller chain than the log holds
    with open(head_path, "w") as f:
        f.write(json.dumps(head, sort_keys=True))
    with pytest.raises(HomeError):
        Node("A", 1, home=home, space_table={"A": 1})


# -- HOME_KERNEL_MISMATCH: a different kernel blob in the home -------------
def test_kernel_mismatch_is_rejected(tmp_path):
    home = str(tmp_path / "h")
    _run(_bonded_home_node(home), 4)
    boot_path = os.path.join(home, "boot.json")
    report = json.load(open(boot_path))
    report["kernel_hash"] = "0" * 64  # the recorded genesis is under a different kernel
    with open(boot_path, "w") as f:
        f.write(json.dumps(report, sort_keys=True))
    with pytest.raises(HomeError) as exc:
        Node("A", 1, home=home, space_table={"A": 1})
    assert "HOME_KERNEL_MISMATCH" in str(exc.value)


def test_ring0_mismatch_is_rejected(tmp_path):
    home = str(tmp_path / "h")
    _run(_bonded_home_node(home), 4)
    boot_path = os.path.join(home, "boot.json")
    report = json.load(open(boot_path))
    report["ring0_hash"] = "0" * 64
    with open(boot_path, "w") as f:
        f.write(json.dumps(report, sort_keys=True))
    with pytest.raises(HomeError) as exc:
        Node("A", 1, home=home, space_table={"A": 1})
    assert "HOME_KERNEL_MISMATCH" in str(exc.value)


# -- pin withhold is still I3 after resume ---------------------------------
def test_pin_withhold_is_i3_after_resume(tmp_path):
    home = str(tmp_path / "h")
    n1 = _bonded_home_node(home)
    # Abstract home node mirrors its boot CAS onto home/pins, so it honors its
    # own committed cas_root.
    assert n1.verify_pins()["ok"]
    _run(n1, 4)

    n2 = Node("x", home=home, space_table={"A": 1})
    assert n2.verify_pins()["ok"]  # pins reopened from disk
    withheld = n2.pin_store.pins()[0]
    n2.pin_store.withhold(withheld)
    result = n2.verify_pins(slot=32)
    assert not result["ok"]
    assert result["code"] == "PIN_MISSING"
    assert result["restriction"]["interface"] == "I3"
    # The node still farms — an I3 pin event never stops space production.
    n2.hearth.lock("A", STEWARD_LOCK_CHRONONS, slot=0)
    assert _run(n2, 6, start=5) >= 1


# -- file-backed home: the .cseal is copied in and reused on resume --------
def test_file_backed_home_copies_and_reuses_cseal(tmp_path):
    seal = make_space_seal("F", "test")
    src = str(tmp_path / "F.cseal")
    write_space_seal(src, seal)
    home = str(tmp_path / "h")
    n1 = Node("F", space_path=src, home=home, space_table={"F": 1})
    n1.hearth.lock("F", STEWARD_LOCK_CHRONONS, slot=0)
    assert os.path.isfile(os.path.join(home, "space.cseal"))
    _run(n1, 6)
    head = n1.ledger.head_hash

    # Delete the ORIGINAL file; the home's own copy must still boot the node.
    os.remove(src)
    n2 = Node("F", home=home, space_table={"F": 1})
    assert n2.identity == "F"
    assert n2.space_units == 1
    assert n2.space_path == os.path.join(home, "space.cseal")
    assert n2.ledger.head_hash == head
    assert n2.plot_commitment["plot_id"] == seal["plot_id"]


# -- the ledger is JSONL node state, NEVER inside a .cseal -----------------
def test_ledger_is_not_stored_in_a_cseal(tmp_path):
    home = str(tmp_path / "h")
    _run(_bonded_home_node(home), 5)
    # The ledger lives in home/ledger; no .cseal exists in an abstract home,
    # and the ledger dir holds a plain jsonl log, not a space file.
    assert os.path.isfile(os.path.join(home, "ledger", "log.jsonl"))
    assert not os.path.exists(os.path.join(home, "space.cseal"))
    # The log's magic is JSON, not the CSL1 .cseal magic.
    head = open(os.path.join(home, "ledger", "log.jsonl"), "rb").read(4)
    assert head != b"CSL1"
