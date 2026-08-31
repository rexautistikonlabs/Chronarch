"""Workspace conftest: put every package's src/ on sys.path.

The monorepo is developed without an install step (kernel law G11: a node
with kernel blob + disk + compute must self-configure; the dev workflow
mirrors that — clone, run pytest, no privileged setup).
"""
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
for _src in sorted(_ROOT.glob("packages/*/src")):
    p = str(_src)
    if p not in sys.path:
        sys.path.insert(0, p)
