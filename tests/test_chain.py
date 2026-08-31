"""Timechain: G1 (append-only), G5 (scars cannot vanish), 10k rings with
O(1) resume."""
import pytest

from chronarch_core import ChainError, Timechain, resume_append, ring_hash
from chronarch_spec import build_kernel, build_ring0


@pytest.fixture()
def chain():
    return Timechain(build_ring0(build_kernel()))


def _grow(chain, n, start_slot=1):
    for i in range(n):
        chain.seal("experience", {"n": i}, author="node", slot=start_slot + i)


def test_append_and_verify(chain):
    _grow(chain, 10)
    assert chain.verify_full()
    assert chain.height == 10


def test_past_ring_mutation_fails_verify(chain):
    _grow(chain, 5)
    chain._rings[3]["body"]["n"] = 999  # simulate on-disk tamper
    with pytest.raises(ChainError, match="mutated"):
        chain.verify_full()


def test_ring_deletion_fails_verify(chain):
    _grow(chain, 5)
    del chain._rings[2]
    del chain._hashes[2]
    with pytest.raises(ChainError):
        chain.verify_full()


def test_no_mutation_api_exists(chain):
    assert not hasattr(chain, "update_ring")
    assert not hasattr(chain, "delete_ring")
    assert not hasattr(chain, "replace_ring")


def test_scar_cannot_vanish(chain):
    scar = chain.seal_scar("I3", "pin withheld", ["ab" * 32], author="node", slot=1)
    scar_height = scar["height"]
    _grow(chain, 3, start_slot=2)
    # forget-scar seals a NEW ring; the original stays.
    chain.forget_scar(scar_height, "council-reviewed: M7 result ring xyz",
                      author="council", slot=9)
    scars = chain.scars()
    assert len(scars) == 2
    assert scars[0]["body"]["cause"] == "pin withheld"
    # Pruning the original breaks the walk.
    del chain._rings[scar_height]
    del chain._hashes[scar_height]
    with pytest.raises(ChainError):
        chain.verify_full()


def test_10k_rings_and_o1_resume(chain):
    _grow(chain, 10_000)
    assert chain.verify_full()
    assert chain.height == 10_000
    # O(1) resume: the head commitment alone validates a continuation.
    head = chain.head_state()
    next_ring = {
        "ring_type": "experience",
        "height": head["height"] + 1,
        "slot": 10_002,
        "prev_ring_hash": head["head_hash"],
        "author": "node",
        "body": {"resumed": True},
        "witnesses": [],
    }
    new_head = resume_append(head, next_ring)
    assert new_head["height"] == 10_001
    assert new_head["head_hash"] == ring_hash(next_ring)
    # A ring not extending the committed head is refused.
    with pytest.raises(ChainError):
        resume_append(head, dict(next_ring, prev_ring_hash="00" * 32))
    with pytest.raises(ChainError):
        resume_append(head, dict(next_ring, height=head["height"] + 2))


def test_genesis_must_be_genesis():
    kernel = build_kernel()
    ring0 = build_ring0(kernel)
    with pytest.raises(ChainError):
        Timechain(dict(ring0, ring_type="experience"))
    with pytest.raises(ChainError):
        Timechain(dict(ring0, prev_ring_hash="ab" * 32))


def test_truncation_detected_by_head_commitment(chain):
    """Cutting the tail leaves a valid prefix — verify_full alone cannot see
    it (that is what k-of-n head witnesses anchor, K11). The head commitment
    detects it."""
    _grow(chain, 5)
    committed = chain.head_state()
    # Tail truncation: internally consistent...
    del chain._rings[-1]
    del chain._hashes[-1]
    assert chain.verify_full()
    # ...but it no longer matches the witnessed head.
    assert chain.head_state() != committed
