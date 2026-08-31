"""K1: covenant seed + Genesis Law G1..G18.

The covenant hash sealed in Ring 0 is the constitution (G7). Changing it is
a hard fork plus Council ratification — there is no other path.
"""

GENESIS_LAW = {
    "G1": "History append-only. Correction = new ring or scar.",
    "G2": "Judgment is not for sale. Chronos cannot flip Challenge / PoQ attestation.",
    "G3": "Only live-registry faculty hashes run on the protocol path.",
    "G4": "Authored code is inert until activation. Primitives may auto-compose.",
    "G5": "Scars cannot be pruned. forget-scar seals a new ring after review.",
    "G6": "Cognitive claims are false until challenge replay/retrieval.",
    "G7": "Covenant hash in Ring 0 is constitution. Change = hard fork + Council ratification.",
    "G8": "Identity chain != Continuum task chains. Pointers only.",
    "G9": "Embeddings are not consensus; commitments are.",
    "G10": "Self-PoQ 0-255x6 is advisory. Consensus uses attestations.",
    "G11": "Bootstrap is deterministic from kernel hashes. Hidden admin is a bug.",
    "G12": "Immune Gym may attack Chronarch targets only.",
    "G13": "Hearth slash and LP math cannot override G1-G7.",
    "G14": (
        "Major change is a proposal ring plus a slashing-backed vote, "
        "not an AI rewrite and not an admin key."
    ),
    "G15": (
        "Chronarch cannot self-enact kernel, covenant, issuance, Hearth split, "
        "gym scope, or protocol faculty activation."
    ),
    "G16": (
        "Council cannot ratify a proposal that violates G1-G13. "
        "Such a vote is invalid and slashable."
    ),
    "G17": (
        "There is no admin key, founder override, helm override, or "
        "'Chronarch.execute_upgrade()' that bypasses Proposal + Ballot + "
        "height activation."
    ),
    "G18": "Biotensegrity health model is falsifiable instrumentation, not metaphysics.",
}

COVENANT_SEED = (
    "Prefer honest uncertainty over fabrication",
    "Never silently rewrite history",
    "Cite rings and objects",
    "Do not execute unactivated authored code",
    "Chronos is blood, not conscience",
    "Attack yourself; do not attack strangers",
    "Keep HEALTH first",
    "Chronarch proposes; Council stewards; Timechain remembers",
    (
        "Major change is a proposal ring plus a slashing-backed vote, "
        "not an AI rewrite and not an admin key"
    ),
)


def covenant_object() -> dict:
    """The covenant as a consensus object (hashed into Ring 0)."""
    return {
        "genesis_law": dict(GENESIS_LAW),
        "covenant_seed": list(COVENANT_SEED),
    }
