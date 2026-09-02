# RELEASE.md — Cutting a Chronarch Lab Tag

Chronarch ships as **lab tags**, not product releases. A lab tag is a reproducible
snapshot of the research organism at a green test state. `lab-v0` is the first.

> A lab tag marks a research freeze. It is **not** a public blockchain, not Chia
> mainnet, not CHIP-48, and not AGI — see [../specs/STATUS.md](../specs/STATUS.md).

---

## 1. What a lab tag is (and is not)

- **Is:** a git tag on a commit where `pytest` is green, the golden genesis
  hashes are unchanged, the K18 AST scan is clean, and the packaging installs
  from a clean venv.
- **Is not:** a distribution to a package index, a production deployment, or a
  claim of interoperability with any other network. There is no public network,
  no peer discovery, no chiapos plots by default, no external listener.

## 2. Pre-tag checklist

From a clean checkout:

```
python -m venv .venv && . .venv/bin/activate
pip install -e ".[dev]"                 # zero third-party runtime deps; pytest for dev
pytest -q                               # expect: all pass, chiapos skipped by default
python -m chronarch_cli pulse --home /tmp/chronarch-pulse-ci --slots 1
chronarch pulse --home /tmp/chronarch-pulse-ci2 --slots 1   # console_script entry
```

All four must succeed. `pip install -e ".[dev]"` exposes every workspace package
and the `chronarch` console script (`chronarch = chronarch_cli.main:main`).

CI runs the same: a `test` job (no-install, conftest-wired) plus a `package` job
that does the editable install and one pulse.

## 3. Cut the tag

```
git tag -a lab-v0 -m "Chronarch lab-v0: research organism freeze. Not mainnet."
git push origin lab-v0
git push origin HEAD
```

Use an **annotated** tag (`-a`) so the freeze note travels with it. Bump the name
(`lab-v1`, …) for a later freeze; a lab tag is never re-pointed once pushed.

> If your environment refuses `refs/tags/*` pushes (some scoped CI tokens only
> allow branch pushes), push the tag from a checkout that has tag-write rights —
> the tag content is environment-independent.

## 4. What NEVER changes without a vote

The frozen surface (genesis hashes, kernel, admission, challenge, the lottery
math, `.cseal` layout, the Hearth clamp, G14, the reward split, `attest_compute`,
council tally/lien, and the STATUS.md "not a public blockchain" statement) is
changed only by a Proposal ring plus a slashing-backed Council ballot (G14) —
never by an edit at tag time.

---

See [../specs/STATUS.md](../specs/STATUS.md) for the frozen/live table and
[../specs/OPERATOR.md](../specs/OPERATOR.md) for the operator path (which is
itself a test).
