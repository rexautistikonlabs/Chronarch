"""Abstract PoST slot-leader election (Phase 3 MVP).

Space units are the abstract proof-of-space weight (K4: abstract until
Phase 4). The lottery is:

  * deterministic  — a pure function of (slot, space table), no wall clock
    and no randomness, so every honest node elects the same leader;
  * space-proportional — win probability tracks committed space, exactly as
    a Chia-family lottery (ARCHITECTURE.md §5): no invented 40/40/20, no
    stake or PoQ weight in the draw (G2/G10);
  * prestress-gated — only identities meeting the nervous-system floors
    contend (NERVOUS.md); a slack identity is demoted out of the draw.

Any peer can recompute `slot_leader` and `plot_challenge_proof` and reject a
block whose claimed leader does not match — the election is verifiable, not
asserted.
"""
from __future__ import annotations

from chronarch_spec import chash


def _draw(slot: int, total: int) -> int:
    # A big-endian hash of the slot, folded into [0, total). Deterministic
    # and independent of identity, so no contender can grind their own name.
    digest = chash("leader-draw", {"slot": slot})
    return int(digest, 16) % total


def slot_leader(slot: int, space_table: dict[str, int],
                eligible: set[str] | None = None) -> str | None:
    """Elect the leader for `slot`. Returns None if no one is eligible."""
    contenders = sorted(
        i for i, space in space_table.items()
        if space > 0 and (eligible is None or i in eligible)
    )
    total = sum(space_table[i] for i in contenders)
    if total <= 0:
        return None
    draw = _draw(slot, total)
    acc = 0
    for identity in contenders:  # sorted → deterministic tie-break
        acc += space_table[identity]
        if draw < acc:
            return identity
    return contenders[-1]  # unreachable unless rounding; last contender


def plot_challenge_proof(slot: int, identity: str, space_units: int) -> str:
    """A verifiable stub proof-of-space for the winning identity.

    Phase 4 replaces this with a real Chia-family plot proof; here it is a
    commitment any peer can recompute from public inputs.
    """
    return chash("plot-proof", {"slot": slot, "identity": identity,
                                "space_units": space_units})


def verify_leader(slot: int, claimed_leader: str, space_table: dict[str, int],
                  eligible: set[str] | None = None) -> bool:
    return slot_leader(slot, space_table, eligible) == claimed_leader
