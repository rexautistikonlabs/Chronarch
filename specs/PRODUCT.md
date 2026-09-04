# PRODUCT.md — RexMetrix

**RexMetrix** is institutional research software for hypothesis-led groups and
institutions. A tenant (a group, a department, an institute) maintains an
**array of fields** — the literatures it works in — declares **bridges**
between chosen pairs of fields, and runs **programmes** that are subgraphs of
that catalogue. Synthesis jobs write **child pins** with explicit parents and a
declared path or clique of bridges.

It is programme infrastructure, delivered as software-as-a-service:

| RexMetrix is | RexMetrix is not |
|---|---|
| a catalogue of fields, each with units, a sector and an anti-overreach pack | a public blockchain, a token, a wallet, or a coin |
| first-class bridges between fields that do not share units | a "digital organism" or a claim about minds |
| programmes: fields used, bridges used, a locked array, a ledger, a register, a stop rule with a clock | a diagnostic, therapeutic or clinical tool, and not endorsed by any Foundation |
| synthesis jobs (overlap, match, couple, question) that produce child pins with parents | an index, a score, or an assessment instrument |
| quota per tenant (jobs, pins, storage) — **quota, not coin** | governance by a council, a vote market, or on-chain anything |

## Tenants and quota

A tenant is an institution or a group. What a tenant can do is bounded by
**quota** — how many programmes, jobs and pins it may hold — set by its plan.
There is no currency, no balance to trade, nothing to mine. (Billing and
multi-tenant authentication are not part of this specification version.)

## Programme Zero

The first filled template is **Programme Zero**: Rex Autistikon / Kim 2026,
*Tissue Mechanics…* — a two-field programme with its method and control
documents. It is the **example programme and first corpus**. It is not the
product and not the only science: RexMetrix carries an unbounded array of
fields, and Programme Zero's specific content (its measured array, its eight
sensorimotor interfaces) is **not** copied into other fields. What is portable
is the *method*: see [PROGRAMMES.md](PROGRAMMES.md).

## Internal code, not product

This repository grew from a research codebase (code name *Chronarch*): an
append-only Timechain of rings, a Council upgrade machine, a Hearth bond, a
space lottery, an agent runtime. That code remains in `packages/` as internal
substrate — it stores pins durably, proves append-only history, and screens
forbidden keys — and its kernel, hashes, admission, Council machine, Hearth and
lottery are frozen. **None of it is the product.** RexMetrix exposes fields,
bridges, programmes and synthesis. It does not expose Council governance, rings
as coins, a token, or a network. Operators may still read hashes and the
operator path in the technician room; a visitor meets programmes.

## Works

Only legal works enter RexMetrix: a few preloaded starter works with a licence
on every record, uploads a tenant has rights to (licence required; full text
under a disallowed licence is refused), and metadata-only index stubs. No world
corpus, no scraping, no PDF ingest. See [WORKS.md](WORKS.md).

## Reading order

[FIELDS.md](FIELDS.md) → [BRIDGES.md](BRIDGES.md) →
[PROGRAMMES.md](PROGRAMMES.md) → [SYNTHESIS.md](SYNTHESIS.md) →
[WORKS.md](WORKS.md) → [LEGAL.md](LEGAL.md).
