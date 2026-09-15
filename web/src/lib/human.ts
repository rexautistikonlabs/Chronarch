/** Plain words for the floor. A visitor meets fields, bridges, programmes and
 *  syntheses — the product — in everyday language. The technician room keeps
 *  the substrate's names, hex and credits. */
import { programmeCounts, type ChildPin, type ProgrammeFile } from "./programme";

export type BenchKey = "fields" | "bridges" | "programmes" | "synthesis";

export interface HumanReadout {
  key: string;
  label: string;
  value: string;
  testId: string;
  note: string;
  tone: "ivory" | "amber" | "mute";
}

export function programmeReadouts(p: ProgrammeFile): HumanReadout[] {
  const c = programmeCounts(p);
  return [
    { key: "fields", label: "fields in this programme", value: String(c.field_count), testId: "field-count", note: "literatures this programme works in; each with its own units and limits", tone: "ivory" },
    { key: "bridges", label: "bridges declared", value: String(c.bridge_count), testId: "bridge-count", note: "first-class edges between chosen fields; nothing couples by default", tone: "ivory" },
    { key: "ledger", label: "assumptions rated", value: String(c.ledger_count), testId: "ledger-count", note: "every assumption a bridge rests on, each with a rating; none defaults to established", tone: "ivory" },
    { key: "register", label: "falsifiers registered", value: String(c.register_count), testId: "register-count", note: "what would break a bridge, and what it costs when it does; no rescue after the fact", tone: "ivory" },
    { key: "array", label: "items locked", value: String(c.array_size), testId: "array-size", note: "what is measured; changing the list is an amendment, never a silent edit", tone: "ivory" },
    { key: "stop", label: "stops on", value: c.stop_date || "—", testId: "stop-date", note: c.stop_date ? "the clock: the stop rule is applied on this date whatever the results look like" : "no clock yet: a programme names the date its stop rule is applied when it locks its array", tone: "ivory" },
  ];
}

export interface Bench {
  key: BenchKey;
  title: string;
  tagline: string;
  focus: "fields" | "bridges" | "programmes" | "synthesis";
  card: (p: ProgrammeFile, child: ChildPin | null, verdict: { ok: boolean; code?: string }) => { heading: string; body: string[]; techPath: string };
}

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export const BENCHES: readonly Bench[] = [
  {
    key: "fields",
    title: "Fields",
    tagline: "the literatures a group works in",
    focus: "fields",
    card: (p) => {
      const c = programmeCounts(p);
      const used = p.fields.filter((f) => p.programme.fields_used.includes(f.id));
      const licensed = used.filter((f) => f.license_required);
      return {
        heading: used.length === 0 ? "no fields yet — yours to declare" : `${c.field_count} fields, each with its own units`,
        body: [
          used.length === 0
            ? "A field is one literature: a vocabulary with its own units and its own limits. This programme has none yet. On the workbench, declare the fields your group works in — a label, its units, its sector — or load a starter catalogue (Classics, Toy) to see the shape."
            : `A field is one literature: a vocabulary with its own units and its own limits. This programme works in ${list(used.map((f) => f.label.replace(/ \(.*\)$/, "")))}. Their units — ${list(used.map((f) => f.units))} — do not line up, and the software never pretends they do.`,
          "Every field carries an anti-overreach pack: claims its data may never be made to carry. Those are refusals in code, not footnotes. The catalogue is open-ended; a group adds fields as its work grows, and adding one to a programme is an amendment, not a quiet edit.",
          licensed.length > 0 ? `${licensed.length === 1 ? "One field here is" : "Some fields here are"} at arm's length: ${list(licensed.map((f) => f.label.replace(/ \(.*\)$/, "")))}. Such pins can parent a synthesis only under a written grant.` : "None of these fields is at arm's length; none carries a licence requirement.",
        ],
        techPath: "/chronarch/tech",
      };
    },
  },
  {
    key: "bridges",
    title: "Bridges",
    tagline: "declared edges between fields that share no units",
    focus: "bridges",
    card: (p) => {
      const used = p.bridges.filter((b) => p.programme.bridges_used.includes(b.id));
      const ledger = used.reduce((n, b) => n + b.ledger.length, 0);
      const register = used.reduce((n, b) => n + b.register.length, 0);
      return {
        heading: used.length === 0 ? "no bridges yet — the first one is yours to declare" : `${used.length} bridge${used.length === 1 ? "" : "s"} · ${ledger} rated assumptions · ${register} falsifiers`,
        body: [
          "Nothing couples by default. A bridge is a declared edge between exactly two fields, with a bridge statement: in what sense a quantity on one side may stand beside a term on the other, when they share no units.",
          used.length === 0
            ? "Each bridge keeps its assumptions in a ledger with a rating — none starts as established — and a register of what would falsify it. This programme declares none: two of its fields are read together only once you declare a bridge on the workbench, ticked as an amendment, not evidence."
            : `Each bridge keeps its assumptions in a ledger with a rating — none starts as established — and a register of what would falsify it, what that costs, and a rule that it may not be rescued afterwards by renaming its terms. Here: ${list(used.map((b) => `${b.id} (${b.ledger.length} assumptions, ${b.register.length} falsifiers)`))}.`,
          "A synthesis that needs an edge that is not declared and live is refused. The word for that refusal is NO_BRIDGE.",
        ],
        techPath: "/chronarch/tech",
      };
    },
  },
  {
    key: "programmes",
    title: "Programmes",
    tagline: "a chosen subgraph, locked, with a clock",
    focus: "programmes",
    card: (p) => {
      const c = programmeCounts(p);
      return {
        heading: `${p.label.split(" — ")[0]} · ${c.field_count} fields, ${c.bridge_count} bridge${c.bridge_count === 1 ? "" : "s"}, stops ${c.stop_date || "—"}`,
        body: [
          c.array_size === 0
            ? `A programme is a group's declared piece of the catalogue: ${c.field_count} fields and ${c.bridge_count} bridge${c.bridge_count === 1 ? "" : "s"} here, nothing locked and no clock yet. When it locks what it measures, it will rate what it assumes, register what would falsify it, and name the date its stop rule is applied — whatever the results look like.`
            : `A programme is a group's declared piece of the catalogue: ${c.field_count} fields and ${c.bridge_count} bridge${c.bridge_count === 1 ? "" : "s"} here. It locks what it measures (${c.array_size} items, locked ${p.programme.array_lock.locked_at}), rates what it assumes, registers what would falsify it, and names the date its stop rule is applied — whatever the results look like.`,
          c.amendment_count > 0
            ? `It has ${c.amendment_count} amendment${c.amendment_count === 1 ? "" : "s"} and ${c.deviation_count} logged deviation${c.deviation_count === 1 ? "" : "s"}; the old claim is kept beside the new, and each deviation records whether results were known at the time.`
            : "It has no amendments yet. When one comes, the old claim stays beside the new; a deviation records whether results were known at the time.",
          p.id === "programme-blank"
            ? "This is a blank programme — yours. It inherits no field, no bridge, no corpus. Declare your fields and pin your sources on the workbench; load Classics or Toy only if you want a worked shape to look at."
            : p.id === "programme-zero"
              ? "This is Programme Zero — an example corpus, optional and not required. Its method is what travels; its content does not get copied into other fields, and nothing starts from it."
              : p.id === "programme-classics"
                ? "This is the classics catalogue: six fields for public-domain and U.S. government works, with three declared bridges. Metrology stands alone — a one-field compare needs no bridge — and nothing here claims that all fields couple."
                : "This is an invented demo programme: it stands for nothing real and cites no paper. It exists to show a graph of three fields and a path of two bridges.",
        ],
        techPath: "/chronarch/tech",
      };
    },
  },
  {
    key: "synthesis",
    title: "Synthesis",
    tagline: "a child with named parents and a declared path",
    focus: "synthesis",
    card: (_p, child, verdict) => ({
      heading: !child ? "no example child — on the workbench you write yours" : verdict.ok ? `a ${child.kind} child, ${child.parents.length} parents, ${child.path?.length ?? child.clique?.length ?? 0} bridges on its path` : `refused: ${verdict.code}`,
      body: [
        "A synthesis job — overlap, match, couple or question — reads pins in two or more fields and writes one child pin. The child names its parents, the path or clique of live bridges that joins their fields, its method, and the grants it relies on. It never overwrites a parent.",
        !child
          ? "This programme ships no example child. Select two works on the workbench and run Converge, Compare or Analyze: the note it writes is a child with your parents and the bridge you declared."
          : verdict.ok
            ? `This child asks a question across ${child.parents.map((x) => x.field).join(" and ")} along ${child.path?.join(" → ") || "no bridge (one field)"}.${child.grants.length > 0 ? " Its grant covers a field at arm's length." : " No field here is at arm's length, so it needs no grant."} It claims nothing; it asks.`
            : `This child was refused (${verdict.code}) and wrote nothing.`,
        "Four things are refused outright: a missing or non-live edge (NO_BRIDGE), a licensed parent with no grant (LICENSE_MISSING), any person-level score or index (INDIVIDUAL_SCORE_FORBIDDEN), and a write into a field of another sector (CROSS_SECTOR_WRITE).",
      ],
      techPath: "/chronarch/tech",
    }),
  },
];

/** The blank start first; Classics and Toy as optional starter catalogues;
 *  the example corpus last — an optional pack, loaded only when pressed. */
export const PROGRAMME_CHIPS = [
  { label: "Untitled (blank)", fixture: "programme-blank.json", blurb: "a blank start: your fields, your sources, nothing inherited" },
  { label: "Classics", fixture: "programme-classics.json", blurb: "an optional starter pack: six fields for public-domain works, three bridges" },
  { label: "Toy programme", fixture: "programme-toy.json", blurb: "an optional demo: three invented fields, a path of two bridges" },
  { label: "Programme Zero", fixture: "programme-zero.json", blurb: "example corpus — not the product, not required; loads only when pressed" },
] as const;

/** Technical record chips: the substrate's own session fixtures (technician room). */
export const FIXTURE_CHIPS = [
  { label: "Quiet pulse", fixture: "session-solo.json", blurb: "one home, three slots, alone" },
  { label: "The vote", fixture: "session-opa.json", blurb: "two homes, a third let in by ballot" },
] as const;
