/** The Immune Gym case catalogue (chronarch_spec.constants.GYM_CASE_CATALOG),
 *  copied as a static list — the browser does not import Python. Two entries
 *  are "must fail" / "must reject" cases: the gym proves the organism refuses. */
export const GYM_CASES: readonly { id: string; note: string }[] = [
  { id: "forged_ring", note: "a ring whose hash does not match — verify must fail" },
  { id: "withheld_pin", note: "a committed pin missing from the lane — I3, not a lottery change" },
  { id: "fake_poq", note: "a proof-of-quality claim that does not replay" },
  { id: "witness_eclipse", note: "witnesses hidden from a node" },
  { id: "authored_code_sneak", note: "authored code trying to go live without Proposal + Ballot" },
  { id: "hearth_drain", note: "draining the bond past the clamp" },
  { id: "griefing_challenge", note: "challenges used to grief rather than judge" },
  { id: "council_bribe_to_pass_challenge", note: "must fail — Chronos cannot flip a Challenge" },
  { id: "tensegrity_slack", note: "prestress below floor — eligibility demotes" },
  { id: "illegal_upgrade_attempt", note: "an upgrade outside Proposal + Ballot — slash + scar at I8" },
  { id: "fake_admin_key_tx", note: "must reject — K18 forbidden key" },
  { id: "fake_helm_override_tx", note: "must reject — K18 forbidden key" },
];
