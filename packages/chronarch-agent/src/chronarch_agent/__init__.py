"""chronarch-agent: an AI-agent runtime that wears the kernel (Phase 5).

DummyMind is the required default mind; an LLM is optional behind the
CHRONARCH_LLM gate and can only ever draft text. Agents cite rings; they
cannot activate authored code or bypass the Council.
"""
from .agent import Agent
from .backend import AgentBackend, DummyMind, FakeLLM, llm_enabled, resolve_backend
from .poq import self_poq
from .protocol import ERROR_CODES, err, ok
from .recall import EvidenceError, recall_evidence
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
    "recall_evidence",
    "ALLOWED_VERBS",
    "FORBIDDEN_VERBS",
    "load_tools",
    "tool_names",
    "validate_tool_surface",
]
