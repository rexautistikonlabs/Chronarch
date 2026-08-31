"""Mind backends + the LLM gate (Phase 5).

The default mind is **DummyMind** — deterministic, no network, no API key
(G11/K16). Tests pass with zero keys because DummyMind is always available.

An optional LLM backend implements one method:

    complete(prompt: str) -> str

It is used ONLY when both hold:
  * the env var CHRONARCH_LLM == "1", and
  * a backend instance is injected.

Otherwise DummyMind is used. Crucially, an LLM's output is a **draft
string** that lands in a CAS object / ring payload. It is never live code,
never an upgrade, and never a Challenge verdict — those paths do not accept
a backend at all (grep the signatures). Judgment is not for sale, and it is
not for prompting either.
"""
from __future__ import annotations

import os
from typing import Protocol, runtime_checkable

from chronarch_spec import chash


@runtime_checkable
class AgentBackend(Protocol):
    def complete(self, prompt: str) -> str:  # pragma: no cover - protocol
        ...


class DummyMind:
    """The required default mind: a deterministic faculty echo.

    No randomness, no wall clock, no network. The same prompt always yields
    the same draft, so agent turns are reproducible with zero LLM."""

    name = "dummymind"

    def complete(self, prompt: str) -> str:
        digest = chash("dummymind-echo", {"prompt": prompt})
        return f"dummymind-echo:{digest[:16]}"


class FakeLLM:
    """Test backend: returns a fixed string regardless of prompt. Stands in
    for a real LLM to prove the gate and that a draft can never become code."""

    name = "fake-llm"

    def __init__(self, reply: str = "FAKE-LLM-DRAFT") -> None:
        self._reply = reply

    def complete(self, prompt: str) -> str:
        return self._reply


def llm_enabled(env: dict | None = None) -> bool:
    env = os.environ if env is None else env
    return env.get("CHRONARCH_LLM") == "1"


def resolve_backend(injected: AgentBackend | None = None,
                    env: dict | None = None) -> tuple[object, bool]:
    """Return (backend, is_llm). The LLM is active only if the gate is on AND
    a backend was injected; otherwise DummyMind. Unset env -> DummyMind."""
    if injected is not None and llm_enabled(env):
        return injected, True
    return DummyMind(), False
