"""Phase 10 tests: the on-disk SpaceSeal (.cseal) format. Chronarch's own
format — not a Chia plot, not a database. A .cseal reserves space and seals a
SpaceSeal header; its body is inert. No rings, faculties, drafts, or blobs.
"""
import os

import pytest

from chronarch_farm import (
    TEST_BODY_BYTES,
    file_body_bytes,
    inspect_space_seal,
    make_space_seal,
    prove_from_file,
    read_space_seal,
    verify_space_proof,
    write_space_seal,
)
from chronarch_farm.spacefile import (
    MAGIC,
    BadHeader,
    BadMagic,
    PayloadFound,
    ShortBody,
    _HEADER_OFFSET,
)
from chronarch_spec import canonical_bytes


@pytest.fixture()
def seal():
    return make_space_seal("farmer-1", "test")


def _write(tmp_path, seal, name="s.cseal"):
    path = str(tmp_path / name)
    write_space_seal(path, seal)
    return path


# ---------------------------------------------------------------- round-trip --

def test_write_read_roundtrip(tmp_path, seal):
    path = _write(tmp_path, seal)
    back = read_space_seal(path)
    assert back == seal  # exact SpaceSeal round-trips
    # File is header + reserved body; the TEST unit body is 4096 bytes.
    assert file_body_bytes(1) == TEST_BODY_BYTES == 4096
    header = canonical_bytes(seal)
    assert os.path.getsize(path) == _HEADER_OFFSET + len(header) + 4096


def test_inspect_reports_header(tmp_path, seal):
    info = inspect_space_seal(_write(tmp_path, seal))
    assert info["farmer_id"] == "farmer-1"
    assert info["space_units"] == 1 and info["k_size"] == "test"
    assert info["body_bytes"] == 4096


def test_magic_is_csl1(tmp_path, seal):
    with open(_write(tmp_path, seal), "rb") as f:
        assert f.read(4) == MAGIC == b"CSL1"


# ------------------------------------------------------------- rejections -----

def test_bad_magic_rejected(tmp_path, seal):
    path = _write(tmp_path, seal)
    with open(path, "r+b") as f:
        f.write(b"XXXX")
    with pytest.raises(BadMagic):
        read_space_seal(path)


def test_short_body_rejected(tmp_path, seal):
    path = _write(tmp_path, seal)
    with open(path, "r+b") as f:
        f.truncate(os.path.getsize(path) - 100)
    with pytest.raises(ShortBody):
        read_space_seal(path)


def test_rings_stuffed_in_body_rejected(tmp_path, seal):
    path = _write(tmp_path, seal)
    header = canonical_bytes(seal)
    with open(path, "r+b") as f:
        f.seek(_HEADER_OFFSET + len(header))  # start of body
        f.write(b'{"ring_type":"experience","body":{}}\n')  # stuff jsonl
    with pytest.raises(PayloadFound):
        read_space_seal(path)


def test_appended_payload_rejected(tmp_path, seal):
    path = _write(tmp_path, seal)
    with open(path, "ab") as f:
        f.write(b'{"faculty":"authored"}')  # append after the reserved body
    with pytest.raises(ShortBody):
        read_space_seal(path)


def test_forbidden_key_in_header_rejected(tmp_path, seal):
    # Hand-craft a .cseal whose header carries an admin_key (K18).
    from chronarch_spec import SchemaError
    hostile = dict(seal, admin_key="0" * 64)
    header = canonical_bytes(hostile)
    path = str(tmp_path / "hostile.cseal")
    with open(path, "wb") as f:
        f.write(MAGIC)
        f.write(len(header).to_bytes(4, "big"))
        f.write(header)
        f.truncate(_HEADER_OFFSET + len(header) + 4096)
    with pytest.raises((SchemaError, Exception)):
        read_space_seal(path)


def test_tampered_plot_id_rejected(tmp_path, seal):
    from chronarch_farm import PlotError
    forged = dict(seal, plot_id="0" * 64)
    header = canonical_bytes(forged)
    path = str(tmp_path / "forged.cseal")
    with open(path, "wb") as f:
        f.write(MAGIC + len(header).to_bytes(4, "big") + header)
        f.truncate(_HEADER_OFFSET + len(header) + 4096)
    with pytest.raises(PlotError):
        read_space_seal(path)


def test_truncated_header_rejected(tmp_path):
    path = str(tmp_path / "trunc.cseal")
    with open(path, "wb") as f:
        f.write(MAGIC + (9999).to_bytes(4, "big") + b"{")  # claims 9999-byte header
    with pytest.raises(BadHeader):
        read_space_seal(path)


# ------------------------------------------------------- prove from file ------

def test_prove_from_file_accepted(tmp_path, seal):
    path = _write(tmp_path, seal)
    proof = prove_from_file(path, "challenge-hex-abc")
    assert verify_space_proof(proof, seal["space_units"])["ok"]


def test_cas_root_present_but_missing_object_still_valid(tmp_path):
    # A .cseal committing to a cas_root is valid even if no CAS object exists;
    # a missing pin is an I3 nervous event, not a file defect.
    seal = make_space_seal("farmer-2", "test", cas_root="ab" * 32)
    path = _write(tmp_path, seal, name="cr.cseal")
    back = read_space_seal(path)
    assert back["cas_root"] == "ab" * 32
    proof = prove_from_file(path, "chal")
    assert verify_space_proof(proof, seal["space_units"])["ok"]


def test_cseal_has_no_rings_or_blobs(tmp_path, seal):
    # The reserved body is all zeros — a .cseal literally cannot hold a ring.
    path = _write(tmp_path, seal)
    header = canonical_bytes(seal)
    with open(path, "rb") as f:
        f.seek(_HEADER_OFFSET + len(header))
        body = f.read()
    assert body == b"\x00" * 4096
