"""Phase 11 tests: a node boots from a .cseal and farms from the file, while
abstract-units nodes stay valid (backward compatible). The file is the source
of truth for space_units; a mismatch fails; a bad file never farms.
"""
import os

import pytest

from chronarch_farm import make_space_seal, write_space_seal
from chronarch_node import Cluster, Node, NodeError
from chronarch_node.leader import slot_leader


def _seal_file(tmp_path, farmer, k_size, name=None):
    seal = make_space_seal(farmer, k_size)
    path = str(tmp_path / (name or f"{farmer}.cseal"))
    write_space_seal(path, seal)
    return path, seal


# ------------------------------------------------- file-backed boot ----------

def test_node_space_units_from_file(tmp_path):
    path, seal = _seal_file(tmp_path, "alice", "k25")  # 6 units
    node = Node("alice", space_path=path)
    assert node.space_units == seal["space_units"] == 6
    assert node.plot_commitment["plot_id"] == seal["plot_id"]
    assert node.space_path == path


def test_node_from_space_seal_object(tmp_path):
    seal = make_space_seal("bob", "test")
    node = Node("bob", space_seal=seal)
    assert node.space_units == 1
    assert node.plot_commitment["plot_id"] == seal["plot_id"]


def test_abstract_node_still_works():
    node = Node("carol", 100)
    assert node.space_units == 100 and node.space_path is None


def test_abstract_units_and_file_of_same_units_elect_identically(tmp_path):
    pa, _ = _seal_file(tmp_path, "a", "k25")   # 6
    pb, _ = _seal_file(tmp_path, "b", "test")  # 1
    file_table = {"a": Node("a", space_path=pa).space_units,
                  "b": Node("b", space_path=pb).space_units}
    abstract_table = {"a": 6, "b": 1}
    assert file_table == abstract_table
    for slot in range(500):
        assert slot_leader(slot, abstract_table) == slot_leader(slot, file_table)


# --------------------------------------------------- mismatch / bad file -----

def test_mismatch_between_abstract_and_file(tmp_path):
    path, _ = _seal_file(tmp_path, "d", "k25")  # 6 units
    with pytest.raises(NodeError, match="SPACE_UNITS_MISMATCH"):
        Node("d", 5, space_path=path)
    # Matching abstract units are fine.
    assert Node("d", 6, space_path=path).space_units == 6


def test_missing_file_does_not_farm(tmp_path):
    with pytest.raises(NodeError):
        Node("e", space_path=str(tmp_path / "nope.cseal"))


def test_bad_magic_file_does_not_farm(tmp_path):
    path, _ = _seal_file(tmp_path, "f", "test")
    with open(path, "r+b") as fh:
        fh.write(b"XXXX")
    with pytest.raises(NodeError):
        Node("f", space_path=path)


def test_no_units_and_no_file_is_error():
    with pytest.raises(NodeError, match="required"):
        Node("g")


# --------------------------------------------- slot production / skip ---------

def test_file_backed_node_produces_valid_slot(tmp_path):
    path, seal = _seal_file(tmp_path, "node-0", "k25")
    node = Node("node-0", space_path=path, space_table={"node-0": 6})
    # Bond so it meets prestress and can lead.
    from chronarch_node.cluster import STEWARD_LOCK_CHRONONS
    node.hearth.lock("node-0", STEWARD_LOCK_CHRONONS, slot=0)
    msgs = node.produce_slot(1)
    assert msgs and msgs[0]["kind"] == "slot_header"


def test_truncated_file_mid_run_skips_leadership_no_crash(tmp_path):
    path, _ = _seal_file(tmp_path, "node-0", "k25")
    node = Node("node-0", space_path=path, space_table={"node-0": 6})
    from chronarch_node.cluster import STEWARD_LOCK_CHRONONS
    node.hearth.lock("node-0", STEWARD_LOCK_CHRONONS, slot=0)
    assert node.verify_space()
    # Corrupt the file after boot.
    with open(path, "r+b") as fh:
        fh.truncate(os.path.getsize(path) - 50)
    assert not node.verify_space()
    # The node skips leadership rather than crashing or forging a proof.
    assert node.produce_slot(1) == []


# ------------------------------------------------------ file-backed cluster --

def test_file_backed_cluster_converges(tmp_path):
    seals = {"a": make_space_seal("a", "k25"), "b": make_space_seal("b", "test"),
             "c": make_space_seal("c", "k25")}
    cluster = Cluster(space_seals=seals)
    assert cluster.space_table == {"a": 6, "b": 1, "c": 6}
    cluster.run_slots(6)
    assert cluster.converged() and cluster.all_verify()


def test_file_backed_cluster_elects_like_abstract(tmp_path):
    seals = {"a": make_space_seal("a", "k25"), "b": make_space_seal("b", "test")}
    cluster = Cluster(space_seals=seals)
    abstract = {"a": 6, "b": 1}
    assert cluster.space_table == abstract
    log = cluster.run_slots(10)
    for entry in log:
        assert entry["leader"] == slot_leader(entry["slot"], abstract,
                                              set(abstract))
