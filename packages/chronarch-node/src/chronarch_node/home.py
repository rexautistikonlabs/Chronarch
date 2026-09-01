"""NodeHome: a durable on-disk home so a stopped node comes back as the same
organism (Phase 13).

A home is a directory with a fixed layout (see specs/HOME.md):

    home/identity        the node identity string
    home/space.cseal     optional copy of the .cseal the node farms
    home/pins/           the PinStore directory (the CAS pin lane)
    home/ledger/         append-only sealed rings + slot headers (log.jsonl)
                         plus head.json, the O(1) resume commitment
    home/boot.json       the last boot-ok receipt (a BootReport, no extra keys)

The ledger is JSONL-shaped node state; it is NEVER stored inside a `.cseal`
(a `.cseal` proves space and stores nothing else). Replay is fail-closed: a
truncated or hash-broken log, or a head commitment that disagrees with the
replayed rings, raises rather than silently resuming a shorter chain. The
recorded kernel / Ring 0 hashes must match the current genesis, else
HOME_KERNEL_MISMATCH — a home never resumes under a different kernel.
"""
from __future__ import annotations

import json
import os

# HomeError lives in node.py (a subclass of NodeError). Importing it here is
# safe because node.py never imports this module at top level — it imports
# NodeHome lazily inside Node.__init__.
from .node import HomeError


class NodeHome:
    """The on-disk home directory. Pure storage: it reads and writes the
    layout and never re-implements consensus — the Node replays the log
    through the frozen Timechain."""

    def __init__(self, path: str) -> None:
        self.path = path
        self.identity_path = os.path.join(path, "identity")
        self.space_seal_path = os.path.join(path, "space.cseal")
        self.space_units_path = os.path.join(path, "space_units")
        self.pins_dir = os.path.join(path, "pins")
        self.ledger_dir = os.path.join(path, "ledger")
        self.log_path = os.path.join(self.ledger_dir, "log.jsonl")
        self.head_path = os.path.join(self.ledger_dir, "head.json")
        self.boot_path = os.path.join(path, "boot.json")
        self.rewards_path = os.path.join(path, "rewards.jsonl")

    # -- lifecycle ----------------------------------------------------------
    def is_initialized(self) -> bool:
        """A home is already an organism's home once its identity is written."""
        return os.path.exists(self.identity_path)

    def initialize(self, identity: str, boot_report: dict, space_units: int) -> None:
        """Lay out a fresh home. Idempotent dirs; identity + boot receipt +
        the farmed space size are written once at first boot."""
        os.makedirs(self.path, exist_ok=True)
        os.makedirs(self.pins_dir, exist_ok=True)
        os.makedirs(self.ledger_dir, exist_ok=True)
        _atomic_write(self.identity_path, identity.encode("utf-8"))
        # The lottery weighs integer space units; record them so an abstract
        # (fileless) node resumes as the same weight, and so `home inspect` is
        # self-contained. A file-backed node ALSO copies its .cseal below.
        _atomic_write(self.space_units_path, str(int(space_units)).encode("utf-8"))
        # boot.json is the boot-ok receipt verbatim — no extra keys.
        _atomic_write(self.boot_path,
                      json.dumps(boot_report, sort_keys=True).encode("utf-8"))
        if not os.path.exists(self.log_path):
            _atomic_write(self.log_path, b"")
        self.write_head({"height": boot_report_height(boot_report),
                         "head_hash": boot_report.get("ring0_hash", "")})

    # -- reads --------------------------------------------------------------
    def read_identity(self) -> str:
        with open(self.identity_path, "r", encoding="utf-8") as f:
            return f.read()

    def read_space_units(self) -> int | None:
        if not os.path.exists(self.space_units_path):
            return None
        try:
            with open(self.space_units_path, "r", encoding="utf-8") as f:
                return int(f.read().strip())
        except (OSError, ValueError) as exc:
            raise HomeError(f"unreadable space_units: {exc}") from None

    def read_boot(self) -> dict:
        try:
            with open(self.boot_path, "r", encoding="utf-8") as f:
                report = json.load(f)
        except (OSError, json.JSONDecodeError) as exc:
            raise HomeError(f"unreadable boot.json: {exc}") from None
        if not isinstance(report, dict):
            raise HomeError("boot.json is not a boot receipt object")
        return report

    def read_head(self) -> dict | None:
        if not os.path.exists(self.head_path):
            return None
        try:
            with open(self.head_path, "r", encoding="utf-8") as f:
                head = json.load(f)
        except (OSError, json.JSONDecodeError) as exc:
            raise HomeError(f"unreadable head.json: {exc}") from None
        if not (isinstance(head, dict) and "height" in head and "head_hash" in head):
            raise HomeError("head.json is not a head commitment")
        return head

    def read_log(self) -> list[dict]:
        """Parse the append-only ledger log, in order. A truncated or
        malformed line fails closed (a resuming node never guesses past a
        broken tail)."""
        if not os.path.exists(self.log_path):
            return []
        out: list[dict] = []
        with open(self.log_path, "r", encoding="utf-8") as f:
            for lineno, raw in enumerate(f, start=1):
                line = raw.rstrip("\n")
                if line == "":
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise HomeError(
                        f"truncated/corrupt ledger log at line {lineno}: {exc}") from None
                if not isinstance(obj, dict) or "t" not in obj:
                    raise HomeError(f"malformed ledger entry at line {lineno}")
                out.append(obj)
        return out

    # -- writes -------------------------------------------------------------
    def append(self, entry: dict) -> None:
        """Append one ledger object (ring / header / slot_header / challenge).
        Line-oriented so a crash mid-write truncates a single tail line, which
        replay then rejects rather than resuming past."""
        with open(self.log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, sort_keys=True) + "\n")

    def write_head(self, head_state: dict) -> None:
        _atomic_write(self.head_path,
                      json.dumps(head_state, sort_keys=True).encode("utf-8"))

    def append_reward(self, credit: dict) -> None:
        """Append one Chronos credit to home/rewards.jsonl. Separate from the
        ledger log — rewards are blood, not consensus, and are never replayed
        into the Timechain."""
        with open(self.rewards_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(credit, sort_keys=True) + "\n")

    def read_rewards(self) -> list[dict]:
        """Parse the reward ledger (may be absent for a node that never won a
        slot). A malformed tail line fails closed, like the ledger log."""
        if not os.path.exists(self.rewards_path):
            return []
        out: list[dict] = []
        with open(self.rewards_path, "r", encoding="utf-8") as f:
            for lineno, raw in enumerate(f, start=1):
                line = raw.rstrip("\n")
                if line == "":
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise HomeError(
                        f"truncated/corrupt reward ledger at line {lineno}: {exc}") from None
                out.append(obj)
        return out

    def copy_space_seal(self, src_path: str) -> None:
        """Copy the farmed .cseal into the home so a resume can reopen it even
        if the original path is gone. Byte-for-byte — no re-encoding."""
        with open(src_path, "rb") as f:
            data = f.read()
        _atomic_write(self.space_seal_path, data)

    def has_space_seal(self) -> bool:
        return os.path.exists(self.space_seal_path)


def boot_report_height(_boot_report: dict) -> int:
    """A fresh home's ledger head is Ring 0 (height 0)."""
    return 0


def _atomic_write(path: str, data: bytes) -> None:
    tmp = f"{path}.tmp"
    with open(tmp, "wb") as f:
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)
