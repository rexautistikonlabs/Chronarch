"""chronarch-spec: canonical constants, codec, covenant, schemas, kernel.

The single source of truth for every consensus value. Specs in /specs quote
this package; tests fail when prose and code drift.
"""
from .codec import CodecError, canonical_bytes, chash, hash_bytes
from .covenant import COVENANT_SEED, GENESIS_LAW, covenant_object
from .kernel import build_kernel, build_ring0, faculty_registry, genesis_params, ring_hash
from .schemas import SCHEMAS, SchemaError, screen_keys, validate

__all__ = [
    "CodecError",
    "canonical_bytes",
    "chash",
    "hash_bytes",
    "COVENANT_SEED",
    "GENESIS_LAW",
    "covenant_object",
    "build_kernel",
    "build_ring0",
    "faculty_registry",
    "genesis_params",
    "ring_hash",
    "SCHEMAS",
    "SchemaError",
    "screen_keys",
    "validate",
]
