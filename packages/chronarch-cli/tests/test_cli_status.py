"""Lab CLI: chronarch status — STATUS.md's first paragraph + git describe, and it
never says mainnet."""
import importlib
import json
from pathlib import Path

import pytest

from chronarch_cli import main
from chronarch_cli.main import LAB_RELEASE, status_summary

# `chronarch_cli.main` the attribute is the re-exported function; patch the module.
MAIN_MODULE = importlib.import_module("chronarch_cli.main")
REPO = Path(__file__).resolve().parents[3]
STATUS = REPO / "specs" / "STATUS.md"


def test_status_prints_the_status_paragraph(capsys, monkeypatch):
    monkeypatch.chdir(REPO)
    rc = main(["status"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 0 and out["ok"]
    r = out["result"]
    assert r["lab"] == LAB_RELEASE == "lab-v0"
    assert r["status"] == status_summary(str(STATUS))
    assert r["status"].startswith("Chronarch lab-v0 is a research organism")
    assert r["not_a_public_blockchain"] is True
    assert r["source"].endswith("STATUS.md")
    # git describe is reported when a checkout is available, else null
    assert r["git_describe"] is None or isinstance(r["git_describe"], str)


def test_status_never_says_mainnet(capsys, monkeypatch):
    monkeypatch.chdir(REPO)
    main(["status"])
    text = capsys.readouterr().out.lower()
    assert "mainnet" not in text
    assert "chip-48" not in text


def test_status_summary_is_the_first_paragraph(tmp_path):
    doc = tmp_path / "STATUS.md"
    doc.write_text("# Title\n\nFirst **line** of\nthe paragraph.\n\nSecond paragraph.\n")
    assert status_summary(str(doc)) == "First line of the paragraph."


def test_status_summary_refuses_a_mainnet_paragraph(tmp_path):
    doc = tmp_path / "STATUS.md"
    doc.write_text("# Title\n\nChronarch is on Mainnet now.\n")
    with pytest.raises(ValueError, match="STATUS_CLAIM_REFUSED"):
        status_summary(str(doc))


def test_status_cli_refuses_a_mainnet_paragraph(tmp_path, capsys, monkeypatch):
    # The verb, not just the helper, fails closed: a doctored STATUS.md that
    # names mainnet is refused and its text is never echoed.
    doc = tmp_path / "STATUS.md"
    doc.write_text("# Title\n\nChronarch is on mainnet now.\n")
    monkeypatch.setattr(MAIN_MODULE, "_find_status_md", lambda: str(doc))
    rc = main(["status"])
    out = capsys.readouterr().out
    assert rc == 1
    assert json.loads(out)["error_code"] == "STATUS_CLAIM_REFUSED"
    assert "on mainnet now" not in out


def test_status_falls_back_when_no_status_md(capsys, monkeypatch):
    monkeypatch.setattr(MAIN_MODULE, "_find_status_md", lambda: None)
    rc = main(["status"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 0 and out["ok"]
    assert out["result"]["source"] == "builtin"
    assert "not a public blockchain" in out["result"]["status"]
    assert "mainnet" not in json.dumps(out).lower()
