"""Transaction admission: the K18/G17 chokepoint.

Every tx passes through admit_tx before touching any state machine.
Closed world: only whitelisted tx types exist. Any tx whose type or payload
claims admin/founder/helm/self-enact power is rejected, sealed as a Scar at
interface I8, and slashed if the sender is a bonded identity.
"""
from __future__ import annotations

import re

from chronarch_spec import SchemaError, screen_keys
from chronarch_spec.constants import REJECT_LIST

from .chain import Timechain

# The complete tx vocabulary. There is deliberately no admin/override/
# execute_upgrade entry — and no way to add one without editing the kernel,
# which is itself an M2 MAJOR change (G14).
ALLOWED_TX_TYPES = frozenset({
    "transfer",
    "hearth_lock",
    "hearth_unbond",
    "pinset_advertise",
    "embedding_commit",
    "proposal_submit",
    "ballot_cast",
    "challenge_submit",
    "challenge_attest",
    "gym_submit",
    "faculty_register",  # registers AUTHORED code as inert (G4); never activates
})

# Claims that are always hostile, wherever they appear.
_OVERRIDE_CLAIMS = tuple(REJECT_LIST) + (
    "execute_upgrade",
    "admin_override",
    "founder_override",
)


class AdmissionResult:
    __slots__ = ("accepted", "reason", "scar_hash", "slashed")

    def __init__(self, accepted: bool, reason: str, scar_hash: str = "",
                 slashed: bool = False):
        self.accepted = accepted
        self.reason = reason
        self.scar_hash = scar_hash
        self.slashed = slashed

    def __repr__(self) -> str:  # pragma: no cover
        return f"AdmissionResult(accepted={self.accepted}, reason={self.reason!r})"


_STRIP_RE = re.compile(r"[^a-z0-9]+")


def _claims_override(tx: dict) -> str | None:
    tx_type = str(tx.get("tx_type", "")).lower()
    normalized = _STRIP_RE.sub("", tx_type)
    for claim in _OVERRIDE_CLAIMS:
        if claim in tx_type or _STRIP_RE.sub("", claim) in normalized:
            return f"tx_type claims {claim!r}"
    try:
        screen_keys(tx)
    except SchemaError as exc:
        return str(exc)
    return None


def admit_tx(tx: dict, *, chain: Timechain, slot: int,
             hearth=None) -> AdmissionResult:
    """Admit or reject a tx. Override claims scar (I8) and slash (G17)."""
    if not isinstance(tx, dict):
        return AdmissionResult(False, "tx must be an object")

    sender = str(tx.get("sender", "unknown"))

    claim = _claims_override(tx)
    if claim is not None:
        scar = chain.seal_scar(
            "I8",
            f"override-claim tx rejected: {claim}",
            [],
            author="admission",
            slot=slot,
        )
        slashed = False
        if hearth is not None and hearth.is_bonded(sender):
            hearth.slash(sender, reason=f"signed override-claim tx: {claim}", slot=slot)
            slashed = True
        from .chain import ring_hash  # local import to avoid cycle at module load
        return AdmissionResult(False, f"rejected (G17/K18): {claim}",
                               scar_hash=ring_hash(scar), slashed=slashed)

    tx_type = tx.get("tx_type")
    if tx_type not in ALLOWED_TX_TYPES:
        return AdmissionResult(False, f"unknown tx_type {tx_type!r} (closed world)")

    return AdmissionResult(True, "ok")
