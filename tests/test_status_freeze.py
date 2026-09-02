"""Lab freeze: STATUS.md says lab-v0, not mainnet, and makes no positive
interoperability claim."""
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
STATUS = REPO / "specs" / "STATUS.md"


def test_status_md_exists():
    assert STATUS.exists()


def test_status_declares_not_a_public_blockchain():
    text = STATUS.read_text()
    assert "not a public blockchain" in text
    # the required lab-v0 disclaimers are present
    assert "lab-v0" in text
    assert "not Chia mainnet" in text
    assert "not CHIP-48" in text


def test_status_makes_no_positive_interoperability_claim():
    text = STATUS.read_text()
    for forbidden in ("CHIP-48 compatible", "Chia-compatible", "mainnet ready"):
        assert forbidden not in text, f"STATUS.md must not contain {forbidden!r}"


def test_status_keeps_the_frozen_row():
    text = STATUS.read_text()
    assert "Kernel / G14 / no admin key" in text and "frozen, hashed" in text
    assert "chiapos" in text and "optional extra" in text
