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


def verify_pospace_extra(pospace: dict, env: dict | None = None) -> bool | None:
    """OPTIONAL cross-check for a ProofOfSpace (lab-v0 freeze).

    Returns None when the extra is inactive — the DEFAULT — so the hash
    stand-in (`verify_pospace`) stands entirely on its own and the whole suite
    runs with zero extra dependencies. Only when `CHRONARCH_CHIAPOS=1` AND the
    `chiapos` package imports does this consult the chiapos backend, returning
    its True/False verdict. It is an optional extra, not a compatibility claim,
    and it never changes the lottery: it can only make a proof stricter, never
    elect a different leader. Never raises — a not-yet-wired backend (or any
    error) returns None, leaving the stand-in in charge."""
    if active_backend(env) != BACKEND_CHIAPOS:
        return None
    if not (isinstance(pospace, dict)
            and {"plot_id", "challenge", "proof_bytes"} <= set(pospace)):
        return None
    try:
        backend = ChiaposBackend(env)
        return bool(backend.verify_proof(
            pospace["plot_id"], pospace["challenge"], pospace["proof_bytes"]))
    except Exception:
        return None  # backend not wired / any error → the stand-in stands alone
