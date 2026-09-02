"""Phase 22 tests: pin gossip on the local net.

A pin object the leader holds is offered to followers on the in-process bus. A
follower that lacks a committed pin fetches it and heals its I3; a pin withheld
across the fleet stays a follower-local PIN_MISSING (I3) — the net still
converges and the lottery winners are unchanged. Pin gossip is the CAS lane, not
consensus: it touches no ring, no header, no lottery.
"""
import os

import pytest

from chronarch_core import PinStore
from chronarch_spec import canonical_bytes, hash_bytes
from chronarch_node import Node, net_run


def _homes(tmp_path, n=2):
    return [str(tmp_path / f"home-{i}") for i in range(n)]


def _pins(home):
    return PinStore(os.path.join(home, "pins"))


# -- the mechanism: make_pin_offers / _apply_pin_offer ----------------------
def test_offer_delivers_a_missing_object(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=2)
    leader, follower = Node("x", home=homes[0]), Node("y", home=homes[1])

    digest = leader.pin_store.put_object({"gossip": "hello", "n": 7})
    assert follower.pin_store.get(digest) is None  # follower lacks it
    offers = [o for o in leader.make_pin_offers() if o["object_hash"] == digest]
    assert offers and offers[0]["kind"] == "pin_offer"
    follower.on_gossip("x", offers[0])
    assert follower.pin_store.get(digest) is not None  # delivered


def test_offer_of_k18_forbidden_object_is_declined(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=2)
    follower = Node("y", home=homes[1])
    bad = canonical_bytes({"admin_key": "0" * 64})
    offer = {"kind": "pin_offer", "from_id": "x", "object_hash": hash_bytes(bad),
             "pin_kind": "opaque", "bytes": bad.hex()}
    follower.on_gossip("x", offer)  # K18 declines it — no store, no crash
    assert follower.pin_store.get(hash_bytes(bad)) is None


def test_offer_integrity_mismatch_is_declined(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=2)
    follower = Node("y", home=homes[1])
    offer = {"kind": "pin_offer", "from_id": "x", "object_hash": "0" * 64,
             "pin_kind": "opaque", "bytes": b"abc".hex()}  # bytes don't hash to id
    follower.on_gossip("x", offer)
    assert follower.pin_store.get("0" * 64) is None


def test_malformed_or_missing_bytes_do_not_crash(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=2)
    follower = Node("y", home=homes[1])
    # an advertisement without bytes (no DHT to fetch it) — declined, no crash
    follower.on_gossip("x", {"kind": "pin_offer", "from_id": "x", "object_hash": "a" * 64})
    # non-hex bytes — declined, no crash
    follower.on_gossip("x", {"kind": "pin_offer", "from_id": "x",
                             "object_hash": "a" * 64, "bytes": "zznothex"})


def test_node_with_no_pin_lane_offers_nothing(tmp_path):
    node = Node("z", 1, space_table={"z": 1})  # abstract, no home → no pin lane
    assert node.pin_store is None
    assert node.make_pin_offers() == []
    node.on_gossip("x", {"kind": "pin_offer", "from_id": "x", "object_hash": "a" * 64,
                         "bytes": b"x".hex()})  # no-op, no crash


# -- net_run: gossip delivers a committed pin a follower lacked -------------
def test_net_run_gossip_heals_a_withheld_follower_pin(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=3)
    follower_home = homes[0]
    committed = _pins(follower_home).pins()[0]
    _pins(follower_home).withhold(committed)  # follower now lacks a committed pin
    assert not Node("x", home=follower_home).verify_pins()["ok"]  # PIN_MISSING

    # the leader offers its pins each slot; the follower re-fetches the missing one
    net_run(homes, slots=6)
    assert _pins(follower_home).get(committed) is not None      # delivered
    assert Node("x", home=follower_home).verify_pins()["ok"]    # I3 healed


# -- withhold: still I3, still converge, lottery unchanged ------------------
def _fresh_net(tmp_path, tag):
    homes = [str(tmp_path / f"{tag}-{i}") for i in range(2)]
    net_run(homes, slots=3)
    return homes


def test_withhold_is_i3_convergence_and_lottery_unchanged(tmp_path):
    clean = _fresh_net(tmp_path, "clean")
    withheld = _fresh_net(tmp_path, "withheld")
    # identical fleets + identical starting height → identical lottery. The only
    # difference is a pin withheld across the withheld net.
    target = _pins(withheld[0]).pins()[0]
    _pins(withheld[0]).withhold(target)
    _pins(withheld[1]).withhold(target)  # no home serves it → gossip cannot heal

    clean_result = net_run(clean, slots=5)
    withheld_result = net_run(withheld, slots=5)

    # the net still converges under a withheld pin
    assert withheld_result["converged"] is True
    # the lottery is untouched by the CAS lane — identical leaders
    assert clean_result["leaders"] == withheld_result["leaders"]

    # a follower committed to the withheld pin reports PIN_MISSING + I3
    result = Node("x", home=withheld[0]).verify_pins(slot=32)
    assert result["code"] == "PIN_MISSING"
    assert result["restriction"]["interface"] == "I3"

    # and it still farms space — the pin failure never stopped it
    assert sum(h["won_slots"] for h in withheld_result["homes"]) == len(withheld_result["leaders"])


def test_pin_gossip_does_not_change_head_or_ledger(tmp_path):
    # A net with gossip converges to the SAME head as one where a follower's pin
    # lane is emptied — pin objects are never sealed into the Timechain.
    homes = _homes(tmp_path)
    net_run(homes, slots=3)
    # empty a follower's pin lane entirely; consensus must be unaffected
    ps = _pins(homes[0])
    for h in ps.pins():
        ps.withhold(h)
    result = net_run(homes, slots=4)
    assert result["converged"] is True
    # the ledger log holds only economic rings — no pin object on-chain
    import json
    log = open(os.path.join(homes[0], "ledger", "log.jsonl")).read()
    for line in log.splitlines():
        obj = json.loads(line)
        if obj["t"] == "ring":
            assert obj["ring_type"] == "economic"
