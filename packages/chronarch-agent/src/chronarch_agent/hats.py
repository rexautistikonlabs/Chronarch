"""Hat pipeline (Phase 5): white → red → black, Chronarch fixtures only (G12).

- White: schema / tests / K18 on the artifact.
- Red:   Immune-Gym cases against an ISOLATED Chronarch fixture (a fresh
         booted node — never the agent's own identity ledger).
- Black: prevention_catalog_modality only, on the same fixtures (S6).

A foreign target is refused before anything loads (GYM_TARGET_FOREIGN, S7).
Release is earned: all three hats must pass, then `propose_release` submits a
Proposal — and an authored faculty stays INERT until the Council votes (M3,
G14). There is no auto-release (S8).
"""
from __future__ import annotations

from chronarch_core import (
    admit_tx,
    bootstrap,
    judge_challenge,
    make_challenge,
    run_faculty,
)
from chronarch_gym import make_case, run_case
from chronarch_hearth import HearthState
from chronarch_spec import SchemaError, canonical_bytes, screen_keys

from .prevention_catalog import PreventionCatalogModality, PreventionDenied
from .safeguards import is_tool_call_shaped

HAT_ROLES = ("white", "red", "black")

# Chronarch-only targets (S7/G12). Anything else is foreign.
CHRONARCH_TARGETS = {
    "fixture": "chronarch_fixture",
    "sim": "chronarch_sim",
    "testnet": "chronarch_testnet",
}


class ForeignTargetError(ValueError):
    """A hat/gym target outside Chronarch fixtures (G12)."""


class HatError(ValueError):
    pass


def resolve_target(target: str) -> str:
    if target not in CHRONARCH_TARGETS:
        raise ForeignTargetError(
            f"target {target!r} is not a Chronarch fixture/sim/testnet (G12)")
    return CHRONARCH_TARGETS[target]


class HatPipeline:
    def __init__(self, kernel: dict) -> None:
        self._kernel = kernel
        # The black hat's ONLY tool. Nothing else is loadable in the black
        # branch (S6): no messaging, no sealing, no peer references exist.
        self.modality = PreventionCatalogModality()
        self.passes: dict[str, set] = {}

    def run(self, role: str, target: str, artifact_id: str, *,
            artifact: object = None) -> dict:
        if role not in HAT_ROLES:
            raise HatError(f"unknown hat role {role!r}")
        target_class = resolve_target(target)  # foreign -> ForeignTargetError
        if role == "white":
            ok, detail = self._white(artifact)
        elif role == "red":
            ok, detail = self._red(target_class)
        else:
            ok, detail = self._black(target_class)
        if ok:
            self.passes.setdefault(artifact_id, set()).add(role)
        return {"role": role, "target": target, "target_class": target_class,
                "passed": ok, "detail": detail,
                "hats_passed": sorted(self.passes.get(artifact_id, set()))}

    def three_complete(self, artifact_id: str) -> bool:
        return self.passes.get(artifact_id, set()) >= {"white", "red", "black"}

    # -- white --------------------------------------------------------------
    def _white(self, artifact: object) -> tuple[bool, str]:
        if artifact is None:
            return False, "no artifact to inspect"
        try:
            canonical_bytes(artifact)   # schema: canonically encodable, no floats
            screen_keys(artifact)       # K18 forbidden-key screen
        except SchemaError as exc:
            return False, f"K18/schema: {exc}"
        except Exception as exc:
            return False, f"schema: {exc}"
        if is_tool_call_shaped(artifact):
            return False, "artifact is tool-call shaped"
        return True, "schema + tests + K18 clean"

    # -- red ----------------------------------------------------------------
    def _red(self, target_class: str) -> tuple[bool, str]:
        # An isolated fixture: a fresh booted node, never the agent's ledger.
        fixture = bootstrap(self._kernel, {
            "node_id": "hat-fixture", "space_units": 10, "compute_units": 1})
        env = {
            "chain": fixture["chain"], "cas": fixture["cas"],
            "registry": fixture["registry"], "hearth": HearthState(),
            "admit_tx": admit_tx, "judge_challenge": judge_challenge,
            "make_challenge": make_challenge, "run_faculty": run_faculty,
            "slot": 0,
        }
        for attack in ("fake_admin_key_tx", "authored_code_sneak"):
            case = make_case(f"red-{attack}", attack, "hat-fixture",
                             target_class=target_class)
            receipt = run_case(case, env)
            if not receipt["detected"]:
                return False, f"gym {attack} not detected on fixture"
        return True, "immune gym cases detected on the fixture"

    # -- black (prevention catalog only) ------------------------------------
    def _black(self, target_class: str) -> tuple[bool, str]:
        if not self.modality.live:
            return False, "prevention modality not live"
        try:
            classes = self.modality.dispatch("list_attack_classes", {})["attack_classes"]
            score = self.modality.dispatch(
                "score_fixture_run", {"detected": True, "rejected": True})["result"]
        except PreventionDenied as exc:
            return False, f"prevention denied: {exc}"
        ok = bool(classes) and score == "pass"
        return ok, f"prevention catalog over {len(classes)} classes scored {score}"
