"""ComputeReceipt + attestation (Phase 15).

COMPUTE_SHARE is paid only for work that actually happened and re-verifies:

  * a **DummyMind** job — a live-registry faculty replayed on its input; the
    recomputed output must hash to the receipt's committed output_hash; or
  * a **Gym** job — a named Immune Gym case run against a Chronarch fixture
    whose oracle must pass (the organism detected the attack).

Everything else is refused. An LLM draft, a silo artifact, and a black-hat /
prevention-catalog run carry no replayable deterministic computation (they are
inert / opaque / non-executable by construction), so they can never be a
payable compute job — the closed job_kind set alone rejects them, and a
fabricated output_hash never survives replay.

Chronos is blood, not conscience (G2): a ComputeReceipt has no chronos field,
no vote, and no faculty-activation field. The closed schema rejects any such
key, and attestation never touches Challenge or Ballot legality.

This mirrors the challenge-by-replay pattern (make_challenge/judge_challenge)
and reuses the frozen gym oracle (chronarch_gym.run_case); it changes neither.
"""
from __future__ import annotations

from chronarch_spec import canonical_bytes, chash, screen_keys
from chronarch_spec.constants import GYM_CASE_CATALOG, GYM_TARGET_CLASSES

# Outcome codes.
COMPUTE_OK = "COMPUTE_OK"
COMPUTE_UNATTESTED = "COMPUTE_UNATTESTED"
GYM_TARGET_FOREIGN = "GYM_TARGET_FOREIGN"

JOB_KINDS = ("dummymind", "gym")

# Closed schema (schemas.py is frozen, so this is validated locally the way
# chronarch_farm.plots.verify_plot_commitment validates a SpaceSeal).
_REQUIRED_FIELDS = ("worker", "job_kind", "job_id", "input_hash",
                    "output_hash", "evidence_refs")
_OPTIONAL_FIELDS = ("slot",)
_ALLOWED_FIELDS = _REQUIRED_FIELDS + _OPTIONAL_FIELDS


class ComputeError(ValueError):
    pass


class ForeignGymTargetError(ComputeError):
    """A gym job named a non-Chronarch target (G12) — no receipt is built."""


# -- closed-schema validation ----------------------------------------------
def verify_compute_receipt(receipt: dict) -> dict:
    """Validate the closed ComputeReceipt schema. Raises ComputeError on any
    hole. No chronos / vote / faculty-activation field can appear — an extra
    key fails the closed key-set check, and K18 tokens fail screen_keys."""
    if not isinstance(receipt, dict):
        raise ComputeError("compute receipt must be a dict")
    screen_keys(receipt)  # K18 forbidden-key screen (admin_key & kin)
    keys = set(receipt)
    missing = set(_REQUIRED_FIELDS) - keys
    if missing:
        raise ComputeError(f"compute receipt missing fields: {sorted(missing)}")
    extra = keys - set(_ALLOWED_FIELDS)
    if extra:
        raise ComputeError(f"compute receipt has forbidden fields: {sorted(extra)} "
                           "(no chronos, no vote, no faculty activation)")
    if receipt["job_kind"] not in JOB_KINDS:
        raise ComputeError(f"job_kind must be one of {JOB_KINDS}, not "
                           f"{receipt['job_kind']!r} (an LLM draft / silo / hat run "
                           "is not a payable compute job)")
    for field in ("worker", "job_id", "input_hash", "output_hash"):
        if not isinstance(receipt[field], str) or not receipt[field]:
            raise ComputeError(f"{field} must be a non-empty string")
    if not isinstance(receipt["evidence_refs"], list) or not all(
            isinstance(r, str) for r in receipt["evidence_refs"]):
        raise ComputeError("evidence_refs must be a list of strings")
    if "slot" in receipt and not (receipt["slot"] is None or isinstance(receipt["slot"], int)):
        raise ComputeError("slot must be an int or null")
    canonical_bytes(receipt)  # bans floats / exotic types
    return receipt


# -- receipt construction (the honest path) --------------------------------
def _compute_output_hash(output) -> str:
    return chash("ComputeOutput", output)


def make_compute_receipt(worker: str, job_kind: str, job_id: str, *,
                         node=None, inputs: dict | None = None,
                         slot: int | None = None,
                         target: str = "chronarch-prime",
                         target_class: str = "chronarch_fixture") -> dict:
    """Build a genuine, attestable ComputeReceipt by actually doing the work.

    dummymind: needs `node` (for its live registry + CAS) and `inputs`; stores
    the input in the node CAS, replays the faculty, and commits the output.
    gym: runs the named case in an isolated Chronarch fixture and commits the
    oracle verdict.

    This is the ONLY sanctioned builder — there is no backdoor flag that marks
    an unattested receipt as attested; a receipt built here re-verifies under
    attest_compute.
    """
    if job_kind == "dummymind":
        if node is None or inputs is None:
            raise ComputeError("a dummymind receipt needs node= and inputs=")
        from .executor import ExecutorError, run_faculty
        from .registry import InertFacultyError, RegistryError
        input_hash = node.cas.put_object(inputs)
        try:
            output = run_faculty(node.registry, job_id, inputs, {})
        except (InertFacultyError, RegistryError, ExecutorError, KeyError, ValueError) as exc:
            raise ComputeError(
                f"faculty {job_id!r} is not a replayable live-registry job: {exc}") from None
        receipt = {
            "worker": worker, "job_kind": "dummymind", "job_id": job_id,
            "input_hash": input_hash, "output_hash": _compute_output_hash(output),
            "evidence_refs": [input_hash], "slot": slot,
        }
    elif job_kind == "gym":
        if target_class not in GYM_TARGET_CLASSES:
            # G12: a foreign gym target yields NO receipt.
            raise ForeignGymTargetError(
                f"gym target {target_class!r} is not a Chronarch class "
                f"(allowed: {GYM_TARGET_CLASSES})")
        verdict, _ = _run_gym_oracle(job_id, target, target_class,
                                     slot if slot is not None else 0)
        receipt = {
            "worker": worker, "job_kind": "gym", "job_id": job_id,
            "input_hash": chash("ComputeInput",
                                {"attack": job_id, "target_class": target_class}),
            "output_hash": _compute_output_hash(verdict),
            "evidence_refs": [], "slot": slot,
        }
    else:
        raise ComputeError(f"job_kind must be one of {JOB_KINDS}")
    return verify_compute_receipt(receipt)


# -- attestation ------------------------------------------------------------
def _result(ok: bool, code: str, detail: str = "") -> dict:
    return {"ok": ok, "code": code, "detail": detail}


def attest_compute(receipt, node_or_fixture) -> dict:
    """Attest one ComputeReceipt. Returns {ok, code, detail}; `code` is
    COMPUTE_OK or COMPUTE_UNATTESTED. Never raises on a bad receipt — an
    unverifiable job is COMPUTE_UNATTESTED, not an exception.

    (A foreign gym target is refused earlier, at build time, by
    make_compute_receipt — GYM_TARGET_FOREIGN, no receipt — so the receipt
    schema carries no target field and attestation always runs against a
    Chronarch fixture.)

    dummymind: the job_id must be a LIVE-registry faculty; the input is fetched
    from the node's CAS by input_hash and the faculty replayed — the recomputed
    output must hash to the committed output_hash.
    gym: the named case is run in an isolated Chronarch fixture; its oracle must
    pass and the verdict must hash to the committed output_hash.
    """
    try:
        verify_compute_receipt(receipt)
    except ComputeError as exc:
        return _result(False, COMPUTE_UNATTESTED, f"malformed receipt: {exc}")

    if receipt["job_kind"] == "dummymind":
        return _attest_dummymind(receipt, node_or_fixture)
    return _attest_gym(receipt)


def _attest_dummymind(receipt: dict, node) -> dict:
    from .executor import run_faculty
    from .registry import InertFacultyError, RegistryError
    faculty = receipt["job_id"]
    if node is None or not hasattr(node, "registry") or not hasattr(node, "cas"):
        return _result(False, COMPUTE_UNATTESTED, "no node registry/CAS to replay against")
    if faculty not in node.registry.names():
        return _result(False, COMPUTE_UNATTESTED,
                       f"faculty {faculty!r} is not in the live registry")
    from .cas import CASMiss
    try:
        raw = node.cas.get(receipt["input_hash"])
    except CASMiss:
        raw = None
    if raw is None:  # a missing input (an I3 miss) cannot be replayed
        return _result(False, COMPUTE_UNATTESTED, "input object is not retrievable")
    import json
    try:
        inputs = json.loads(raw)
    except (ValueError, TypeError):
        return _result(False, COMPUTE_UNATTESTED, "input object is not decodable")
    try:
        output = run_faculty(node.registry, faculty, inputs, {})
    except (InertFacultyError, RegistryError, KeyError, ValueError):
        # Inert/authored code (G4) or an env-dependent faculty we cannot replay
        # deterministically is not payable — fail closed.
        return _result(False, COMPUTE_UNATTESTED, "faculty did not replay")
    if _compute_output_hash(output) != receipt["output_hash"]:
        return _result(False, COMPUTE_UNATTESTED, "output_hash does not match replay")
    return _result(True, COMPUTE_OK, "dummymind replay matches")


def _attest_gym(receipt: dict) -> dict:
    job_id = receipt["job_id"]
    if job_id not in GYM_CASE_CATALOG:
        return _result(False, COMPUTE_UNATTESTED, f"unknown gym attack {job_id!r}")
    slot = receipt.get("slot") or 0
    try:
        verdict, _ = _run_gym_oracle(job_id, "chronarch-prime", "chronarch_fixture", slot)
    except Exception as exc:  # a fixture that cannot run the oracle is not payable
        return _result(False, COMPUTE_UNATTESTED, f"gym oracle did not run: {exc}")
    if not verdict["detected"]:
        return _result(False, COMPUTE_UNATTESTED, "gym oracle did not pass")
    if _compute_output_hash(verdict) != receipt["output_hash"]:
        return _result(False, COMPUTE_UNATTESTED, "output_hash does not match gym verdict")
    return _result(True, COMPUTE_OK, "gym oracle passed")


def _run_gym_oracle(attack: str, target: str, target_class: str, slot: int):
    """Run one gym case in an ISOLATED Chronarch fixture (a throwaway boot) so
    attestation never mutates the attesting node's ledger, CAS, or Hearth.
    Returns (verdict, receipt) where verdict = {attack, detected, rejected}."""
    from chronarch_gym import make_case, run_case  # late import (gym depends on core)
    from chronarch_hearth import HearthState
    from chronarch_spec import build_kernel

    from .admission import admit_tx
    from .bootstrap import bootstrap
    from .challenge import judge_challenge, make_challenge
    from .executor import run_faculty

    booted = bootstrap(build_kernel(), {
        "node_id": "gym-fixture", "space_units": 1, "compute_units": 1})
    env = {
        "chain": booted["chain"], "cas": booted["cas"],
        "registry": booted["registry"], "hearth": HearthState(),
        "admit_tx": admit_tx, "judge_challenge": judge_challenge,
        "make_challenge": make_challenge, "run_faculty": run_faculty, "slot": slot,
    }
    case = make_case(f"attest-{attack}", attack, target, target_class=target_class)
    oracle = run_case(case, env)
    verdict = {"attack": attack, "detected": bool(oracle["detected"]),
               "rejected": bool(oracle["rejected"])}
    return verdict, oracle
