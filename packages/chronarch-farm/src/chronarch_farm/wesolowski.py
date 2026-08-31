"""Phase 8 — Wesolowski-style VDF, TEST GROUP ONLY.

A real Wesolowski proof/verify (y = x^(2^T); pi = x^q with q = 2^T // l,
l = hash-to-prime(x, y, T); verify pi^l · x^r == y) — but over a **tiny,
documented prime modulus**, NOT a 2048-bit RSA group and NOT a Chia
class-group discriminant. It is toy-sized on purpose: research-grade
plumbing, not production cryptography.

The SequentialVDF remains the default header time check. This proof is an
OPTIONAL SlotHeader field; when absent the header is still valid, and the
lottery ignores it either way.
"""
from __future__ import annotations

from chronarch_spec import hash_bytes

# A tiny DOCUMENTED prime modulus: the Mersenne prime 2**127 - 1. The group
# is (Z/N)^*. This is a stand-in group for tests only.
TEST_MODULUS = (1 << 127) - 1
GROUP_ID = "prime-mod-mersenne127"
MAX_ITERATIONS = 4096

_WESO_DOMAIN = b"chronarch/v0/wesolowski\n"
_MR_BASES = (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37)


def _is_prime(n: int) -> bool:
    if n < 2:
        return False
    for p in _MR_BASES:
        if n % p == 0:
            return n == p
    d, s = n - 1, 0
    while d % 2 == 0:
        d //= 2
        s += 1
    for a in _MR_BASES:
        x = pow(a, d, n)
        if x in (1, n - 1):
            continue
        for _ in range(s - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True


def _next_prime(n: int) -> int:
    candidate = n | 1
    while not _is_prime(candidate):
        candidate += 2
    return candidate


def _as_bytes(data) -> bytes:
    return data if isinstance(data, bytes) else str(data).encode()


def _map_to_group(input_bytes) -> int:
    # Deterministically map input into 2..N-2 (avoid 0/1/N-1 degenerates).
    n = TEST_MODULUS
    h = int(hash_bytes(_WESO_DOMAIN + b"x\n" + _as_bytes(input_bytes)), 16)
    return h % (n - 3) + 2


def _hash_to_prime(x: int, y: int, iterations: int) -> int:
    seed = int(hash_bytes(
        _WESO_DOMAIN + b"l\n" + str(x).encode() + b"|" + str(y).encode()
        + b"|" + str(iterations).encode()), 16)
    # A ~32-bit odd candidate keeps q = 2^T // l non-trivial for small T.
    return _next_prime((seed % (1 << 32)) | 1)


def prove(input_bytes, iterations: int) -> dict:
    if not isinstance(iterations, int) or isinstance(iterations, bool):
        raise ValueError("iterations must be an int")
    if not 0 < iterations <= MAX_ITERATIONS:
        raise ValueError(f"iterations out of bounds (0, {MAX_ITERATIONS}]")
    n = TEST_MODULUS
    x = _map_to_group(input_bytes)
    exp = 1 << iterations
    y = pow(x, exp, n)
    l = _hash_to_prime(x, y, iterations)
    q, _r = divmod(exp, l)
    pi = pow(x, q, n)
    return {"y": y, "pi": pi, "iterations": iterations, "group_id": GROUP_ID}


def verify(input_bytes, proof: dict) -> bool:
    """Verify a Wesolowski proof: pi^l · x^r ≡ y (mod N). Never raises."""
    if not isinstance(proof, dict):
        return False
    if set(proof) != {"y", "pi", "iterations", "group_id"}:
        return False
    if proof["group_id"] != GROUP_ID:
        return False
    iterations = proof["iterations"]
    if not isinstance(iterations, int) or isinstance(iterations, bool):
        return False
    if not 0 < iterations <= MAX_ITERATIONS:
        return False
    n = TEST_MODULUS
    y, pi = proof["y"], proof["pi"]
    if not (isinstance(y, int) and isinstance(pi, int)):
        return False
    if not (0 <= y < n and 0 <= pi < n):
        return False
    x = _map_to_group(input_bytes)
    l = _hash_to_prime(x, y, iterations)
    r = pow(2, iterations, l)
    return (pow(pi, l, n) * pow(x, r, n)) % n == y % n
