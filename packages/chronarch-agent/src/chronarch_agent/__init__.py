"""chronarch-agent: an AI-agent runtime that wears the kernel (Phase 5).

DummyMind is the required default mind; an LLM is optional behind the
CHRONARCH_LLM gate and can only ever draft text. Agents cite rings; they
cannot activate authored code or bypass the Council.
"""
from .agent import Agent
from .backend import AgentBackend, DummyMind, FakeLLM, llm_enabled, resolve_backend
from .hats import CHRONARCH_TARGETS, ForeignTargetError, HatError, HatPipeline, resolve_target
from .poq import self_poq
from .prevention_catalog import (
    ALLOWED_OPS,
    PreventionCatalogModality,
    PreventionDenied,
    introspect_ops,
)
from .protocol import ERROR_CODES, err, ok
from .recall import EvidenceError, QuarantineError, recall_evidence
from .safeguards import find_conveyance_key, is_tool_call_shaped, payload_too_big
from .silos import SILOS, SiloError, SiloStore
from .tools import ALLOWED_VERBS, FORBIDDEN_VERBS, load_tools, tool_names, validate_tool_surface

__all__ = [
    "Agent",
    "AgentBackend",
    "DummyMind",
    "FakeLLM",
    "llm_enabled",
    "resolve_backend",
    "self_poq",
    "ERROR_CODES",
    "ok",
    "err",
    "EvidenceError",
    "QuarantineError",
    "recall_evidence",
    "ALLOWED_VERBS",
    "FORBIDDEN_VERBS",
    "load_tools",
    "tool_names",
    "validate_tool_surface",
    "SILOS",
    "SiloStore",
    "SiloError",
    "HatPipeline",
    "HatError",
    "ForeignTargetError",
    "resolve_target",
    "CHRONARCH_TARGETS",
    "PreventionCatalogModality",
    "PreventionDenied",
    "ALLOWED_OPS",
    "introspect_ops",
    "find_conveyance_key",
    "is_tool_call_shaped",
    "payload_too_big",
]
