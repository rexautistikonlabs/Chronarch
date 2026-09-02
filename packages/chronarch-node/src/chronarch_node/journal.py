"""Lab journal: operator notes kept beside a home. Off-chain.

    home/journal.jsonl      one canonical JSON line per note:
                            {slot_hint, ts_unix_int, text, text_hash}

The journal is what an operator writes down about a lab session. It is NOT the
organism's memory (that is the Timechain + home + pins, read by `memory`), NOT
consensus, and NOT an input to anything: no ring is sealed, no tx is submitted,
no proposal is drafted, no object is pinned, no Node is booted. A note carries
no Chronos and no vote. The only thing the journal reads from the home is
`head.json`, to default `slot_hint` to the persisted height.

Integer time only (`ts_unix_int`), no floats anywhere — the line is encoded
with the consensus codec's `canonical_bytes`, which rejects floats by
construction. Text that looks like a consensus object is refused: a JSON body
(the whole note or one embedded in it) is run through the same K18
forbidden-key screen every consensus object gets, and a tool-call shape
(`name`+`arguments`, `tool_calls`, ...) or a Proposal shape (`proposal_id`,
`major_class`, ...) is `JOURNAL_REJECTED`. A journal is for notes, not for
smuggling a Proposal past the Council.

Fail closed: a missing home is BAD_HOME (never created); a malformed, tampered
or non-integer line makes `journal_list` raise BAD_JOURNAL rather than skip it.
"""
from __future__ import annotations

import json
import os
import time

from chronarch_spec import SchemaError, canonical_bytes, hash_bytes, screen_keys

from .home import NodeHome
from .node import NodeError

JOURNAL_FILE = "journal.jsonl"
JOURNAL_KEYS = ("slot_hint", "ts_unix_int", "text", "text_hash")
MAX_TEXT_BYTES = 16 * 1024

# The same shapes chronarch_agent.safeguards refuses at the agent boundary
# (S4), restated here so the node package does not import the agent package.
_TOOL_CALL_PAIR = frozenset({"name", "arguments"})
_TOOL_CALL_KEYS = frozenset({"tools", "tool_calls", "function_call", "functions", "tool_use"})
# Any of these keys marks a Proposal body (the closed Proposal schema).
_PROPOSAL_MARKERS = frozenset({"proposal_id", "major_class", "spec_hash", "deposit_chronons"})


class JournalError(NodeError):
    """BAD_HOME / JOURNAL_REJECTED / BAD_JOURNAL — the code prefixes the message."""


def journal_path(home: str) -> str:
    return os.path.join(home, JOURNAL_FILE)


# -- the screen -------------------------------------------------------------
def _json_candidates(text: str) -> list:
    """The note itself, plus the outermost {...} / [...] span embedded in it,
    whichever parse as JSON containers. Prose parses as nothing."""
    spans = [text]
    for open_ch, close_ch in (("{", "}"), ("[", "]")):
        start, end = text.find(open_ch), text.rfind(close_ch)
        if 0 <= start < end:
            spans.append(text[start:end + 1])
    out = []
    for span in spans:
        try:
            obj = json.loads(span)
        except ValueError:
            continue
        if isinstance(obj, (dict, list)):
            out.append(obj)
    return out


def _is_tool_call_shaped(obj: object) -> bool:
    if isinstance(obj, dict):
        keys = {str(k).lower() for k in obj}
        if _TOOL_CALL_PAIR <= keys or keys & _TOOL_CALL_KEYS:
            return True
        return any(_is_tool_call_shaped(v) for v in obj.values())
    if isinstance(obj, list):
        return any(_is_tool_call_shaped(v) for v in obj)
    return False


def _is_proposal_shaped(obj: object) -> bool:
    if isinstance(obj, dict):
        keys = {str(k).lower() for k in obj}
        if keys & _PROPOSAL_MARKERS:
            return True
        return any(_is_proposal_shaped(v) for v in obj.values())
    if isinstance(obj, list):
        return any(_is_proposal_shaped(v) for v in obj)
    return False


def screen_text(text: str) -> None:
    """Refuse a note that is not a note. Raises JournalError(JOURNAL_REJECTED)."""
    if not isinstance(text, str) or not text.strip():
        raise JournalError("JOURNAL_REJECTED: empty note")
    if len(text.encode("utf-8")) > MAX_TEXT_BYTES:
        raise JournalError(f"JOURNAL_REJECTED: note over {MAX_TEXT_BYTES} bytes")
    for obj in _json_candidates(text):
        try:
            screen_keys(obj)  # K18: the consensus forbidden-key screen, verbatim
        except SchemaError as exc:
            raise JournalError(f"JOURNAL_REJECTED: {exc}") from None
        if _is_tool_call_shaped(obj):
            raise JournalError("JOURNAL_REJECTED: note is tool-call shaped (name+arguments / tool_calls)")
        if _is_proposal_shaped(obj):
            raise JournalError(
                "JOURNAL_REJECTED: note is a Proposal body — a proposal goes to the "
                "Council (chronarch peers propose), never into the journal")


# -- append / list ------------------------------------------------------------
def _require_home(home: str) -> NodeHome:
    node_home = NodeHome(home)
    if not node_home.is_initialized():
        raise JournalError(f"BAD_HOME: no node home at {home}")
    return node_home


def _check_int(value, name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise JournalError(f"JOURNAL_REJECTED: {name} must be a non-negative integer, got {value!r}")
    return value


def journal_append(home: str, text: str, *, slot_hint: int | None = None,
                   ts_unix_int: int | None = None) -> dict:
    """Append one note. Returns {entry, entries}. Never touches the ledger."""
    node_home = _require_home(home)
    screen_text(text)
    if ts_unix_int is None:
        ts_unix_int = int(time.time())  # integer seconds; never a float
    if slot_hint is None:
        head = node_home.read_head() or {}
        slot_hint = int(head.get("height", 0))  # a hint, read from head.json only
    entry = {
        "slot_hint": _check_int(slot_hint, "slot_hint"),
        "ts_unix_int": _check_int(ts_unix_int, "ts_unix_int"),
        "text": text,
        "text_hash": hash_bytes(text.encode("utf-8")),
    }
    line = canonical_bytes(entry)  # sorted keys, no floats, ASCII
    with open(journal_path(home), "ab") as f:
        f.write(line + b"\n")
    return {"entry": entry, "entries": len(journal_list(home))}


def journal_list(home: str) -> list[dict]:
    """Every note, in order. Fail closed on a malformed or tampered line."""
    _require_home(home)
    path = journal_path(home)
    if not os.path.exists(path):
        return []
    out: list[dict] = []
    with open(path, "rb") as f:
        for lineno, raw in enumerate(f, start=1):
            line = raw.rstrip(b"\n")
            if not line:
                continue
            try:
                entry = json.loads(line)
            except ValueError as exc:
                raise JournalError(f"BAD_JOURNAL: line {lineno} is not JSON: {exc}") from None
            if not isinstance(entry, dict) or tuple(sorted(entry)) != tuple(sorted(JOURNAL_KEYS)):
                raise JournalError(f"BAD_JOURNAL: line {lineno} is not a journal entry")
            for key in ("slot_hint", "ts_unix_int"):
                if isinstance(entry[key], bool) or not isinstance(entry[key], int):
                    raise JournalError(f"BAD_JOURNAL: line {lineno} {key} is not an integer")
            if not isinstance(entry["text"], str):
                raise JournalError(f"BAD_JOURNAL: line {lineno} text is not a string")
            if entry["text_hash"] != hash_bytes(entry["text"].encode("utf-8")):
                raise JournalError(f"BAD_JOURNAL: line {lineno} text_hash does not match its text")
            if canonical_bytes(entry) != line:
                raise JournalError(f"BAD_JOURNAL: line {lineno} is not canonical")
            out.append(entry)
    return out
