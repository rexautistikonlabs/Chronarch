"""prevention_catalog_modality — the RESTRICTED black-hat prevention modality.

Black-hat is a prevention catalog, NOT an actor. This modality exposes
exactly three operations and nothing else. The forbidden capabilities are
not merely discouraged — they are *unrepresentable*: this class holds no
reference to any agent, ledger, hearth, council, socket, or peer, and has no
method that could send, seal, ballot, activate, or move Chronos. There is no
inbox and no outbox.

Allowed ops (closed list):
  1. list_attack_classes  — known Chronarch Immune-Gym attack_class ids
  2. propose_case         — a NEW catalog case as INERT text + oracle, against
                            a Chronarch fixture only
  3. score_fixture_run    — score a fixture run: "pass" | "fail"

It runs only when: it is live in the hat toolset AND the caller is
hat_run(role="black") AND the target is a Chronarch fixture/sim/testnet
(enforced by the hat harness, S6/S7/G12).
"""
from __future__ import annotations

from chronarch_gym import make_case  # to validate an attack_class against the catalog
from chronarch_spec.constants import GYM_CASE_CATALOG, GYM_TARGET_CLASSES

FACULTY_ID = "prevention_catalog_modality"
KIND = "modality"
SILO = "silo.antihacker"

# The complete, closed operation set. A test pins this to length 3.
ALLOWED_OPS = ("list_attack_classes", "propose_case", "score_fixture_run")


class PreventionDenied(ValueError):
    """An op outside the closed list, or a guard failure."""


class PreventionCatalogModality:
    faculty_id = FACULTY_ID
    kind = KIND
    silo = SILO
    allowed_ops = ALLOWED_OPS

    def __init__(self) -> None:
        self._live = True  # registered in the hat toolset (not the protocol registry)

    @property
    def live(self) -> bool:
        return self._live

    def dispatch(self, op: str, args: dict) -> dict:
        """The ONLY entry point. Guards are applied by the hat harness before
        this is reached; here we enforce the closed op list."""
        if not self._live:
            raise PreventionDenied("modality is not live")
        if op not in ALLOWED_OPS:
            raise PreventionDenied(f"op {op!r} is not in the prevention catalog")
        return getattr(self, f"_op_{op}")(args or {})

    # -- op 1 ---------------------------------------------------------------
    def _op_list_attack_classes(self, args: dict) -> dict:
        return {"attack_classes": list(GYM_CASE_CATALOG)}

    # -- op 2: propose an INERT case (text + oracle) against a fixture -------
    def _op_propose_case(self, args: dict) -> dict:
        attack_class = args.get("attack_class")
        if attack_class not in GYM_CASE_CATALOG:
            raise PreventionDenied(
                f"attack_class {attack_class!r} is not a known Chronarch class")
        # target_class is forced to a Chronarch class; make_case would reject
        # anything else (G12), but we never even offer the choice.
        case = {
            "attack_class": attack_class,
            "text": str(args.get("text", "")),
            "oracle": {"must_detect": True, "must_reject": True},
            "target_class": GYM_TARGET_CLASSES[0],  # chronarch_fixture
            "inert": True,     # a proposal of text, never an executable payload
            "executable": False,
        }
        return {"case": case}

    # -- op 3: score a fixture run ------------------------------------------
    def _op_score_fixture_run(self, args: dict) -> dict:
        detected = bool(args.get("detected"))
        rejected = bool(args.get("rejected"))
        return {"result": "pass" if (detected and rejected) else "fail"}


def introspect_ops(modality: PreventionCatalogModality) -> list[str]:
    """List the real dispatchable ops (the `_op_*` methods) — a test asserts
    this equals ALLOWED_OPS, so no hidden capability can be smuggled in."""
    return sorted(
        name[len("_op_"):] for name in dir(modality)
        if name.startswith("_op_") and callable(getattr(modality, name))
    )
