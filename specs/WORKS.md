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
| `license` | **required**; one of `cc-by-4.0`, `cc0`, `mit`, `public-domain`, `arxiv-nonexclusive`, `stub-metadata`, `all-rights-reserved` |
| `oa` | open access, as declared by whoever added the record |
| `source` | `preload` (ships with RexMetrix), `upload` (a tenant added it), `index` (a metadata stub) |
| `bytes?` | `false` or `"present"` — a **flag**, never the bytes. No PDF or full text is ever stored in a git fixture; a browser upload is held in memory only |
| `programme?` | the programme the work belongs to |

## Licence law

Full text may be flagged present (`bytes: "present"`) **only** if the licence is
one of `cc-by-4.0`, `cc0`, `mit`, `public-domain`, `arxiv-nonexclusive`.

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

## Upload (model only)

`acceptUpload({ title, license, claimsBytes, rights })` in `web/src/lib/works.ts`:

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
