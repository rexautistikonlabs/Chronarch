"""Phase 4 tests: the abstract-to-plot adapter changes NOTHING about who
wins slots; the stub verifier is strict about structure and honest about
what it does not check (no Chia lookups, no VDF); cas_root is a commitment,
never a retrieval requirement.
"""
import pytest

from chronarch_farm import (
    SIZE_TABLE,
    PlotError,
    cas_root_of,
    commitment_binds_pinset,
    commitments_from_abstract,
    make_plot_commitment,
    make_plot_proof,
    space_table_from_commitments,
    total_units,
    verify_plot_commitment,
    verify_plot_proof,
)
from chronarch_node import slot_leader

FLEET = {"node-0": 100, "node-1": 1014, "node-2": 2088, "node-3": 7}


def _fleet_commitments():
    out = []
    for farmer, units in FLEET.items():
        out.extend(commitments_from_abstract(farmer, units))
    return out


# ------------------------------------------------------ election equivalence --

def test_adapter_preserves_units_exactly():
    for farmer, units in FLEET.items():
        commitments = commitments_from_abstract(farmer, units)
        assert total_units(commitments) == units


def test_plot_world_elects_identically_to_abstract_world():
    """The core Phase 4 oracle: identical units -> identical leaders, slot by
    slot, for hundreds of slots. The adapter cannot move a single draw."""
    plot_table = space_table_from_commitments(_fleet_commitments())
    assert plot_table == FLEET
    for slot in range(500):
        assert slot_leader(slot, FLEET) == slot_leader(slot, plot_table), slot


def test_single_commitment_of_n_units_elects_like_abstract_n():
    abstract = {"solo": SIZE_TABLE["k32"], "rival": 500}
    commitment = make_plot_commitment("solo", "k32")
    plot_table = space_table_from_commitments(
        [commitment] + commitments_from_abstract("rival", 500))
    for slot in range(200):
        assert slot_leader(slot, abstract) == slot_leader(slot, plot_table)


def test_decomposition_is_deterministic():
    a = commitments_from_abstract("f", 1234)
    b = commitments_from_abstract("f", 1234)
    assert a == b
    assert [c["plot_id"] for c in a] == [c["plot_id"] for c in b]


# ------------------------------------------------------------- stub verifier --

def test_malformed_plot_id_fails_verify():
    commitment = make_plot_commitment("farmer", "k32")
    forged = dict(commitment, plot_id="0" * 64)
    with pytest.raises(PlotError, match="plot_id"):
        verify_plot_commitment(forged)


def test_mismatched_space_units_fails_verify():
    commitment = make_plot_commitment("farmer", "k25")
    greedy = dict(commitment, space_units=SIZE_TABLE["k25"] * 10)
    with pytest.raises(PlotError, match="size table"):
        verify_plot_commitment(greedy)


def test_unknown_k_size_rejected():
    with pytest.raises(PlotError, match="k_size"):
        make_plot_commitment("farmer", "k99")


def test_extra_or_missing_fields_rejected():
    commitment = make_plot_commitment("farmer", "test")
    with pytest.raises(PlotError):
        verify_plot_commitment({**commitment, "bonus": 1})
    short = dict(commitment)
    del short["index"]
    with pytest.raises(PlotError):
        verify_plot_commitment(short)


def test_k18_screen_covers_plot_objects():
    from chronarch_spec import SchemaError
    commitment = make_plot_commitment("farmer", "test")
    with pytest.raises(SchemaError):
        verify_plot_commitment({**commitment, "admin_key": "0" * 64})


def test_plot_proof_round_trip_and_forgery():
    commitment = make_plot_commitment("farmer", "k32")
    proof = make_plot_proof(commitment, slot=7)
    assert verify_plot_proof(proof, commitment)
    with pytest.raises(PlotError, match="recompute"):
        verify_plot_proof(dict(proof, proof="f" * 64), commitment)
    with pytest.raises(PlotError, match="space_units"):
        verify_plot_proof(dict(proof, space_units=1), commitment)
    other = make_plot_commitment("farmer", "k32", index=1)
    with pytest.raises(PlotError, match="reference"):
        verify_plot_proof(proof, other)


# --------------------------------------------------- cas_root is a commitment --

def test_cas_root_is_commitment_only_missing_object_does_not_invalidate():
    """The plot proves SPACE. A cas_root naming pins that are missing (or a
    CAS that never existed) does not invalidate the plot proof — the missing
    pin is an I3 nervous event on the CAS lane, not a plot failure."""
    from chronarch_core import CAS
    cas = CAS()
    digest = cas.put_object({"ring": "evidence"})
    root = cas_root_of(cas)
    commitment = make_plot_commitment("farmer", "k32", cas_root=root)
    proof = make_plot_proof(commitment, slot=3)

    cas.withhold(digest)  # the CAS object vanishes...
    assert verify_plot_commitment(commitment)  # ...plot commitment still verifies
    assert verify_plot_proof(proof, commitment)  # ...and so does the proof
    # But the binding check now reports the pinset is not honored (I3 territory).
    assert not commitment_binds_pinset(commitment, cas)


def test_cas_root_optional_and_never_required_to_win():
    bare = make_plot_commitment("farmer", "k32")  # no cas_root at all
    assert bare["cas_root"] == ""
    table = space_table_from_commitments([bare])
    assert table == {"farmer": SIZE_TABLE["k32"]}
    assert slot_leader(1, table) == "farmer"


def test_pinset_binding_matches_live_cas():
    from chronarch_core import CAS
    cas = CAS()
    cas.put_object({"a": 1})
    commitment = make_plot_commitment("farmer", "test", cas_root=cas_root_of(cas))
    assert commitment_binds_pinset(commitment, cas)
    cas.put_object({"b": 2})  # pinset changed -> stale commitment detected
    assert not commitment_binds_pinset(commitment, cas)


def test_pin_withhold_remains_an_i3_event():
    """The existing nervous behavior is unchanged by Phase 4: a withheld pin
    surfaces as CASMiss and seals at I3."""
    from chronarch_core import CAS, Timechain
    from chronarch_core.cas import CASMiss
    from chronarch_spec import build_kernel, build_ring0
    cas = CAS()
    digest = cas.put_object({"evidence": 1})
    cas.withhold(digest)
    with pytest.raises(CASMiss):
        cas.get(digest)
    chain = Timechain(build_ring0(build_kernel()))
    scar = chain.seal_scar("I3", "phase4: withheld pin", [digest],
                           author="farmer", slot=1)
    assert scar["body"]["interface"] == "I3"


# ------------------------------------------------------------- housekeeping --

def test_size_table_shape():
    assert SIZE_TABLE["test"] == 1
    assert all(isinstance(v, int) and v > 0 for v in SIZE_TABLE.values())
    # k32 documents ~101.4 GiB at 0.1 GiB per unit.
    assert SIZE_TABLE["k32"] == 1014


def test_adapter_rejects_nonpositive_units():
    with pytest.raises(PlotError):
        commitments_from_abstract("f", 0)
    with pytest.raises(PlotError):
        commitments_from_abstract("f", -5)
