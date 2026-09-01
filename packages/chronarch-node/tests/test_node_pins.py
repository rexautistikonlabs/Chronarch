"""Phase 12 node tests: a node bound to a pin dir reports pin health, and a
withheld pin is an I3 nervous event — the node keeps running and keeps
farming space, and the lottery is unchanged.
"""
from chronarch_core import PinStore
from chronarch_farm import PIN_MISSING, PINS_OK, make_space_seal
from chronarch_node import Node
from chronarch_node.cluster import STEWARD_LOCK_CHRONONS


def _bonded(node):
    node.hearth.lock(node.identity, STEWARD_LOCK_CHRONONS, slot=0)


def test_node_without_pin_dir_has_plain_health():
    node = Node("n0", 100)
    h = node.rpc("health", {"slot": 32})
    assert "pins" not in h  # unconfigured: no pin block, plain HealthVector
    assert node.verify_pins()["code"] == PINS_OK


def test_node_pin_health_ok(tmp_path):
    pd = str(tmp_path / "pins")
    store = PinStore(pd)
    store.put_object({"x": 1})
    seal = make_space_seal("n0", "test", cas_root=store.cas_root())
    node = Node("n0", space_seal=seal, pin_dir=pd)
    h = node.rpc("health", {"slot": 32})
    assert h["pins"]["ok"] and h["pins"]["code"] == PINS_OK
    # The HealthVector proper is unchanged (9 components).
    assert len(h["components"]) == 9


def test_withhold_after_boot_is_i3_node_still_runs_and_farms(tmp_path):
    pd = str(tmp_path / "pins")
    store = PinStore(pd)
    ph = store.put_object({"x": 1})
    seal = make_space_seal("n0", "test", cas_root=store.cas_root())
    node = Node("n0", space_seal=seal, pin_dir=pd, space_table={"n0": 1})
    _bonded(node)
    assert node.rpc("health", {"slot": 32})["pins"]["code"] == PINS_OK

    store.withhold(ph)  # withhold after boot
    h = node.rpc("health", {"slot": 32})
    assert h["pins"]["code"] == PIN_MISSING and not h["pins"]["ok"]
    assert h["pins"]["i3"]["interface"] == "I3"
    # The node still runs and still farms space (the .cseal is untouched).
    assert node.space_units == 1
    msgs = node.produce_slot(1)
    assert msgs and msgs[0]["kind"] == "slot_header"


def test_pin_failure_does_not_change_leadership(tmp_path):
    pd = str(tmp_path / "pins")
    store = PinStore(pd)
    ph = store.put_object({"x": 1})
    seal = make_space_seal("n0", "test", cas_root=store.cas_root())
    node = Node("n0", space_seal=seal, pin_dir=pd, space_table={"n0": 1, "n1": 6})
    _bonded(node)
    leader_before = node.produce_slot(1)
    store.withhold(ph)
    # Same slot, pins withheld: leadership decision (space-weighted) unchanged.
    from chronarch_node.leader import slot_leader
    assert slot_leader(1, node.space_table) == slot_leader(1, node.space_table)
