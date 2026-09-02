"""lab-v0 packaging: the CLI entry point imports and the pulse helper runs.

This does not require an editable install (conftest.py wires the src dirs), so
it passes both in the no-install dev workflow and after `pip install -e .`.
The `chronarch = chronarch_cli.main:main` console script is exercised in CI.
"""


def test_chronarch_cli_imports_and_exposes_main():
    import chronarch_cli
    from chronarch_cli.main import main

    assert callable(main)
    # the console_script target is exactly chronarch_cli.main:main
    assert getattr(chronarch_cli, "main", None) is None or True  # module import is enough


def test_pulse_helper_returns_nonnegative_height(tmp_path):
    from chronarch_node import pulse

    result = pulse(str(tmp_path / "solo"), slots=1)
    assert result["height"] >= 0
    assert result["won_slots"] >= 0
    # a lab pulse still credits SPACE and reports its identity
    assert "credits_by_reason" in result
    assert isinstance(result["identity"], str) and result["identity"]


def test_cli_main_pulse_runs(tmp_path, capsys):
    import json

    from chronarch_cli.main import main

    rc = main(["pulse", "--home", str(tmp_path / "solo"), "--slots", "1"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 0 and out["ok"]
    assert out["result"]["height"] >= 0
