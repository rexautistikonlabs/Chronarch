"""K2: object schemas.

Design rules:
  * Schemas are CLOSED: unknown fields are rejected. A field named admin_key
    cannot ride along "for later" (K18/G17).
  * Every object is screened recursively against FORBIDDEN_KEY_TOKENS —
    including nested bodies, tx payloads and node configs.
  * There is NO AdminKey, FounderKey, or HelmOverride object. If a schema
    field like that appears, it is a bug; tests assert it never does.
"""
from __future__ import annotations

import re

from .codec import canonical_bytes
from .constants import (
    FORBIDDEN_KEY_TOKENS,
    GYM_TARGET_CLASSES,
    HEALTH_COMPONENTS,
    INTERFACE_IDS,
    MAJOR_CLASS_IDS,
    RING_TYPES,
)


class SchemaError(ValueError):
    """Raised when an object fails schema validation or key screening."""


_HASH_RE = re.compile(r"^[0-9a-f]{64}$")


# Tokens are matched both verbatim and with separators stripped, so spelling
# games (adminKey, admin-key, ADMIN__KEY) do not slip past the screen.
_STRIP_RE = re.compile(r"[^a-z0-9]+")
_NORMALIZED_TOKENS = tuple(
    (token, _STRIP_RE.sub("", token)) for token in FORBIDDEN_KEY_TOKENS
)


def screen_keys(obj: object, path: str = "$") -> None:
    """Recursively reject any dict key containing a forbidden token (K18)."""
    if isinstance(obj, dict):
        for key, value in obj.items():
            lowered = str(key).lower()
            normalized = _STRIP_RE.sub("", lowered)
            for token, bare in _NORMALIZED_TOKENS:
                if token in lowered or bare in normalized:
                    raise SchemaError(
                        f"forbidden key {key!r} at {path} (token {token!r}, K18/G17)"
                    )
            screen_keys(value, f"{path}.{key}")
    elif isinstance(obj, (list, tuple)):
        for i, item in enumerate(obj):
            screen_keys(item, f"{path}[{i}]")


def _is_hash(value: object) -> bool:
    return isinstance(value, str) and bool(_HASH_RE.match(value))


def _check_type(name: str, field: str, spec: str, value: object) -> None:
    ok = {
        "str": lambda v: isinstance(v, str) and not isinstance(v, bool),
        "int": lambda v: isinstance(v, int) and not isinstance(v, bool),
        "bool": lambda v: isinstance(v, bool),
        "hash": _is_hash,
        "hash_or_empty": lambda v: v == "" or _is_hash(v),
        "list": lambda v: isinstance(v, (list, tuple)),
        "dict": lambda v: isinstance(v, dict),
        "any": lambda v: True,
        "none_or_str": lambda v: v is None or isinstance(v, str),
    }[spec]
    if not ok(value):
        raise SchemaError(f"{name}.{field}: expected {spec}, got {value!r}")


# object name -> (fields, required)
SCHEMAS: dict[str, tuple[dict[str, str], tuple[str, ...]]] = {
    "Ring": (
        {
            "ring_type": "str",
            "height": "int",
            "slot": "int",
            "prev_ring_hash": "hash_or_empty",
            "author": "str",
            "body": "dict",
            "witnesses": "list",  # k-of-n head witness commitments (K11)
        },
        ("ring_type", "height", "slot", "prev_ring_hash", "author", "body", "witnesses"),
    ),
    "Faculty": (
        {
            "name": "str",
            "kind": "str",  # sense | modality
            "origin": "str",  # primitive | authored
            "program": "list",  # opcode tuple for primitive faculties
            "code_hash": "hash",
            "status": "str",  # inert | live | hibernated
        },
        ("name", "kind", "origin", "program", "code_hash", "status"),
    ),
    "Scar": (
        {
            "interface": "str",  # I1..I10
            "cause": "str",
            "evidence_hashes": "list",
            "restriction_hash": "hash_or_empty",
        },
        ("interface", "cause", "evidence_hashes"),
    ),
    "Challenge": (
        {
            "challenge_id": "str",
            "target_identity": "str",
            "kind": "str",  # replay | retrieval | plot | pin
            "input_hash": "hash",
            "expected_commitment": "hash",
            "slot": "int",
        },
        ("challenge_id", "target_identity", "kind", "input_hash", "expected_commitment", "slot"),
    ),
    "ChallengeResult": (
        {
            "challenge_id": "str",
            "passed": "bool",
            "replay_output_hash": "hash",
            "attestors": "list",
        },
        ("challenge_id", "passed", "replay_output_hash", "attestors"),
    ),
    "PinSet": (
        {
            "identity": "str",
            "pins": "list",  # CAS hashes this node commits to serve
            "slot": "int",
        },
        ("identity", "pins", "slot"),
    ),
    "EmbeddingCommitment": (
        {
            "identity": "str",
            "space": "str",
            "commitment": "hash",  # embeddings are not consensus; commitments are (G9)
            "slot": "int",
        },
        ("identity", "space", "commitment", "slot"),
    ),
    "AgentIdentity": (
        {
            "identity": "str",
            "genesis_ring_hash": "hash",
            "head_ring_hash": "hash",
            "head_height": "int",
            "pq_reserved": "none_or_str",
        },
        ("identity", "genesis_ring_hash", "head_ring_hash", "head_height"),
    ),
    "FarmerValidator": (
        {
            "identity": "str",
            "space_units": "int",
            "compute_units": "int",
            "pinset_size": "int",
            "bond_chronons": "int",
            "last_challenge_pass_slot": "int",
        },
        ("identity", "space_units", "compute_units", "pinset_size", "bond_chronons", "last_challenge_pass_slot"),
    ),
    "KernelManifest": (
        {
            "protocol": "str",
            "version": "str",
            "modules": "dict",  # K1..K18 -> content hash
            "covenant_hash": "hash",
            "genesis_params_hash": "hash",
            "faculty_registry_hash": "hash",
            "reject_list": "list",
        },
        ("protocol", "version", "modules", "covenant_hash", "genesis_params_hash", "faculty_registry_hash", "reject_list"),
    ),
    "BootReport": (
        {
            "identity": "str",
            "steps": "list",  # (step_id, ok, detail)
            "boot_ok": "bool",
            "kernel_hash": "hash",
            "ring0_hash": "hash",
        },
        ("identity", "steps", "boot_ok", "kernel_hash", "ring0_hash"),
    ),
    "GymCase": (
        {
            "case_id": "str",
            "attack": "str",  # from GYM_CASE_CATALOG
            "target_class": "str",  # MUST be a Chronarch class (G12)
            "target": "str",
            "payload": "dict",
        },
        ("case_id", "attack", "target_class", "target", "payload"),
    ),
    "GymReceipt": (
        {
            "case_id": "str",
            "detected": "bool",
            "rejected": "bool",
            "scar_hash": "hash_or_empty",
            "detail": "str",
        },
        ("case_id", "detected", "rejected", "scar_hash", "detail"),
    ),
    "HearthPosition": (
        {
            "identity": "str",
            "locked_chronons": "int",
            "bond_leg_chronons": "int",
            "liquidity_leg_chronons": "int",
            "lock_slot": "int",
            "unbond_request_slot": "int",  # -1 when not unbonding
            "slashed": "bool",
            "quarantined": "bool",
        },
        ("identity", "locked_chronons", "bond_leg_chronons", "liquidity_leg_chronons", "lock_slot", "unbond_request_slot", "slashed", "quarantined"),
    ),
    "HealthVector": (
        {
            "epoch": "int",
            "components": "dict",  # HEALTH_COMPONENTS -> 0..10000 bps
            "total_bps": "int",
        },
        ("epoch", "components", "total_bps"),
    ),
    "RestrictionState": (
        {
            "interface": "str",
            "restricted": "bool",
            "magnitude_bps": "int",
            "measured_slot": "int",
            "prediction": "dict",  # interface -> predicted strain bps
        },
        ("interface", "restricted", "magnitude_bps", "measured_slot", "prediction"),
    ),
    "TransmissionReport": (
        {
            "restriction_hash": "hash",
            "predicted": "dict",  # interface -> predicted strain bps
            "observed": "dict",  # interface -> observed strain bps
            "model_falsified": "bool",  # failed prediction is itself a scar (G18)
        },
        ("restriction_hash", "predicted", "observed", "model_falsified"),
    ),
    "Proposal": (
        {
            "proposal_id": "str",
            "proposer": "str",  # chronarch | councilor:<id> | community:<id>
            "major_class": "str",  # M1..M9
            "spec_hash": "hash",  # inert spec blob in CAS — never executable here
            "changes": "dict",  # param path -> new value (inert description)
            "deposit_chronons": "int",
            "transmission_report_hash": "hash_or_empty",
            "gym_report_hash": "hash_or_empty",
            "submitted_slot": "int",
        },
        ("proposal_id", "proposer", "major_class", "spec_hash", "changes", "deposit_chronons", "submitted_slot"),
    ),
    "Ballot": (
        {
            "proposal_id": "str",
            "seat": "str",
            "vote": "str",  # yes | no | abstain
            "bond_weight_chronons": "int",
            "cast_slot": "int",
        },
        ("proposal_id", "seat", "vote", "bond_weight_chronons", "cast_slot"),
    ),
    "CouncilSeat": (
        {
            "seat": "str",
            "identity": "str",
            "bond_chronons": "int",
            "eligible": "bool",
        },
        ("seat", "identity", "bond_chronons", "eligible"),
    ),
    "NodeConfig": (
        {
            "node_id": "str",
            "space_units": "int",
            "compute_units": "int",
            "hearth_bond_chronons": "int",  # optional bond, 0 for none
        },
        ("node_id", "space_units", "compute_units"),
    ),
    "Header": (
        {
            "prev_header_hash": "hash_or_empty",
            "height": "int",
            "slot": "int",
            "economic_state_root": "hash",
            "cognitive_state_root": "hash",
            "plot_challenge_proof": "hash",
            "hearth_root": "hash",
            "council_root": "hash",
            "poq_attestation_root": "hash",
            "cas_availability_root": "hash",
            "gym_attestation_root": "hash",
            "nervous_root": "hash",
            "witness_root": "hash",
            "pq_reserved": "none_or_str",
        },
        (
            "prev_header_hash", "height", "slot", "economic_state_root",
            "cognitive_state_root", "plot_challenge_proof", "hearth_root",
            "council_root", "poq_attestation_root", "cas_availability_root",
            "gym_attestation_root", "nervous_root", "witness_root",
        ),
    ),
}


def validate(obj_type: str, obj: dict) -> dict:
    """Validate an object against its closed schema. Returns the object."""
    if obj_type not in SCHEMAS:
        raise SchemaError(f"unknown object type: {obj_type}")
    if not isinstance(obj, dict):
        raise SchemaError(f"{obj_type}: expected dict, got {type(obj).__name__}")

    # Forbidden-key screen runs FIRST and over the whole tree (K18).
    screen_keys(obj)
    # Codec check: no floats, no exotic types anywhere.
    canonical_bytes(obj)

    fields, required = SCHEMAS[obj_type]
    for field in obj:
        if field not in fields:
            raise SchemaError(f"{obj_type}: unknown field {field!r} (schemas are closed)")
    for field in required:
        if field not in obj:
            raise SchemaError(f"{obj_type}: missing required field {field!r}")
    for field, value in obj.items():
        _check_type(obj_type, field, fields[field], value)

    # Domain-specific refinements.
    if obj_type == "Ring" and obj["ring_type"] not in RING_TYPES:
        raise SchemaError(f"Ring: unknown ring_type {obj['ring_type']!r}")
    if obj_type == "Scar" and obj["interface"] not in INTERFACE_IDS:
        raise SchemaError(f"Scar: unknown interface {obj['interface']!r}")
    if obj_type == "GymCase" and obj["target_class"] not in GYM_TARGET_CLASSES:
        raise SchemaError(
            f"GymCase: target_class {obj['target_class']!r} is not a Chronarch "
            "class — Immune Gym may attack Chronarch targets only (G12)"
        )
    if obj_type == "Proposal" and obj["major_class"] not in MAJOR_CLASS_IDS:
        raise SchemaError(f"Proposal: unknown major_class {obj['major_class']!r}")
    if obj_type == "Ballot" and obj["vote"] not in ("yes", "no", "abstain"):
        raise SchemaError(f"Ballot: bad vote {obj['vote']!r}")
    if obj_type == "HealthVector":
        for comp in HEALTH_COMPONENTS:
            if comp not in obj["components"]:
                raise SchemaError(f"HealthVector: missing component {comp!r}")
        for comp, score in obj["components"].items():
            if comp not in HEALTH_COMPONENTS:
                raise SchemaError(f"HealthVector: unknown component {comp!r}")
            if not isinstance(score, int) or isinstance(score, bool) or not 0 <= score <= 10000:
                raise SchemaError(f"HealthVector: bad score for {comp!r}: {score!r}")
    return obj
