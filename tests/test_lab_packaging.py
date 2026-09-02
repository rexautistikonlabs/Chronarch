"""Lab excellence: one install pulls all eleven packages, docs/LAB.md exists and
is pointed to, and the lab docs make no positive interoperability claim."""
import importlib.metadata as md
import tomllib
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parent.parent
PYPROJECT = REPO / "pyproject.toml"
LAB = REPO / "docs" / "LAB.md"
STATUS = REPO / "specs" / "STATUS.md"
README = REPO / "README.md"

ELEVEN = {
    "chronarch_spec", "chronarch_core", "chronarch_hearth", "chronarch_nervous",
    "chronarch_gym", "chronarch_sim", "chronarch_farm", "chronarch_council",
    "chronarch_node", "chronarch_agent", "chronarch_cli",
}

FORBIDDEN = ("CHIP-48 compatible", "Chia-compatible", "mainnet ready",
             "institutional-grade L1", "production L1", "production mainnet")


def test_pyproject_bundles_all_eleven_packages():
    data = tomllib.loads(PYPROJECT.read_text())
    where = data["tool"]["setuptools"]["packages"]["find"]["where"]
    found = set()
    for src in where:
        for child in (REPO / src).iterdir():
            if (child / "__init__.py").exists():
                found.add(child.name)
    assert found == ELEVEN
    assert data["project"]["scripts"]["chronarch"] == "chronarch_cli.main:main"
    assert any(dep.startswith("pytest") for dep in data["project"]["optional-dependencies"]["dev"])
    assert data["project"]["dependencies"] == []  # zero runtime deps (G11)


def test_pip_metadata_lists_all_eleven_packages():
    """After `pip install -e ".[dev]"`, the distribution's top_level.txt names
    every workspace package. CI's `package` job runs this against a real
    install; the no-install dev workflow has no metadata to check."""
    try:
        dist = md.distribution("chronarch")
    except md.PackageNotFoundError:
        pytest.skip("chronarch is not pip-installed in this interpreter")
    top_level = set((dist.read_text("top_level.txt") or "").split())
    assert ELEVEN <= top_level, sorted(ELEVEN - top_level)
    entry = {ep.name: ep.value for ep in dist.entry_points if ep.group == "console_scripts"}
    assert entry.get("chronarch") == "chronarch_cli.main:main"


def test_all_eleven_packages_import():
    import importlib
    for name in sorted(ELEVEN):
        importlib.import_module(name)


def test_lab_md_exists_and_is_pointed_to():
    text = LAB.read_text()
    assert "pulse" in text and "memory" in text and "operator path" in text
    assert "not" in text and "public chain" in text
    assert "docs/LAB.md" in README.read_text()
    assert "LAB.md" in STATUS.read_text()


def test_lab_docs_make_no_positive_interoperability_claim():
    for path in (LAB, STATUS, README, REPO / "docs" / "RELEASE.md"):
        text = path.read_text()
        for forbidden in FORBIDDEN:
            assert forbidden not in text, f"{path.name} must not contain {forbidden!r}"
    # the freeze sentence stays
    assert "not a public blockchain" in STATUS.read_text()
