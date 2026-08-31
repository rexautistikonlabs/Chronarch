"""Block 0 kernel: deterministic KernelManifest + Ring 0.

Genesis is a complete kernel (K1..K18). A node holding the kernel blob plus
disk and compute self-configures with no privileged operator (G11). The
manifest binds every module's STRUCTURED content by hash; Ring 0 seals the
manifest, the covenant, and the genesis params.

There is no admin key material anywhere in this module, and no code path
that reads one (K18). Tests assert both.
"""
from __future__ import annotations

from . import constants as C
from .codec import chash
from .covenant import covenant_object
from .schemas import validate


def genesis_params() -> dict:
    """K3 + charter numbers: every FROZEN-MVP consensus parameter."""
    return {
        "slots_per_epoch": C.SLOTS_PER_EPOCH,
        "witness_k": C.WITNESS_K,
        "witness_n": C.WITNESS_N,
        "chronons_per_chronos": C.CHRONONS_PER_CHRONOS,
        "premine_chronons": C.PREMINE_CHRONONS,
        "base_reward_per_slot_chronons": C.BASE_REWARD_PER_SLOT_CHRONONS,
        "halving_interval_slots": C.HALVING_INTERVAL_SLOTS,
        "reward_router_bps": dict(C.REWARD_ROUTER_BPS),
        "hearth_bond_leg_bps": C.HEARTH_BOND_LEG_BPS,
        "hearth_liquidity_leg_bps": C.HEARTH_LIQUIDITY_LEG_BPS,
        "unbond_delay_slots": C.UNBOND_DELAY_SLOTS,
        "salience_clamp_min_bps": C.SALIENCE_CLAMP_MIN_BPS,
        "salience_clamp_max_bps": C.SALIENCE_CLAMP_MAX_BPS,
        "council_approve_weight_num": C.COUNCIL_APPROVE_WEIGHT_NUM,
        "council_approve_weight_den": C.COUNCIL_APPROVE_WEIGHT_DEN,
        "voting_window_slots": C.VOTING_WINDOW_SLOTS,
        "activation_delay_slots": C.ACTIVATION_DELAY_SLOTS,
        "min_council_bond_chronons": C.MIN_COUNCIL_BOND_CHRONONS,
        "min_pinset_size": C.MIN_PINSET_SIZE,
        "max_challenge_gap_slots": C.MAX_CHALLENGE_GAP_SLOTS,
        "community_proposal_deposit_chronons": C.COMMUNITY_PROPOSAL_DEPOSIT_CHRONONS,
        "genesis_timestamp": C.GENESIS_TIMESTAMP,
        "pq_reserved": None,
    }


def faculty_registry() -> dict:
    """K5: seed faculties as inert-until-verified primitive programs.

    Every seed faculty is origin=primitive and ships in the kernel; its
    code_hash commits to (name, kind, program). Authored faculties do not
    exist at genesis and can only ever reach the protocol path through
    Proposal + Ballot (M3, G14).
    """
    registry = {}
    for name, (kind, program) in sorted(C.SEED_FACULTIES.items()):
        record = {
            "name": name,
            "kind": kind,
            "origin": "primitive",
            "program": list(program),
            "status": "live",
        }
        code_hash = chash("Faculty", {k: record[k] for k in ("name", "kind", "origin", "program")})
        record["code_hash"] = code_hash
        validate("Faculty", record)
        registry[name] = record
    return registry


def _module_contents() -> dict:
    """Structured content for each kernel module K1..K18."""
    return {
        "K1_covenant_and_genesis_law": covenant_object(),
        "K2_codec_hash_spec_schemas": {
            "hash_algo": C.HASH_ALGO,
            "domain_prefix": f"{C.PROTOCOL}/{C.PROTOCOL_VERSION}/",
            "encoding": "canonical-json-sorted-ascii",
            "floats": "banned",
            "schemas_closed": True,
        },
        "K3_chronos_economic_params": genesis_params(),
        "K4_dual_farm_spec": {
            "lanes": ["plot_lane", "cambium_cas_lane"],
            "space_units": "abstract-until-phase-4",
            "plots_store": "space proofs only — never rings, embeddings, or weights",
            "pin_failure_is": "nervous event (I3), not a lost file",
        },
        "K5_bootstrap_faculties_opcode_menu": {
            "opcode_menu": list(C.OPCODE_MENU),
            "seed_faculties": sorted(C.SEED_FACULTIES),
            "executable_llm_code": False,
        },
        "K6_cambium_machine": {
            "drafts": "organs and proposals",
            "may_enact": list(C.MINOR_CLASSES),
            "may_not_enact": list(C.MAJOR_CLASS_IDS),
        },
        "K7_nervous_spec": {
            "interfaces": [list(pair) for pair in C.INTERFACES],
            "prestress_floors": {
                "min_bond_chronons": C.MIN_COUNCIL_BOND_CHRONONS,
                "min_pinset_size": C.MIN_PINSET_SIZE,
                "max_challenge_gap_slots": C.MAX_CHALLENGE_GAP_SLOTS,
            },
            "healing": "restore prestress without cutting tension members",
        },
        "K8_immune_gym_catalog": {
            "target_classes": list(C.GYM_TARGET_CLASSES),
            "catalog": list(C.GYM_CASE_CATALOG),
            "external_targets": "rejected (G12)",
        },
        "K9_challenge_engine_types": {
            "kinds": ["replay", "retrieval", "plot", "pin"],
            "advisory_poq_dims": C.POQ_ADVISORY_DIMS,
            "advisory_poq_max": C.POQ_ADVISORY_MAX,
            "consensus_uses": "attestations (G10)",
        },
        "K10_continuum_identity_split": {
            "identity_chain": "one per agent",
            "task_chains": "continuum heads, pointers only (G8)",
        },
        "K11_witness_rule": {"k": C.WITNESS_K, "n": C.WITNESS_N},
        "K12_reward_router": dict(C.REWARD_ROUTER_BPS),
        "K13_hearth": {
            "split_bps": [C.HEARTH_BOND_LEG_BPS, C.HEARTH_LIQUIDITY_LEG_BPS],
            "unbond_delay_slots": C.UNBOND_DELAY_SLOTS,
            "salience_clamp_bps": [C.SALIENCE_CLAMP_MIN_BPS, C.SALIENCE_CLAMP_MAX_BPS],
            "salience_applies_to": "retrieval ranking only — never Challenge or Ballot validity",
        },
        "K14_council_charter_proposal_machine": {
            "invariant": C.SLOGANS["change"],
            "major_classes": [list(pair) for pair in C.MAJOR_CLASSES],
            "approve": "yes_weight*den >= eligible_weight*num AND yes_seats > eligible_seats/2",
            "weight_num": C.COUNCIL_APPROVE_WEIGHT_NUM,
            "weight_den": C.COUNCIL_APPROVE_WEIGHT_DEN,
            "voting_window_slots": C.VOTING_WINDOW_SLOTS,
            "activation_delay_slots": C.ACTIVATION_DELAY_SLOTS,
            "only_upgrade_path": "proposal_ring -> gym+health report -> ballots -> tally -> result ring -> activation at height H",
        },
        "K15_self_config_program": {
            "steps": [list(pair) for pair in C.BOOTSTRAP_STEPS],
            "privileged_key_inputs": "none — no bootstrap path reads one (G11)",
        },
        "K16_dummymind_executor": {
            "kind": "deterministic primitive interpreter",
            "runs_only": "live-registry faculty hashes (G3)",
            "authored_code": "inert until activation (G4)",
        },
        "K17_attribution": {
            "cognition_lineage": "Cyberphysics / Cypher Tempre primitives (cyberphysicsai/cypher-tempre-genesis, cyberphysics.ai)",
            "health_lineage": "Rex Autistikon method + biotensegrity principles (analogical, not clinical)",
            "body_lineage": "Chia-family Proof of Space and Time",
        },
        "K18_reject_list": {
            "reject": list(C.REJECT_LIST),
            "forbidden_key_tokens": list(C.FORBIDDEN_KEY_TOKENS),
            "note": "no AdminKey / FounderKey / HelmOverride object exists; a schema field like that is a bug",
        },
    }


def build_kernel() -> dict:
    """Build the deterministic Block 0 kernel blob."""
    contents = _module_contents()
    assert tuple(sorted(contents)) == tuple(sorted(C.KERNEL_MODULES))

    modules = {name: chash(f"Kernel:{name}", content) for name, content in sorted(contents.items())}
    covenant_hash = chash("Covenant", covenant_object())
    genesis_params_hash = chash("GenesisParams", genesis_params())
    registry = faculty_registry()
    faculty_registry_hash = chash("FacultyRegistry", registry)

    manifest = {
        "protocol": C.PROTOCOL,
        "version": C.PROTOCOL_VERSION,
        "modules": modules,
        "covenant_hash": covenant_hash,
        "genesis_params_hash": genesis_params_hash,
        "faculty_registry_hash": faculty_registry_hash,
        "reject_list": list(C.REJECT_LIST),
    }
    validate("KernelManifest", manifest)

    return {
        "manifest": manifest,
        "manifest_hash": chash("KernelManifest", manifest),
        "module_contents": contents,
        "covenant": covenant_object(),
        "genesis_params": genesis_params(),
        "faculty_registry": registry,
    }


def build_ring0(kernel: dict) -> dict:
    """Ring 0: the genesis ring sealing the kernel. Deterministic, no keys."""
    ring0 = {
        "ring_type": "genesis",
        "height": 0,
        "slot": 0,
        "prev_ring_hash": "",
        "author": C.CHRONARCH_PRIME,
        "body": {
            "kernel_manifest_hash": kernel["manifest_hash"],
            "covenant_hash": kernel["manifest"]["covenant_hash"],
            "genesis_params_hash": kernel["manifest"]["genesis_params_hash"],
            "faculty_registry_hash": kernel["manifest"]["faculty_registry_hash"],
            "genesis_timestamp": C.GENESIS_TIMESTAMP,
            "slogans": dict(C.SLOGANS),
        },
        "witnesses": [],
    }
    validate("Ring", ring0)
    return ring0


def ring_hash(ring: dict) -> str:
    return chash("Ring", ring)
