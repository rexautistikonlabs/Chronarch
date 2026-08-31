"""Faculty registry: the G3/G4/G15 enforcement point.

* Only live-registry faculty hashes run on the protocol path (G3).
* Authored code registers as INERT and stays inert (G4) until a Council
  activation grant exists (M3, G14). There is no other status transition
  to 'live' for authored code — no helm method, no flag, no env var.
* Primitive seed faculties from the kernel are live at boot (they ARE the
  kernel; changing them is M2).
"""
from __future__ import annotations

import copy

from chronarch_spec import chash, validate


class RegistryError(ValueError):
    pass


class InertFacultyError(RegistryError):
    """Attempt to run or activate a faculty outside the legal path."""


def faculty_code_hash(record: dict) -> str:
    return chash("Faculty", {k: record[k] for k in ("name", "kind", "origin", "program")})


class FacultyRegistry:
    def __init__(self) -> None:
        self._records: dict[str, dict] = {}

    def load_kernel_faculty(self, record: dict) -> None:
        """S3: load a kernel seed faculty (origin=primitive) as live,
        iff its code hash recomputes exactly."""
        validate("Faculty", record)
        if record["origin"] != "primitive":
            raise RegistryError("kernel seed faculties must be origin=primitive")
        if faculty_code_hash(record) != record["code_hash"]:
            raise RegistryError(f"kernel faculty {record['name']!r} hash mismatch")
        self._records[record["name"]] = copy.deepcopy(record)

    def register_authored(self, record: dict) -> dict:
        """Register authored code. It is forced INERT regardless of the
        submitted status field (G4)."""
        record = dict(record)
        record["origin"] = "authored"
        record["status"] = "inert"
        record["code_hash"] = faculty_code_hash(record)
        validate("Faculty", record)
        self._records[record["name"]] = copy.deepcopy(record)
        return copy.deepcopy(record)

    def get(self, name: str) -> dict:
        if name not in self._records:
            raise RegistryError(f"unknown faculty {name!r}")
        return copy.deepcopy(self._records[name])

    def get_live(self, name: str) -> dict:
        record = self.get(name)
        if record["status"] != "live":
            raise InertFacultyError(
                f"faculty {name!r} is {record['status']} — only live-registry "
                "faculty hashes run on the protocol path (G3/G4)"
            )
        return record

    def hibernate(self, name: str) -> None:
        """MINOR change: hibernating an unused faculty (never deletes it)."""
        record = self._records.get(name)
        if record is None:
            raise RegistryError(f"unknown faculty {name!r}")
        record["status"] = "hibernated"

    def activate_authored(self, name: str, grant: dict, council_state) -> dict:
        """The ONLY path from inert to live for authored code (M3/G14/G15).

        `grant` must be an activation grant minted by the Council machine
        (chronarch_council.machine.make_activation_grant) for THIS faculty's
        code hash, and it is re-verified here against the council state —
        a forged grant dict does not pass. Chronarch has no way around this
        method, and this method has no bypass parameter.
        """
        record = self._records.get(name)
        if record is None:
            raise RegistryError(f"unknown faculty {name!r}")
        if record["origin"] == "primitive":
            raise RegistryError("primitive faculties are kernel content (M2), not M3 grants")
        if record["status"] == "live":
            return copy.deepcopy(record)

        # Re-verify the grant against the council record — never trust the dict.
        council_state.verify_activation_grant(grant, code_hash=record["code_hash"])

        record["status"] = "live"
        return copy.deepcopy(record)

    def names(self) -> list[str]:
        return sorted(self._records)
