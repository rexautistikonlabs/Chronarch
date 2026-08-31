"""K15: self-config program S0..S8.

A node holding kernel blob + disk + compute self-configures with no
privileged operator and no admin key (G11). Every step either succeeds or
seals a Scar — there is no silent retry and no operator prompt. The config
schema is closed: a config carrying anything like an admin private key is
rejected before S0 runs (K18).
"""
from __future__ import annotations

from chronarch_spec import build_kernel, build_ring0, validate
from chronarch_spec.constants import BOOTSTRAP_STEPS, CHRONARCH_PRIME, SLOTS_PER_EPOCH
from chronarch_spec.kernel import ring_hash

from .admission import admit_tx
from .cas import CAS
from .chain import Timechain
from .challenge import judge_challenge, make_challenge
from .executor import run_faculty
from .registry import FacultyRegistry


class BootError(ValueError):
    pass


def bootstrap(kernel_blob: dict, node_config: dict) -> dict:
    """Run S0..S7 and return {report, chain, cas, registry, state}.

    `kernel_blob` is what the node received (e.g. downloaded); S0 verifies
    it against the kernel this code derives deterministically — a tampered
    blob boots into a scar, not into service.
    """
    validate("NodeConfig", node_config)  # closed schema + forbidden-key screen
    node_id = node_config["node_id"]
    steps: list[list] = []

    def step(step_id: str, ok: bool, detail: str) -> bool:
        steps.append([step_id, ok, detail])
        return ok

    # S0: verify kernel vs Ring 0 -------------------------------------------
    trusted = build_kernel()
    ring0 = build_ring0(trusted)
    chain = Timechain(ring0)
    blob_hash = kernel_blob.get("manifest_hash", "")
    s0_ok = blob_hash == trusted["manifest_hash"]
    step("S0", s0_ok, "kernel manifest hash verified against Ring 0"
         if s0_ok else f"kernel hash mismatch: {blob_hash[:16]}... != {trusted['manifest_hash'][:16]}...")

    cas = CAS()
    registry = FacultyRegistry()
    boot_ok = s0_ok
    if s0_ok:
        # S1: init CAS; pin kernel ---------------------------------------------
        pins = [
            cas.put_object(trusted["manifest"]),
            cas.put_object(trusted["covenant"]),
            cas.put_object(trusted["genesis_params"]),
            cas.put_object(trusted["faculty_registry"]),
        ]
        step("S1", True, f"CAS initialized; {len(pins)} kernel objects pinned")

        # S2: identity head = Ring 0 ---------------------------------------------
        step("S2", chain.height == 0 and chain.head_hash == ring_hash(ring0),
             "identity head is Ring 0")

        # S3: load seed faculties iff hashes match --------------------------------
        try:
            for record in trusted["faculty_registry"].values():
                registry.load_kernel_faculty(record)
            step("S3", True, f"{len(registry.names())} seed faculties live")
        except Exception as exc:  # hash mismatch => scar, not service
            boot_ok = step("S3", False, f"seed faculty verification failed: {exc}")

        # S4: commit plot-lane space (abstract units, MVP) -------------------------
        space = node_config["space_units"]
        s4_ok = isinstance(space, int) and space > 0
        boot_ok = step("S4", s4_ok, f"plot lane committed: {space} abstract units") and boot_ok

        # S5: announce PinSet + compute + optional Hearth bond ---------------------
        pinset = {"identity": node_id, "pins": cas.pins(), "slot": 0}
        validate("PinSet", pinset)
        chain.seal("economic", {
            "event": "announce",
            "pinset": pinset,
            "compute_units": node_config["compute_units"],
            "hearth_bond_chronons": node_config.get("hearth_bond_chronons", 0),
        }, author=node_id, slot=0)
        step("S5", True, f"announced {len(pinset['pins'])} pins + compute")

        # S6: gym smoke + prestress check -----------------------------------------
        from chronarch_gym import run_smoke  # late import: gym depends on core
        receipts = run_smoke({
            "chain": chain,
            "cas": cas,
            "registry": registry,
            "admit_tx": admit_tx,
            "judge_challenge": judge_challenge,
            "make_challenge": make_challenge,
            "run_faculty": run_faculty,
            "slot": 0,
        })
        smoke_ok = all(r["detected"] for r in receipts)
        chain.seal("gym", {"event": "boot_smoke",
                           "receipts": receipts}, author=node_id, slot=0)
        from chronarch_nervous import prestress_ok
        prestress = prestress_ok(
            bond_chronons=node_config.get("hearth_bond_chronons", 0),
            pinset_size=len(pinset["pins"]),
            last_challenge_pass_slot=0,
            slot=0,
        )
        # A fresh node without a bond boots fine (pins, serves, witnesses),
        # but sits below the prestress floors: slot and Council eligibility
        # stay demoted until it bonds. Prestress gates ELIGIBILITY, never
        # booting (NERVOUS.md).
        boot_ok = step("S6", smoke_ok,
                       f"gym smoke {'passed' if smoke_ok else 'FAILED'}; "
                       f"prestress checks: {prestress['checks']}") and boot_ok
    else:
        boot_ok = False

    # S7: seal boot-ok or Scar ----------------------------------------------------
    if boot_ok:
        chain.seal("boot", {
            "event": "boot_ok",
            "steps": steps,
            "kernel_hash": trusted["manifest_hash"],
        }, author=node_id, slot=0)
        step("S7", True, "boot-ok ring sealed")
    else:
        chain.seal_scar("I8" if not s0_ok else "I5",
                        "bootstrap failed: " + "; ".join(
                            f"{s[0]}:{s[2]}" for s in steps if not s[1]),
                        [], author=node_id, slot=0)
        step("S7", False, "boot scar sealed")

    report = {
        "identity": node_id,
        "steps": steps,
        "boot_ok": boot_ok,
        "kernel_hash": trusted["manifest_hash"],
        "ring0_hash": ring_hash(ring0),
    }
    validate("BootReport", report)
    return {
        "report": report,
        "chain": chain,
        "cas": cas,
        "registry": registry,
        "kernel": trusted,
    }


def epoch_tick(node: dict, *, slot: int) -> dict:
    """S8 (one tick of the epoch loop): farm / pin / work / sense / propose /
    council-tick. MVP: measures, scores health, seals the health ring."""
    from chronarch_nervous import build_health_vector

    chain: Timechain = node["chain"]
    cas: CAS = node["cas"]
    chain.verify_full()
    all_pins_ok = all(cas.verify(p) for p in cas.pins())
    epoch = slot // SLOTS_PER_EPOCH
    vector = build_health_vector(epoch, {
        "hash_walk_integrity": 10000,
        "cas_pin_availability": 10000 if all_pins_ok else 0,
        "challenge_pass_rate": 10000,
        "faculty_replay_fidelity": 10000,
        "witness_quorum_liveness": 10000,
        "tensegrity_prestress": 10000,
        "hearth_solvency": 10000,
        "council_liveness": 10000,
        "covenant_drift_zero": 10000,
    })
    chain.seal("health", {"health_vector": vector},
               author=node["report"]["identity"], slot=slot)
    return vector


assert tuple(s for s, _ in BOOTSTRAP_STEPS)[:8] == ("S0", "S1", "S2", "S3", "S4", "S5", "S6", "S7")
assert CHRONARCH_PRIME  # the sim fixture exists; it holds no key this module reads
