"""Bootstrap S0..S8 (G11): kernel + disk + compute -> boot-ok with ZERO
extra keys. Tampered kernels scar; key-bearing configs never start."""
import pytest

from chronarch_core import bootstrap, epoch_tick
from chronarch_spec import SchemaError, build_kernel

CONFIG = {"node_id": "node-1", "space_units": 100, "compute_units": 8}


def test_boot_ok_with_zero_extra_keys():
    node = bootstrap(build_kernel(), dict(CONFIG))
    report = node["report"]
    assert report["boot_ok"], report["steps"]
    assert [s[0] for s in report["steps"]] == ["S0", "S1", "S2", "S3", "S4", "S5", "S6", "S7"]
    assert all(ok for _, ok, _ in report["steps"])
    # The config carried no key material of any kind — and cannot (closed schema).
    assert set(CONFIG) == {"node_id", "space_units", "compute_units"}
    # boot-ok ring sealed.
    rings = node["chain"].rings()
    assert any(r["ring_type"] == "boot" and r["body"]["event"] == "boot_ok" for r in rings)
    # Seed faculties live; the smoke drill's sneak record stays but is inert.
    registry = node["registry"]
    records = [registry.get(name) for name in registry.names()]
    live_primitives = [r for r in records if r["origin"] == "primitive" and r["status"] == "live"]
    assert len(live_primitives) == 12
    assert all(r["status"] == "inert" for r in records if r["origin"] == "authored")


def test_tampered_kernel_boots_into_scar_not_service():
    hostile = dict(build_kernel())
    hostile["manifest_hash"] = "00" * 32
    node = bootstrap(hostile, dict(CONFIG))
    assert not node["report"]["boot_ok"]
    scars = node["chain"].scars()
    assert scars and scars[-1]["body"]["interface"] == "I8"
    rings = node["chain"].rings()
    assert not any(r["ring_type"] == "boot" for r in rings)


def test_config_with_admin_key_never_starts():
    with pytest.raises(SchemaError):
        bootstrap(build_kernel(), dict(CONFIG, admin_private_key="s3cr3t"))
    with pytest.raises(SchemaError):
        bootstrap(build_kernel(), dict(CONFIG, helm_override=True))
    with pytest.raises(SchemaError):  # closed schema: unknown keys rejected
        bootstrap(build_kernel(), dict(CONFIG, ssh_key="whatever"))


def test_boot_with_hearth_bond():
    node = bootstrap(build_kernel(), dict(CONFIG, hearth_bond_chronons=10**15))
    assert node["report"]["boot_ok"]


def test_epoch_tick_publishes_health(node=None):
    node = bootstrap(build_kernel(), dict(CONFIG))
    vector = epoch_tick(node, slot=32)
    assert vector["epoch"] == 1
    assert vector["components"]["hash_walk_integrity"] == 10000
    rings = node["chain"].rings()
    assert rings[-1]["ring_type"] == "health"


def test_two_nodes_boot_identically():
    a = bootstrap(build_kernel(), {"node_id": "a", "space_units": 1, "compute_units": 1})
    b = bootstrap(build_kernel(), {"node_id": "b", "space_units": 9, "compute_units": 9})
    assert a["report"]["kernel_hash"] == b["report"]["kernel_hash"]
    assert a["report"]["ring0_hash"] == b["report"]["ring0_hash"]
    assert a["chain"].hash_at(0) == b["chain"].hash_at(0)
