"""Phase 16: the organism pulse.

One deterministic single-node loop that does everything the organism does on a
home: farm space (win slots), check its pins, attest a DummyMind compute job,
and credit Chronos — then report. No wall clock, no randomness beyond the
existing lottery, no chiapos, no AMM.

The pulse is NOT an admin path:

  * it self-bonds its OWN Hearth position (the operator locking their own bond)
    — never an admin key, founder key, or helm override;
  * it never registers a live faculty and never submits a proposal (authored
    code stays inert; upgrades go through Proposal + Ballot — G4/G15);
  * it never seals a Chronos credit into the Timechain — rewards are a separate
    blood ledger (home/rewards.jsonl), and the consensus ledger only carries
    the economic slot rings produce_slot already seals.

Everything routes through the frozen machinery: the space lottery, verify_pins
(I3 is allowed and never aborts the pulse), attest_compute + reward_slot.
"""
from __future__ import annotations

from chronarch_core import make_compute_receipt
from chronarch_farm import SIZE_TABLE

from .cluster import STEWARD_LOCK_CHRONONS
from .home import NodeHome
from .node import Node, NodeError

DEFAULT_PULSE_IDENTITY = "chronarch-pulse"
PULSE_FACULTY = "injection_screen_sense"  # a live seed faculty (G3), env-free
TEST_UNITS = SIZE_TABLE["test"]           # abstract dev denomination (1 unit)


def _open_node(home: str, space_path: str | None, identity: str) -> Node:
    """Open an existing home (identity + space recovered from it) or initialise
    a fresh one. With no `.cseal` a fresh home farms abstract TEST units."""
    node_home = NodeHome(home)
    resuming = node_home.is_initialized()
    if space_path is not None:
        from chronarch_farm import read_space_seal
        file_units = read_space_seal(space_path).get("space_units")
        if resuming:
            # The home is authoritative for space (Phase 13): a --space file
            # that disagrees with what the home recorded never silently
            # overrides it.
            recorded = node_home.read_space_units()
            if recorded is not None and recorded != file_units:
                raise NodeError(
                    f"SPACE_UNITS_MISMATCH: home recorded {recorded} units but "
                    f"--space file declares {file_units}")
        else:
            # Fresh home: the .cseal's farmer_id names the organism.
            identity = read_space_seal(space_path).get("farmer_id", identity)
        return Node(identity, space_path=space_path, home=home)
    if resuming:
        return Node(identity, home=home)  # resume: identity + units from home
    return Node(identity, TEST_UNITS, home=home)


def pulse(home: str, *, space_path: str | None = None, slots: int = 3,
          identity: str = DEFAULT_PULSE_IDENTITY) -> dict:
    """Run one organism pulse on `home` and return a JSON-able summary:

        {identity, height, won_slots, credits_by_reason, pins_ok, i3, head_hash}

    Deterministic: given the same home + inputs it produces the same result.
    """
    if slots < 1:
        raise ValueError("pulse needs at least one slot")
    node = _open_node(home, space_path, identity)

    # Self-bond so this identity is prestressed and can win its own slots — the
    # operator locking their own Hearth bond, never an admin key.
    if node.bond_chronons() <= 0:
        node.hearth.lock(node.identity, STEWARD_LOCK_CHRONONS, slot=0)

    start = node.ledger.height + 1  # continue the slot sequence across resumes
    # Refresh the mandatory gym cadence (a self-challenge, replay-judged) so a
    # long-lived home keeps meeting prestress. A challenge carries no Chronos
    # and is not a proposal or an activation.
    node.rpc("challenge", {"slot": start})

    won = 0
    for offset in range(slots):
        slot = start + offset
        # File-backed: a .cseal that went invalid mid-run means skip leadership
        # this slot rather than crash or forge a proof (verify_pins/I3 do NOT
        # abort — only a broken space file does).
        if node.space_path is not None and not node.verify_space():
            continue
        # Attest a DummyMind job (a live seed faculty replayed on a CAS input)
        # and buffer it so this slot's win pays the COMPUTE share. An unattested
        # receipt would raise — this one always attests.
        receipt = make_compute_receipt(
            node.identity, "dummymind", PULSE_FACULTY,
            node=node, inputs={"tx": {"pulse_slot": slot}}, slot=slot)
        node.submit_compute_receipt(receipt)
        if node.produce_slot(slot):
            won += 1

    pins = node.verify_pins(slot=node.ledger.height)
    return {
        "identity": node.identity,
        "height": node.ledger.height,
        "won_slots": won,
        "credits_by_reason": node.reward_totals()["totals"],
        "pins_ok": pins["ok"],
        "i3": pins["restriction"],
        "head_hash": node.ledger.head_hash,
    }
