# COMPUTE.md — Attested Compute Receipts

`COMPUTE_SHARE` ([REWARDS.md](REWARDS.md)) is paid **only** for compute that
actually happened and re-verifies. A worker earns it by submitting a
**ComputeReceipt** that a node attests by redoing the work — replaying a
DummyMind faculty or running an Immune Gym oracle. An unattested receipt is
rejected and never buffered, so no Chronos flows for a job that cannot be
reproduced.

> Chronos is blood, not conscience (G2). Attestation reproduces a computation;
> it never touches Challenge or Ballot legality, and a receipt carries no
> chronos, no vote, and no faculty-activation field.

---

## 1. ComputeReceipt (closed schema)

```
{worker, job_kind, job_id, input_hash, output_hash, evidence_refs, slot?}
```

| Field | Meaning |
|---|---|
| `worker` | the account credited the compute share |
| `job_kind` | `dummymind` or `gym` — **the only two payable kinds** |
| `job_id` | dummymind: a live-registry faculty name; gym: a catalog attack |
| `input_hash` | dummymind: the CAS address of the job input; gym: a commitment to `{attack, target_class}` |
| `output_hash` | `chash("ComputeOutput", output)` — the committed result the attester must reproduce |
| `evidence_refs` | list of CAS refs (the input for a dummymind job) |
| `slot` | optional slot tag |

The schema is **closed** and K18-screened (`verify_compute_receipt`, mirroring
`verify_plot_commitment`): any key outside the set above is rejected, so a
`chronos`, `amount`, `vote`, `ballot`, `seat`, or `activate_faculty` field can
never appear; `admin_key` & kin fail the forbidden-key screen; floats are
banned. A `job_kind` outside `{dummymind, gym}` is rejected outright — an LLM
draft, a silo artifact, or a hat/prevention run has no payable `job_kind`.

## 2. Attestation

```python
attest_compute(receipt, node_or_fixture) -> {ok, code, detail}
# code ∈ {COMPUTE_OK, COMPUTE_UNATTESTED}
```

**DummyMind** — `job_id` must be a **live-registry** faculty (G3/G4: authored
or inert code never attests). The input is fetched from the node's CAS by
`input_hash` and the faculty is replayed via the frozen `run_faculty` (the same
deterministic path challenge judgment uses). The recomputed
`chash("ComputeOutput", output)` **must equal** the receipt's `output_hash`,
else `COMPUTE_UNATTESTED`. An LLM draft is a string, not a faculty output, so
its hash never matches a faculty replay — it cannot attest.

**Gym** — `job_id` must be a catalog attack. The case is run in an **isolated
Chronarch fixture** (a throwaway boot: its own chain, CAS, registry, and
Hearth) via the frozen `chronarch_gym.run_case`, so attestation never mutates
the attesting node. The oracle must pass (the organism detected the attack) and
the verdict `{attack, detected, rejected}` must hash to `output_hash`, else
`COMPUTE_UNATTESTED`.

**Foreign gym target → `GYM_TARGET_FOREIGN`, no receipt.** A non-Chronarch
target class (G12) is refused at build time by `make_compute_receipt` — no
receipt is ever produced (the receipt schema therefore carries no target field,
and attestation always runs against a Chronarch fixture).

**Not payable, ever:** an LLM draft, a silo artifact (`inert: True`), a
`hat_run` black-catalog / prevention-catalog output (`executable: False`).
None is a live-registry faculty output or a gym oracle result, so none attests.
The `prevention_catalog` modality is not paid.

## 3. Node

`node.submit_compute_receipt(receipt)` **must** call `attest_compute`. An
unattested receipt raises and is **not buffered**. An attested receipt buffers
in memory until the node wins a slot; `reward_slot` then credits its `worker`
the compute share. With no attested receipt, the compute share folds to the
treasury sink (the Phase 14 rule, unchanged). The buffer is in-memory node
state — a receipt is inert data and is never sealed into the Timechain, never
gossiped, and never an input to a Challenge or Ballot.

`make_compute_receipt(worker, job_kind, job_id, *, node=, inputs=, ...)` is the
only sanctioned builder: it does the work honestly (stores the input + replays
the faculty, or runs the gym oracle) and returns a receipt that re-verifies.
There is **no backdoor flag** that marks an unattested receipt as attested;
tests build receipts through this same honest path.

## 4. CLI

```
chronarch compute submit --home DIR --job-kind dummymind|gym --job-id ID [--input HEX] [--worker W]
```

JSON out: `{ok, result:{code, worker, job_kind, job_id, buffered}}` on success
(`code == COMPUTE_OK`), or `{ok:false, error_code}` where `error_code` is
`COMPUTE_UNATTESTED`, `GYM_TARGET_FOREIGN`, or `BAD_HOME`. `--input` is the
DummyMind job input (ignored for gym); `--worker` defaults to the node
identity.

## 5. What this is not

Not sealing credits into the Timechain. Not changing the emission constants or
the `reward_slot` signature. Not Council, Hearth, or chiapos. It does not pay
the `prevention_catalog` modality, and it puts no Chronos into Challenge or
Ballot legality.

---

See [REWARDS.md](REWARDS.md) for the compute share and the treasury-fold rule,
and [GYM.md](GYM.md) / [BOOTSTRAP.md](BOOTSTRAP.md) for the gym oracle and the
DummyMind faculty executor attestation reuses.
