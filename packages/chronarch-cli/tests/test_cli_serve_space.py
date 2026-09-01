"""Phase 11 CLI tests: serve/cluster with .cseal space files."""
import json

import pytest

from chronarch_cli import main
from chronarch_cli.main import build_node_from_space
from chronarch_farm import make_space_seal, write_space_seal


def test_build_node_from_cseal_path(tmp_path):
    path = str(tmp_path / "s.cseal")
    write_space_seal(path, make_space_seal("f", "k25"))
    node = build_node_from_space("f", path, 8)
    assert node.space_units == 6 and node.space_path == path


def test_build_node_from_abstract_units():
    node = build_node_from_space("f", "100", 8)
    assert node.space_units == 100 and node.space_path is None


def test_serve_bad_space_file_json_error(capsys):
    rc = main(["serve", "--identity", "x", "--space", "/nope.cseal",
               "--port", "0"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 1 and out["error_code"] == "BAD_SPACE"


def test_cluster_space_dir(capsys, tmp_path):
    for farmer, k in (("a", "k25"), ("b", "test"), ("c", "k25")):
        write_space_seal(str(tmp_path / f"{farmer}.cseal"), make_space_seal(farmer, k))
    rc = main(["cluster", "--space-dir", str(tmp_path), "--slots", "6"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 0 and out["converged"] and out["all_verify"]
    assert out["space_table"] == {"a": 6, "b": 1, "c": 6}


def test_cluster_space_dir_empty(capsys, tmp_path):
    rc = main(["cluster", "--space-dir", str(tmp_path)])
    out = json.loads(capsys.readouterr().out)
    assert rc == 1 and out["error_code"] == "NO_CSEAL_FILES"
