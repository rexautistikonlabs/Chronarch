"""Timechain: append-only hash-linked rings (G1), scars that cannot vanish (G5),
O(1) resume from a head commitment.

Correction is a new ring or a scar — there is no mutation API, and any
out-of-band mutation of a stored ring is detected by verify (the stored
hash no longer matches the recomputed one) and by the broken prev-link.
"""
from __future__ import annotations

import copy

from chronarch_spec import chash, validate
from chronarch_spec.constants import INTERFACE_IDS


class ChainError(ValueError):
    """Raised when the hash walk breaks or an append is illegal."""


def ring_hash(ring: dict) -> str:
    return chash("Ring", ring)


class Timechain:
    """One identity chain (G8: task chains are separate, pointers only)."""

    def __init__(self, genesis_ring: dict):
        validate("Ring", genesis_ring)
        if genesis_ring["ring_type"] != "genesis" or genesis_ring["height"] != 0:
            raise ChainError("chain must start from a genesis ring at height 0")
        if genesis_ring["prev_ring_hash"] != "":
            raise ChainError("genesis ring must have empty prev_ring_hash")
        self._rings: list[dict] = [copy.deepcopy(genesis_ring)]
        self._hashes: list[str] = [ring_hash(genesis_ring)]

    # -- read ---------------------------------------------------------------
    @property
    def height(self) -> int:
        return len(self._rings) - 1

    @property
    def head_hash(self) -> str:
        return self._hashes[-1]

    def head_state(self) -> dict:
        """O(1) resume commitment: everything needed to keep appending."""
        return {"height": self.height, "head_hash": self.head_hash}

    def ring(self, height: int) -> dict:
        return copy.deepcopy(self._rings[height])

    def rings(self) -> list[dict]:
        return [copy.deepcopy(r) for r in self._rings]

    def hash_at(self, height: int) -> str:
        return self._hashes[height]

    # -- write (append-only, G1) ---------------------------------------------
    def seal(self, ring_type: str, body: dict, *, author: str, slot: int,
             witnesses: list | None = None) -> dict:
        ring = {
            "ring_type": ring_type,
            "height": self.height + 1,
            "slot": slot,
            "prev_ring_hash": self.head_hash,
            "author": author,
            "body": body,
            "witnesses": list(witnesses or []),
        }
        validate("Ring", ring)
        self._rings.append(copy.deepcopy(ring))
        self._hashes.append(ring_hash(ring))
        return ring

    def seal_scar(self, interface: str, cause: str, evidence_hashes: list,
                  *, author: str, slot: int, restriction_hash: str = "") -> dict:
        """Seal a scar ring (G5: scars cannot be pruned)."""
        if interface not in INTERFACE_IDS:
            raise ChainError(f"unknown nervous interface {interface!r}")
        scar_body = {
            "interface": interface,
            "cause": cause,
            "evidence_hashes": list(evidence_hashes),
            "restriction_hash": restriction_hash,
        }
        validate("Scar", scar_body)
        return self.seal("scar", scar_body, author=author, slot=slot)

    def forget_scar(self, scar_ring_height: int, review: str, *, author: str,
                    slot: int) -> dict:
        """G5/M7: 'forgetting' a scar seals a NEW ring after review.

        The original scar ring stays in the chain forever; this only records
        that a review concluded it is retired. Retiring a scar is a MAJOR
        change (M7) — callers must hold a Council result; this method only
        seals the ring, it does not judge the proposal (see chronarch_council).
        """
        target = self._rings[scar_ring_height]
        if target["ring_type"] != "scar":
            raise ChainError(f"ring at height {scar_ring_height} is not a scar")
        return self.seal(
            "scar",
            {
                "interface": target["body"]["interface"],
                "cause": f"forget_scar_review: {review}",
                "evidence_hashes": [self._hashes[scar_ring_height]],
                "restriction_hash": "",
            },
            author=author,
            slot=slot,
        )

    # -- verify ----------------------------------------------------------------
    def verify_full(self) -> bool:
        """Walk the whole chain. Any mutation, insertion or deletion fails."""
        prev_hash = ""
        for height, (ring, stored_hash) in enumerate(zip(self._rings, self._hashes)):
            validate("Ring", ring)
            if ring["height"] != height:
                raise ChainError(f"height mismatch at {height}")
            if ring["prev_ring_hash"] != prev_hash:
                raise ChainError(f"broken hash link at height {height}")
            recomputed = ring_hash(ring)
            if recomputed != stored_hash:
                raise ChainError(f"ring mutated at height {height}")
            prev_hash = recomputed
        return True

    def scars(self) -> list[dict]:
        return [copy.deepcopy(r) for r in self._rings if r["ring_type"] == "scar"]


def resume_append(head_state: dict, ring: dict) -> dict:
    """O(1) resume: verify+advance a head commitment with one new ring.

    A node holding only {height, head_hash} can validate a continuation
    without re-walking history — this is what makes 10k-ring chains cheap
    to follow.
    """
    validate("Ring", ring)
    if ring["height"] != head_state["height"] + 1:
        raise ChainError("resume: wrong height")
    if ring["prev_ring_hash"] != head_state["head_hash"]:
        raise ChainError("resume: ring does not extend the committed head")
    return {"height": ring["height"], "head_hash": ring_hash(ring)}
