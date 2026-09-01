"""Phase 12 tests: the on-disk CAS pin lane + SpaceSeal binding. Plots do not
store rings; a withheld/tampered pin is an I3 nervous event, never a space
defect and never a lottery change.
"""
import os

import pytest

from chronarch_core import PinError, PinStore, pinset_root
from chronarch_farm import (
    PIN_MISMATCH,
    PIN_MISSING,
    PINS_OK,
    cas_root_of,
    make_space_seal,
    verify_pins,
)
from chronarch_node.leader import slot_leader
from chronarch_spec import SchemaError, canonical_bytes


@pytest.fixture()
def store(tmp_path):
    return PinStore(str(tmp_path / "pins"))


# ---------------------------------------------------------- put / get --------

def test_put_get_roundtrip(store):
    h = store.put_object({"ring": "experience", "n": 1})
    assert store.get(h) == canonical_bytes({"ring": "experience", "n": 1})
    assert store.verify(h)


def test_missing_hash_returns_none(store):
    assert store.get("0" * 64) is None
    assert not store.has("0" * 64)


def test_opaque_blob_allowed(store):
    blob = b"\x00\x01\x02 not a consensus object"
    h = store.put(blob, kind="opaque")
    assert store.get(h) == blob


def test_object_kind_requires_consensus_bytes(store):
    with pytest.raises(PinError):
        store.put(b"\x00\x01 raw", kind="object")


# ---------------------------------------------------------------- K18 --------

def test_k18_forbidden_key_rejected_on_object_put(store):
    with pytest.raises(SchemaError):
        store.put(canonical_bytes({"admin_key": "0" * 64}), kind="object")


def test_k18_forbidden_key_rejected_even_as_opaque(store):
    # A forbidden object cannot be smuggled in labeled opaque.
    with pytest.raises(SchemaError):
        store.put(b'{"helm_override": true}', kind="opaque")


# ------------------------------------------------------------ cas_root -------

def test_pinset_root_matches_frozen_cas_root_formula(store):
    store.put_object({"a": 1})
    store.put_object({"b": 2})
    assert store.cas_root() == pinset_root(store.pins())
    # And equals the frozen cas_root_of over the same pin set (a .cseal built
    # from a CAS binds to a PinStore holding the same pins).
    assert store.cas_root() == cas_root_of(store)


# ----------------------------------------------------- verify_pins / I3 ------

def test_verify_pins_ok(store):
    store.put_object({"x": 1})
    seal = make_space_seal("f", "test", cas_root=store.cas_root())
    result = verify_pins(seal, store)
    assert result["ok"] and result["code"] == PINS_OK and result["restriction"] is None


def test_tampered_object_is_pin_mismatch_i3(store):
    h = store.put_object({"x": 1})
    seal = make_space_seal("f", "test", cas_root=store.cas_root())
    with open(os.path.join(store.dir, h), "wb") as fh:
        fh.write(b"tampered bytes not matching the hash")
    result = verify_pins(seal, store)
    assert result["code"] == PIN_MISMATCH and not result["ok"]
    assert result["restriction"]["interface"] == "I3"


def test_withheld_pin_is_pin_missing_i3(store):
    h = store.put_object({"x": 1})
    seal = make_space_seal("f", "test", cas_root=store.cas_root())
    store.withhold(h)  # a withholding farmer
    result = verify_pins(seal, store)
    assert result["code"] == PIN_MISSING and not result["ok"]
    assert result["restriction"]["interface"] == "I3"


def test_cseal_with_cas_root_and_empty_pin_dir(tmp_path, store):
    from chronarch_farm import read_space_seal, write_space_seal
    store.put_object({"x": 1})
    seal = make_space_seal("f", "test", cas_root=store.cas_root())
    # The .cseal is still perfectly valid (cas_root is a commitment only)...
    path = str(tmp_path / "s.cseal")
    write_space_seal(path, seal)
    assert read_space_seal(path)["cas_root"] == store.cas_root()
    # ...but an empty pin dir fails verify_pins as an I3 PIN_MISSING.
    empty = PinStore(str(tmp_path / "empty"))
    result = verify_pins(seal, empty)
    assert result["code"] == PIN_MISSING
    assert result["restriction"]["interface"] == "I3"


def test_no_cas_root_commitment_is_ok(store):
    seal = make_space_seal("f", "test")  # cas_root == ""
    assert verify_pins(seal, store)["code"] == PINS_OK


def test_lottery_identical_pins_present_vs_withheld(store):
    # The pin lane never touches the lottery: winners are the same whether the
    # pins are present or withheld.
    h = store.put_object({"x": 1})
    fleet = {"f": 1, "g": 6}
    before = [slot_leader(s, fleet) for s in range(300)]
    store.withhold(h)
    after = [slot_leader(s, fleet) for s in range(300)]
    assert before == after
