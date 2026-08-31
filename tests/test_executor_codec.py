"""DummyMind (K16) + codec (K2): inert faculties cannot run, tampered
programs are caught, canonical hashing is strict and domain-separated."""
import pytest

from chronarch_core import (
    FacultyRegistry,
    InertFacultyError,
    RegistryError,
    bootstrap,
    route_slot_reward,
    run_faculty,
    slot_issuance_chronons,
)
from chronarch_spec import CodecError, build_kernel, canonical_bytes, chash
from chronarch_spec.constants import (
    BASE_REWARD_PER_SLOT_CHRONONS,
    HALVING_INTERVAL_SLOTS,
    HEALTH_COMPONENTS,
    INTERFACES,
    OPCODE_MENU,
    REWARD_ROUTER_BPS,
    SEED_FACULTIES,
)


@pytest.fixture()
def registry():
    reg = FacultyRegistry()
    for record in build_kernel()["faculty_registry"].values():
        reg.load_kernel_faculty(record)
    return reg


def test_live_seed_faculty_runs(registry):
    out = run_faculty(registry, "injection_screen_sense",
                      {"tx": {"amount": 5}}, {})
    assert out["clean"]
    out = run_faculty(registry, "injection_screen_sense",
                      {"tx": {"nested": {"admin_key": "x"}}}, {})
    assert not out["clean"] and "admin_key" in out["reason"]


def test_inert_faculty_cannot_run(registry):
    registry.register_authored({"name": "sneaky", "kind": "modality",
                                "origin": "authored",
                                "program": ["LOAD_INPUT", "EMIT"],
                                "status": "live"})
    with pytest.raises(InertFacultyError):
        run_faculty(registry, "sneaky", {}, {})


def test_hibernated_faculty_cannot_run(registry):
    registry.hibernate("injection_screen_sense")
    with pytest.raises(InertFacultyError):
        run_faculty(registry, "injection_screen_sense", {}, {})


def test_tampered_program_cannot_run(registry):
    # Simulate on-disk tamper of a live record: program changes, hash doesn't.
    registry._records["injection_screen_sense"]["program"] = ["LOAD_INPUT", "EMIT"]
    with pytest.raises(RegistryError, match="hash"):
        run_faculty(registry, "injection_screen_sense", {}, {})


def test_kernel_faculty_with_wrong_hash_refused():
    reg = FacultyRegistry()
    record = next(iter(build_kernel()["faculty_registry"].values()))
    record["code_hash"] = "00" * 32
    with pytest.raises(RegistryError):
        reg.load_kernel_faculty(record)


def test_executor_menu_matches_kernel():
    from chronarch_core.executor import _OPS
    assert set(_OPS) == set(OPCODE_MENU)
    for name, (kind, program) in SEED_FACULTIES.items():
        assert kind in ("sense", "modality"), name
        assert all(op in OPCODE_MENU for op in program), name

# ------------------------------------------------------------------ codec --

def test_floats_banned():
    with pytest.raises(CodecError):
        canonical_bytes({"x": 1.5})
    with pytest.raises(CodecError):
        chash("T", {"nested": [{"y": 0.1}]})


def test_domain_separation():
    body = {"same": "bytes"}
    assert chash("Proposal", body) != chash("Ballot", body)


def test_key_order_irrelevant():
    assert canonical_bytes({"a": 1, "b": 2}) == canonical_bytes({"b": 2, "a": 1})


def test_non_string_keys_rejected():
    with pytest.raises(CodecError):
        canonical_bytes({1: "x"})

# ---------------------------------------------------------------- rewards --

def test_reward_router_conserves_issuance():
    for slot in (0, 1, HALVING_INTERVAL_SLOTS - 1, HALVING_INTERVAL_SLOTS,
                 3 * HALVING_INTERVAL_SLOTS + 7):
        shares = route_slot_reward(slot)
        assert sum(shares.values()) == slot_issuance_chronons(slot)
        assert set(shares) == set(REWARD_ROUTER_BPS)


def test_issuance_halves():
    assert slot_issuance_chronons(0) == BASE_REWARD_PER_SLOT_CHRONONS
    assert slot_issuance_chronons(HALVING_INTERVAL_SLOTS) == BASE_REWARD_PER_SLOT_CHRONONS // 2

# -------------------------------------------------------------- constants --

def test_constant_shapes():
    assert len(HEALTH_COMPONENTS) == 9
    assert len(INTERFACES) == 10
    assert sum(REWARD_ROUTER_BPS.values()) == 10000
    assert len(SEED_FACULTIES) == 12
