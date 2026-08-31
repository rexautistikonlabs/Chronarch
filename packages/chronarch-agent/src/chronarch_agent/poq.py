"""Advisory self-PoQ (G10): 6 ints in 0..255, deterministic from content.

This is METADATA on a candidate — a self-assessment the agent attaches to
what it produces. It is advisory only:

  * it never enters Challenge.pass (the judgment signature takes no such
    parameter, by construction — see chronarch_core.challenge);
  * it never weights the slot lottery (G2/G10);
  * it is not consensus — a claim is false until challenge replay/retrieval
    proves it (G6).

Deterministic: the same candidate always self-scores the same, so turns are
reproducible.
"""
from __future__ import annotations

from chronarch_spec import chash
from chronarch_spec.constants import POQ_ADVISORY_DIMS, POQ_ADVISORY_MAX


def self_poq(candidate: object) -> list[int]:
    """Six advisory dimensions in 0..255, folded from the candidate's hash."""
    digest = chash("self-poq", {"candidate": candidate})
    raw = bytes.fromhex(digest)
    return [raw[i] % (POQ_ADVISORY_MAX + 1) for i in range(POQ_ADVISORY_DIMS)]
