# LEGAL.md — what the book allows, and what RexMetrix will not ship

**The volume.** Rex Autistikon / Kim 2026, *Tissue Mechanics…*, is Programme
Zero: the example programme and first corpus. Its **prose is the author's
copyright**. This repository carries the *structure* of its control documents
in its own words and short cited phrases only; substantial passages are not
pasted here and will not be.

**What the book's own rules allow.** When published, the method and control
documents are offered under MIT / CC BY terms; testing the method is welcomed.
There is **no index license**: nothing in the volume licenses a derived index,
a scoring algorithm or an assessment instrument, and RexMetrix does not build
one.

**Arm's length.** The Programme Zero corpus field is `license_required`. A
`license_grant` object — grantor, scope, terms, date — must exist before any
of its pins is a parent of a RexMetrix child; otherwise the job is refused
(`LICENSE_MISSING`). The fixture grant in `web/fixtures/programme-zero.json` is
illustrative of the object's shape, not a real license.

**What RexMetrix will not ship, as product law:**

- No Foundation endorsement of RexMetrix, stated or implied.
- The Autistikon name only as "example programme" / "first corpus".
- No clinical, diagnostic or therapeutic claim.
- No individual-level score on the Autistikon eight-interface construct; demo
  code refuses (`INDIVIDUAL_SCORE_FORBIDDEN`).
- Programme Zero is not described as a fascia framework.
- Listening material is not framed as an intervention.
- Predictive-coding language, where it appears at all, is inert scaffolding,
  not an engine.
- No derived index, scoring algorithm or assessment instrument.
- No public blockchain, token, wallet, coin, or "digital organism" — the
  internal substrate is not the product ([PRODUCT.md](PRODUCT.md)).

**Visitor copy.** The same bans apply to every visitor-facing string in
`web/` and are tested (`web/tests/rexmetrix-honesty.test.tsx`).
