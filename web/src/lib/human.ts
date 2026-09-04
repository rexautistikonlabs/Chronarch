/** Human words for the floor. The technician page keeps the protocol names,
 *  hex and credits; a visitor meets the same numbers as plain nouns. */
import type { SceneState } from "./session";

export interface HumanReadout {
  key: string;
  label: string;
  value: string;
  testId: string;
  note: string;
  tone: "ivory" | "amber" | "mute";
}

export function humanReadouts(s: SceneState): HumanReadout[] {
  const fault = s.i3 !== null || !s.pins_ok;
  return [
    { key: "height", label: "beats", value: String(s.height), testId: "height", note: "turns the organism has taken", tone: "ivory" },
    { key: "ring_count", label: "pages remembered", value: String(s.ring_count), testId: "ring-count", note: "one page per beat, plus the first page it was born with", tone: "ivory" },
    { key: "scar_count", label: "marks that stay", value: String(s.scar_count), testId: "scar-count", note: s.scar_count === 0 ? "nothing has gone wrong on this record" : "something went wrong and it was written down, for good", tone: s.scar_count > 0 ? "amber" : "ivory" },
    { key: "pins_ok", label: "files ok", value: fault ? "no" : "yes", testId: "pins-ok", note: fault ? "a promised file is missing or changed, and the body says so" : "every file it promised to keep is present and unchanged", tone: fault ? "amber" : "ivory" },
    { key: "peer_count", label: "seats at the table", value: String(s.peer_count), testId: "peer-count", note: s.peer_count === 1 ? "alone: one organism, one seat" : "organisms that agreed to share one record", tone: "ivory" },
  ];
}

export type BenchKey = "memory" | "vote" | "body" | "pulse";

export interface Bench {
  key: BenchKey;
  title: string;
  tagline: string;
  focus: "timechain" | "council" | "hearth" | "mind";
  card: (s: SceneState) => { heading: string; body: string[]; techPath: string };
}

export const BENCHES: readonly Bench[] = [
  {
    key: "memory",
    title: "Memory",
    tagline: "a stack of pages nobody can tear out",
    focus: "timechain",
    card: (s) => ({
      heading: `${s.ring_count} pages, ${s.scar_count === 0 ? "no marks" : `${s.scar_count} mark${s.scar_count === 1 ? "" : "s"}`}`,
      body: [
        "The organism writes what happened as a stack of rings, one page per beat. A page can only be added, never changed or removed; every page is chained to the one before it, so tampering shows.",
        s.scar_count === 0
          ? "When something goes wrong, a mark is sealed onto a page's rim in amber and stays there. On this record nothing has, so no rim is amber."
          : "When something went wrong, a mark was sealed onto a page's rim in amber. It can be reviewed later by a vote, and a new page can say so — but the mark itself never comes off.",
        "The way the stack leans and where each seam sits is decided by the record's own fingerprint. A different record rests differently.",
      ],
      techPath: "/timechain",
    }),
  },
  {
    key: "vote",
    title: "Vote",
    tagline: "big changes need seats, not a master key",
    focus: "council",
    card: (s) => ({
      heading: s.proposal ? (s.proposal.ratified ? "a change was voted in" : `a change is ${s.proposal.outcome}`) : "nothing on the table",
      body: [
        "There is no master key. A big change is written up as a proposal and set beside the table; each seat votes with something at stake. Only when enough seats say yes — and the result is carried to every organism — does the proposal dock in the middle.",
        s.proposal
          ? `Here, ${s.seats.length} seat${s.seats.length === 1 ? "" : "s"} sat. The proposal to ${s.proposal.proposal_id.includes("peer_add") ? "let a new organism join" : "change the rules"} ${s.proposal.ratified ? "passed and was carried through, so the prism sits docked" : "has not been carried through, so the prism stays parked"}.`
          : `Here, ${s.seats.length} seat${s.seats.length === 1 ? "" : "s"} and no proposal: the prism stays parked, still.`,
        "A vote that breaks the rules costs the yes-voters their stake and leaves a mark. The organism itself cannot vote a change into being.",
      ],
      techPath: "/council",
    }),
  },
  {
    key: "body",
    title: "Body",
    tagline: "a bond that stands, and files kept in a well",
    focus: "hearth",
    card: (s) => ({
      heading: `${(s.won_slots ?? 0) > 0 || Object.keys(s.credits_by_reason).length > 0 ? "standing" : "slack"} · files ${s.pins_ok && s.i3 === null ? "ok" : "not ok"}`,
      body: [
        "The two legs stay apart because the cables are taut: that tension is the operator's own bond, locked at the node on top. A bonded organism can take turns; an unbonded one stands slack.",
        s.pins_ok && s.i3 === null
          ? "The rods in the well are the files it promised to keep. Every rod is seated, so every file is present and unchanged."
          : "One rod in the well is raised and amber: a file it promised to keep is missing or changed. The body says so out loud; it does not pretend, and it does not change who wins a turn.",
        "There is no dial to turn here. The clamp is the shape itself.",
      ],
      techPath: "/hearth",
    }),
  },
  {
    key: "pulse",
    title: "Pulse",
    tagline: "one beat: take a turn, check, think, write it down",
    focus: "mind",
    card: (s) => ({
      heading: s.attested ? "the box opened once, and closed" : "the box stayed sealed",
      body: [
        "A pulse is one loop on one home: try to win a turn, check the files, run a small thinking job, and write the result down. Then rest.",
        s.attested
          ? "The sealed box is the thinking part. Its work is paid only if replaying it gives the same answer. Here it did, so the lid opened once and sealed again."
          : "The sealed box is the thinking part. Its work is paid only if replaying it gives the same answer. Nothing here attested, so the lid never opened.",
        "Nothing on this floor moves on its own. What you saw happen, happened once, because the record changed.",
      ],
      techPath: "/gym",
    }),
  },
];

export const FIXTURE_CHIPS = [
  { label: "Quiet pulse", fixture: "session-solo.json", blurb: "one organism, three beats, alone" },
  { label: "The vote", fixture: "session-opa.json", blurb: "two organisms, a third let in by vote" },
] as const;
