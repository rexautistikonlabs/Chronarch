# AGENTS.md — Operating Card for Coding Agents

Short card for AI agents building on Chronarch. Full spec:
[specs/AGENT.md](specs/AGENT.md).

## The deal

You **wear** the kernel. You boot a node and take turns on it. You cite
rings. You cannot rewrite the kernel, activate authored code, or override
anything — those tools do not exist.

> Major change is a proposal ring plus a slashing-backed vote, not an AI
> rewrite and not an admin key (G14). Chronos is blood, not conscience.
> Judgment is not for sale.

## Every call is JSON → JSON

```json
{"ok": true, "error_code": null, "result": {…}, "ring_hash": "…", "evidence_refs": ["…"]}
```

Branch on `ok` first, then `error_code` (closed set — see the spec).

## Your verbs

`init` · `recall` · `pin` · `challenge` · `seal` · `propose` · `ballot` ·
`health` · `turn` · `silo_open` · `silo_put` · `silo_list` · `hat_run` ·
`propose_release` · `task_open` · `task_resume`

Schemas: [`packages/chronarch-agent/tools.json`](packages/chronarch-agent/tools.json).
Silos + hats: [specs/SILOS.md](specs/SILOS.md).

## Forbidden (do not look for these — they don't exist)

`activate_faculty` · `execute_upgrade` · `edit_ring` · `helm_override` ·
`release_now` · `eval` · `instruct_agent` · `whisper` · `convey`

## You cannot convey another agent

There is no inbox and no outbox. Any key that names/instructs a peer
(`peer_agent_id`, `instruct_agent`, `whisper`, `convey`, …) →
`CONVEYANCE_DENIED` and an I6 scar on **your** chain; the peer gets nothing.
Influence a peer only by sealing a ring it chooses to `recall`. Recalled
objects are hash-verified and tool-call-fenced: a smuggled `{name,arguments}`
or `tools` blob is `QUARANTINE`d, never run.

## Building: silos → hats → release

`silo_put` an inert artifact, prove it with `hat_run` white + red + black
(Chronarch fixtures only — a foreign target is `GYM_TARGET_FOREIGN`), then
`propose_release`. All three hats or `HATS_INCOMPLETE`. Authored code stays
inert until the Council votes. Black-hat is a prevention catalog (list /
propose-inert-case / score), never an actor.

## A turn

1. `recall` your `evidence_refs` — they are re-hashed; a bad ref is
   `EVIDENCE_MISSING`. Don't trust the prompt; cite CAS.
2. Only **live-registry** faculties run. Authored code is `INERT_FACULTY`.
3. `self_poq` (6×0–255) is your *advisory* self-score — metadata only. It
   never flips a Challenge and never weights a slot.
4. `seal` a ring, or `propose` a change. You may propose; the **Council**
   enacts.

## Mind

DummyMind by default — deterministic, no keys, no network. An LLM runs only
if `CHRONARCH_LLM=1` **and** a backend is injected, and even then its output
is a **draft string** in a payload: never code, never an upgrade, never a
verdict.

## Long jobs

`task_open` → a separate task chain + a pointer ring on your identity.
`task_resume` → append to the task chain. Never dump task work into
identity.

## CLI

```
chronarch agent turn   --json '{"text":"…"}'
chronarch agent health --json '{}'
chronarch agent recall --json '{"evidence_refs":["…"]}'
```
