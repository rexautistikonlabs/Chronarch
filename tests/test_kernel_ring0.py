"""Ring 0 / kernel hash tests.

The two named guarantees: (1) there is no admin key in the kernel — no
forbidden field, no key material, no code path that reads one; (2) the
kernel is deterministic: same code -> same manifest hash -> same Ring 0.
"""
import ast
from pathlib import Path

import pytest

from chronarch_spec import (
    SCHEMAS,
    SchemaError,
    build_kernel,
    build_ring0,
    canonical_bytes,
    ring_hash,
    screen_keys,
    validate,
)
from chronarch_spec.constants import KERNEL_MODULES, REJECT_LIST

REPO = Path(__file__).resolve().parent.parent
FIXTURE = Path(__file__).resolve().parent / "fixtures" / "genesis_hashes.json"


def test_kernel_is_deterministic():
    k1, k2 = build_kernel(), build_kernel()
    assert k1["manifest_hash"] == k2["manifest_hash"]
    assert ring_hash(build_ring0(k1)) == ring_hash(build_ring0(k2))


def test_ring0_seals_the_kernel():
    kernel = build_kernel()
    ring0 = build_ring0(kernel)
    assert ring0["height"] == 0 and ring0["prev_ring_hash"] == ""
    body = ring0["body"]
    assert body["kernel_manifest_hash"] == kernel["manifest_hash"]
    assert body["covenant_hash"] == kernel["manifest"]["covenant_hash"]
    assert body["genesis_params_hash"] == kernel["manifest"]["genesis_params_hash"]
    assert body["faculty_registry_hash"] == kernel["manifest"]["faculty_registry_hash"]


def test_golden_genesis_hashes():
    """Genesis hashes are pinned. Changing them is a hard fork (G7/M1) —
    if this test fails you either broke determinism or changed the kernel;
    the fixture only moves with an intentional, reviewed kernel change."""
    import json
    golden = json.loads(FIXTURE.read_text())
    kernel = build_kernel()
    assert kernel["manifest_hash"] == golden["kernel_manifest_hash"]
    assert ring_hash(build_ring0(kernel)) == golden["ring0_hash"]
    assert kernel["manifest"]["covenant_hash"] == golden["covenant_hash"]


def test_all_18_kernel_modules_bound():
    kernel = build_kernel()
    assert set(kernel["manifest"]["modules"]) == set(KERNEL_MODULES)
    for name, digest in kernel["manifest"]["modules"].items():
        assert len(digest) == 64, name


def test_no_admin_key_in_kernel_objects():
    """No dict key anywhere in the kernel blob matches a forbidden token.
    (The reject list itself appears as string VALUES — that is the list of
    what to reject, not a field.)"""
    kernel = build_kernel()
    screen_keys(kernel["manifest"])
    screen_keys(kernel["module_contents"])
    screen_keys(kernel["genesis_params"])
    screen_keys(kernel["faculty_registry"])
    ring0 = build_ring0(kernel)
    screen_keys(ring0)


def test_reject_list_is_in_the_kernel():
    kernel = build_kernel()
    assert list(REJECT_LIST) == kernel["manifest"]["reject_list"]
    assert set(REJECT_LIST) == {"admin_key", "founder_key", "helm_override", "ai_self_enact"}


def test_no_schema_carries_a_forbidden_field():
    """If a schema field like admin_key appears, it is a bug — asserted."""
    for name, (fields, _required) in SCHEMAS.items():
        assert not any(tok in name.lower() for tok in ("adminkey", "founderkey", "helmoverride")), name
        probe = {field: None for field in fields}
        screen_keys(probe)  # raises if any field name matches a token


def test_schema_rejects_admin_key_field_injection():
    kernel = build_kernel()
    ring0 = build_ring0(kernel)
    hostile = dict(ring0)
    hostile["body"] = {**ring0["body"], "admin_key": "0" * 64}
    with pytest.raises(SchemaError):
        validate("Ring", hostile)
    # Nested injection is caught too.
    hostile2 = dict(ring0)
    hostile2["body"] = {**ring0["body"], "extra": {"deep": {"helm_override": True}}}
    with pytest.raises(SchemaError):
        validate("Ring", hostile2)


def test_node_config_cannot_carry_key_material():
    """G11/K18: no bootstrap path reads an admin private key."""
    with pytest.raises(SchemaError):
        validate("NodeConfig", {"node_id": "n1", "space_units": 1,
                                "compute_units": 1, "admin_private_key": "s3cr3t"})
    with pytest.raises(SchemaError):
        validate("NodeConfig", {"node_id": "n1", "space_units": 1,
                                "compute_units": 1, "founder_key": "s3cr3t"})
    with pytest.raises(SchemaError):  # closed schema: unknown keys rejected too
        validate("NodeConfig", {"node_id": "n1", "space_units": 1,
                                "compute_units": 1, "operator_password": "hunter2"})


def test_no_source_identifier_implements_an_override():
    """AST scan of every package: no function, class, or assigned name
    implements admin_key / founder_key / helm_override / ai_self_enact /
    execute_upgrade. Screening CONSTANTS naming the tokens are string
    values, not identifiers, and do not trip this."""
    banned = ("admin_key", "founder_key", "helm_override", "ai_self_enact", "execute_upgrade")
    offenders = []
    for source in REPO.glob("packages/*/src/**/*.py"):
        tree = ast.parse(source.read_text(), filename=str(source))
        for node in ast.walk(tree):
            names = []
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                names.append(node.name)
            elif isinstance(node, ast.Name):
                names.append(node.id)
            elif isinstance(node, ast.Attribute):
                names.append(node.attr)
            elif isinstance(node, ast.arg):
                names.append(node.arg)
            for name in names:
                lowered = name.lower()
                if any(tok in lowered for tok in banned):
                    offenders.append(f"{source}:{node.lineno}:{name}")
    assert not offenders, offenders


def test_canonical_bytes_stable_for_kernel():
    kernel = build_kernel()
    assert canonical_bytes(kernel["manifest"]) == canonical_bytes(build_kernel()["manifest"])
