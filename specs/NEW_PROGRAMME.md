# NEW_PROGRAMME.md — starting a programme from nothing

Chronarch is a method, not a corpus. A researcher on any question opens a
blank programme, declares the fields their group works in, pins the sources
they have rights to, declares a bridge when two fields must be read together,
runs a synthesis whose child names its parents, and exports one pack. Nothing
below requires the example corpus, any particular author, or any particular
volume; the starter packs are offered, never required.

## 1. Blank start

A cold `/chronarch/tech` opens on **Untitled programme** (`programme-blank`):
no fields, no bridges, no works of its own, no array locked, no clock. The
graph is empty. The works table lists ten public-domain / US-government /
demo rows you may ignore. Nothing is inherited: the example corpus is a pack
that loads only if you press its chip, and no first-run step, default or
document depends on it.

## 2. Add fields

Under *project · name, your fields, session bridges*, **Add field**: a label,
the units its literature counts or measures in, its sector, and the claims
its data may never carry (one per `;`). The id is made from the label
(`field-soil-chemistry`). Every field refuses a person-level score, index or
assessment; you cannot remove that line. Fields live on your project, saved
in this browser only — never written into a programme file. Two fields are
enough to start; one is enough for a same-field compare.

## 3. Pin two licensed sources

Under *works*, add a work you have rights to: a title, a licence, the field
it is shelved in, and either a source URL (a citation — nothing is fetched)
or a short excerpt you are allowed to paste (an excerpt, never a book; giving
text is claiming full text, so the rights box must be ticked). Full text is
allowed only under cc-by-4.0, cc0, mit, public-domain, us-government or
arxiv-nonexclusive; anything else is a citation and can parent only a
*question*. Tick two works.

## 4. Same field, or declare a bridge

Two works shelved in **one field** share a vocabulary: Compare and Converge
run with no bridge. Two works in **two fields** need a declared edge. Under
*declare bridge*, pick the two fields, tick **amendment, not evidence**, and
declare. The edge is dotted in the graph, carries no ledger and no register,
is written to your project only, and every note that runs over it says
"bridge was operator-declared". Without it the bench refuses `NO_BRIDGE` and
names the pair — it never couples two fields by default.

## 5. Export the pack

**Download pack** writes one Markdown file: your fields, the works used with
their licences and URLs, your declared bridges, every note in full, and the
closing negations (not a fitted model, not peer review, not Foundation-
endorsed). **Download project.json** carries the same project for another
browser; import passes a fail-closed guard. No server, no account, no model.

## Worked example — optics and metrology (public-domain, no corpus)

The Classics starter pack ships six fields and three bridges; it declares no
edge between **optics** and **metrology**. Read Newton's *Opticks* excerpt
beside NIST Technical Note 1297 with the operator's own bridge:

1. First run, step 1: **load a public-domain starter pack** (or the chip
   *Classics* under substrate instrument → programmes). The graph shows six
   fields and three shipped edges.
2. Tick `work-newton-opticks` (optics, public-domain) and `work-nist-tn1297`
   (metrology, us-government). Compare is disabled: `NO_BRIDGE · no path
   optics — metrology`; the graph draws the gap dashed.
3. Declare bridge: left `optics`, right `metrology`, tick *amendment, not
   evidence*, declare. `amend-optics-metrology` appears dotted; Compare
   enables.
4. Compare. The note's path is `amend-optics-metrology`; its *What this is
   not* says the bridge was operator-declared with no assumptions rated; its
   findings cite the two work ids and `metric:jaccard`.
5. Download pack.

Or stay in one field: two excerpts both shelved in `metrology` (or in one
field you declared) compare with no bridge at all.

The same five steps run identically on a blank programme with two fields of
your own — `web/tests/core-child.test.ts` builds a child that way, with no
import of the example corpus, and `web/tests/blank-start.test.tsx` drives it
through the workbench.

## What this page does not need

The example corpus (Programme Zero) is not loaded, not cited, not required.
Faraday, Maxwell, Darwin and Mendel are rows in an optional starter pack, not
steps. No tissue, afferent, fascia or kinematics vocabulary appears here; the
method is the same for soil chemistry, glaciology, numismatics or your field.
