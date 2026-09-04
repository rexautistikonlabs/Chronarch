# WORKS.md — only legal works enter RexMetrix

A **work** is a record of a literature item a programme may read: a paper, a
control document, a note. RexMetrix ships a **few** works (preload), lets a
tenant **upload** what it has rights to, and may hold **index stubs** — title,
year, DOI, no bytes. It is not a world corpus, it does not scrape, and it never
decides a courtroom question: it requires a licence on every record and fails
closed when full text is claimed under a licence that does not allow it.

## Work object

```json
{
  "id": "work-pz-ledger-structure",
  "title": "Assumption ledger (structure only) — Programme Zero control-document stand-in",
  "doi": null,
  "year": 2026,
  "license": "cc-by-4.0",
  "oa": true,
  "source": "preload",
  "bytes": "present",
  "programme": "programme-zero"
}
```

| Key | Meaning |
|---|---|
| `id`, `title` | required |
| `doi?`, `year?` | optional metadata |
| `license` | **required**; one of `cc-by-4.0`, `cc0`, `mit`, `public-domain`, `us-government`, `arxiv-nonexclusive`, `stub-metadata`, `all-rights-reserved`. `us-government` marks a work of the United States Government, not subject to copyright in the U.S. (17 U.S.C. § 105) |
| `oa` | open access, as declared by whoever added the record |
| `source` | `preload` (ships with RexMetrix), `upload` (a tenant added it), `index` (a metadata stub) |
| `bytes?` | `false` or `"present"` — a **flag**, never the bytes. No PDF or full text is ever stored in a git fixture; a browser upload is held in memory only |
| `programme?` | the programme the work belongs to |
| `field?` | the catalogue field the work is shelved in; a work parents a child only when shelved (`UNKNOWN_FIELD` otherwise) |
| `source_url?` | a citation — the Gutenberg or NIST page the excerpt comes from. **The browser never fetches it**; a URL without text is a stub |
| `attribution?` | who wrote it and where it came from, with its URL |
| `text?` | the body, present only when `bytes: "present"` under an allowing licence. In fixtures a body is a short structure-only stand-in written for this repository (≤ 80 words); stubs have none. An upload may carry `text`, and giving one is claiming full text (licence and rights rules apply) |

## Licence law

Full text may be flagged present (`bytes: "present"`) **only** if the licence is
one of `cc-by-4.0`, `cc0`, `mit`, `public-domain`, `us-government`,
`arxiv-nonexclusive`.

| refusal | when |
|---|---|
| `FULLTEXT_FORBIDDEN` | `bytes: "present"` with a licence outside that set — `all-rights-reserved` above all |
| `LICENSE_MISSING` | no licence on the record (reused from the synthesis refusals) |
| `STUB_NO_FULLTEXT` | `stub-metadata`, or `oa: false`, or no bytes: the work is a citation, not a body. A synthesis of kind `overlap`, `match` or `couple` that names such a work as a parent refuses; a `question` **may** cite a stub |

## Preload

`web/fixtures/works-preload.json` holds at most twelve hand-written rows, every
one with a licence and `source: "preload"`: one or two Programme Zero
control-document **stand-ins** (structure only, our own short titles — no book
chapters, no eight-zone scores), one toy-materials stand-in, and a few obviously
legal stubs (a public-domain named work; an arXiv-style metadata row under
`arxiv-nonexclusive` with no bytes; metadata-only stubs). A few legal starter
works; nothing that could be mistaken for a library.

## The base: public-domain and U.S. government works

RexMetrix preloads a small **base** of verified public-domain / U.S. government
scientific works so Converge / Compare / Analyze have real sentences to read.
Each row carries `title`, `license` (`public-domain` or `us-government`),
`source: "preload"`, `bytes: "present"`, a `text` that is the **specified
excerpt only — not the book**, its `source_url` (the Project Gutenberg or NIST
page), an `attribution` string, and a `field` from the classics catalogue
(`web/fixtures/programme-classics.json`: natural-history, optics, electricity,
electromagnetism, heredity, metrology; bridges natural-history—heredity,
electricity—electromagnetism, optics—electromagnetism; metrology stands alone).

| id | field | source |
|---|---|---|
| `work-darwin-1859` | natural-history | Project Gutenberg (Darwin, *On the Origin of Species*, 1859) |
| `work-newton-opticks` | optics | Project Gutenberg (Newton, *Opticks*) |
| `work-faraday-ere-v1` | electricity | Project Gutenberg (Faraday, *Experimental Researches in Electricity*, vol. 1) |
| `work-maxwell-elem` | electromagnetism | Project Gutenberg (Maxwell, *An Elementary Treatise on Electricity*) |
| `work-mendel-1866-de` | heredity | Project Gutenberg (Mendel, *Versuche über Pflanzen-Hybriden*, 1866, German) |
| `work-nist-tn1297` | metrology | NIST Technical Note 1297 (U.S. government work) |

The excerpts, Gutenberg/NIST URLs and attribution strings for these rows are
the operator brief's works table, carried **exactly** (tested against the
brief's strings, whitespace-normalised only). Each `text` is a short excerpt —
one or two sentences — never the book; the software does not download
anything. A URL is a citation.

## Upload (model only)

`acceptUpload({ title, license, claimsBytes, rights })` in `web/src/lib/works.ts`:

- a `source_url` may be given; **nothing is fetched** — a URL without `text` is a stub
- `claimsBytes` and the licence does not allow full text → `{ ok: false, code: "FULLTEXT_FORBIDDEN" }`
- no licence → `{ ok: false, code: "LICENSE_MISSING" }`
- `claimsBytes` without the rights declaration → `{ ok: false, code: "RIGHTS_UNDECLARED" }`
- otherwise → `{ ok: true, work }` with `source: "upload"`, appended to the
  session catalogue **in memory**. Nothing is written to disk from the browser;
  no cloud bucket exists in this version.

The technician room has the form: title, licence, "I have rights to this file".
The software does not verify the claim; it records it and refuses the cases it
can decide.

## Index stubs

A stub is `license: "stub-metadata"`, `oa: false`, `bytes: false`, with a DOI
or title and year. Stubs let a programme cite what it has not got. RexMetrix
does not fetch URLs, does not call a live bibliographic API in this version,
and does not ingest PDFs.

## Synthesis

A child's parent may carry a `work` id beside its `pin` and `field`. The
existing refusals stay (`NO_BRIDGE`, `LICENSE_MISSING`,
`INDIVIDUAL_SCORE_FORBIDDEN`, `CROSS_SECTOR_WRITE`); to them `FULLTEXT_FORBIDDEN`
and `STUB_NO_FULLTEXT` are added as above. See [SYNTHESIS.md](SYNTHESIS.md).
