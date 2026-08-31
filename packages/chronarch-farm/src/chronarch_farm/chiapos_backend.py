"""Optional real-tables PoSpace backend (OFF by default).

Active only when CHRONARCH_CHIAPOS=1 **and** the `chiapos` package is
importable. Otherwise the default backend stays the Phase-6 local stand-in
(pospace.py) and the whole 204+ suite runs with zero extra dependencies.

We do NOT git-submodule chia-blockchain and do NOT vendor a multi-hundred-MB
tree. `chiapos` is an optional pip extra (`chronarch-farm[chiapos]`), never a
required or CI dependency. This module only defines the seam; the real
implementation is wired when someone opts in.
"""
from __future__ import annotations

import os

BACKEND_STANDIN = "phase6-standin"
BACKEND_CHIAPOS = "chiapos"


def chiapos_available() -> bool:
    """True iff chiapos can be imported. Never raises."""
    try:
        import chiapos  # noqa: F401
        return True
    except Exception:
        return False


def chiapos_enabled(env: dict | None = None) -> bool:
    env = os.environ if env is None else env
    return env.get("CHRONARCH_CHIAPOS") == "1"


def active_backend(env: dict | None = None) -> str:
    """Which PoSpace backend is active. Default: the Phase-6 stand-in."""
    if chiapos_enabled(env) and chiapos_available():
        return BACKEND_CHIAPOS
    return BACKEND_STANDIN


class ChiaposBackend:
    """Seam for a real chiapos-backed verifier. Instantiating it requires the
    opt-in to be satisfied; the method bodies are wired only when a user
    actually installs chiapos and enables the flag."""

    name = BACKEND_CHIAPOS

    def __init__(self, env: dict | None = None) -> None:
        if not (chiapos_enabled(env) and chiapos_available()):
            raise RuntimeError(
                "ChiaposBackend requires CHRONARCH_CHIAPOS=1 and an importable "
                "chiapos package (optional extra chronarch-farm[chiapos])")
        import chiapos  # noqa: F401
        self._chiapos = chiapos

    def generate_quality(self, plot_id: str, challenge: str) -> str:  # pragma: no cover
        raise NotImplementedError(
            "real chiapos quality generation is wired at opt-in time (Phase 7+)")

    def verify_proof(self, plot_id: str, challenge: str, proof_bytes: str) -> bool:  # pragma: no cover
        raise NotImplementedError(
            "real chiapos proof verification is wired at opt-in time (Phase 7+)")
