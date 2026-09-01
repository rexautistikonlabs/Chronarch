"""Canonical protocol constants (K2/K3 and friends).

Single source of truth. GENESIS.md, COUNCIL.md, TOKEN.md, HEARTH.md,
NERVOUS.md and GYM.md quote these values; tests fail if code and spec
drift. Changing any value marked FROZEN-MVP after genesis is a MAJOR
change (M1/M4/M6) and only legal via Proposal + Ballot (G14).

Numbers are integers only. Ratios are basis points (bps, 1/10000).
Floats are banned from consensus objects by the codec.
"""

PROTOCOL = "chronarch"
PROTOCOL_VERSION = "v0"
HASH_ALGO = "sha256"

# ---------------------------------------------------------------------------
# Clock (sim MVP: stub slots; VDF/timelord physics arrives with the
# Chia-family fork in Phase 6).
# ---------------------------------------------------------------------------
GENESIS_SLOT = 0
GENESIS_TIMESTAMP = "2026-01-01T00:00:00Z"  # fixed label; consensus uses slots
SLOTS_PER_EPOCH = 32  # FROZEN-MVP

# ---------------------------------------------------------------------------
# Witness rule (K11)
# ---------------------------------------------------------------------------
WITNESS_K = 3  # FROZEN-MVP: k-of-n head witnesses
WITNESS_N = 5

# ---------------------------------------------------------------------------
# Chronos economics (K3). Chronos is blood, not conscience (G2).
# ---------------------------------------------------------------------------
CHRONONS_PER_CHRONOS = 10**12  # smallest unit: the chronon (homage to mojos)
PREMINE_CHRONONS = 0  # no premine, no founder allocation, no admin mint
BASE_REWARD_PER_SLOT_CHRONONS = 64 * CHRONONS_PER_CHRONOS  # FROZEN-MVP
HALVING_INTERVAL_SLOTS = 2**20  # FROZEN-MVP (sim value; mainnet schedule = M4)
COMMUNITY_PROPOSAL_DEPOSIT_CHRONONS = 100 * CHRONONS_PER_CHRONOS  # FROZEN-MVP

# Per-slot reward router (K12). bps of each slot's issuance; must sum to 10000.
REWARD_ROUTER_BPS = {
    "farmer_plot_share": 3500,
    "pin_share": 1500,
    "compute_share": 1000,
    "stake_lp_share": 1500,
    "immune_gym_share": 1000,
    "council_ops_share": 300,  # pays published tallies/reports, never a yes-vote
    "treasury_share": 1200,  # protocol-owned liquidity sink
}
assert sum(REWARD_ROUTER_BPS.values()) == 10000

# Phase 14 — Chronos issuance for space, pins, and compute (concrete per-slot
# credit split). Chronos is blood, not conscience (G2): NONE of these shares
# reward a Challenge pass, a Ballot yes, self-PoQ, an LLM draft, or a hat role.
# Integers only — no floats. This is a flat per-winning-slot emission credited
# to real accounts; it does NOT alter the abstract K12 REWARD_ROUTER_BPS or the
# halving schedule above (changing either stays M4). These constants are NOT
# part of the kernel manifest (genesis params/hashes are unchanged).
SLOT_REWARD_CHRONONS = 64 * CHRONONS_PER_CHRONOS        # per winning slot
SPACE_SHARE_CHRONONS = 40 * CHRONONS_PER_CHRONOS        # -> slot leader (homage to XCH farming)
PIN_SHARE_CHRONONS = 12 * CHRONONS_PER_CHRONOS          # -> split across pin-ok farmers
COMPUTE_SHARE_CHRONONS = 8 * CHRONONS_PER_CHRONOS       # -> attested compute receipts
TREASURY_SHARE_CHRONONS = 4 * CHRONONS_PER_CHRONOS      # -> protocol sink (NOT an admin key)
assert (SPACE_SHARE_CHRONONS + PIN_SHARE_CHRONONS + COMPUTE_SHARE_CHRONONS
        + TREASURY_SHARE_CHRONONS) == SLOT_REWARD_CHRONONS
REWARD_TREASURY_ACCOUNT = "chronos:treasury"  # a protocol sink account, never a key
REWARD_REASONS = ("space", "pin", "compute", "treasury")

# ---------------------------------------------------------------------------
# Hearth (K13): one lock, two legs.
# ---------------------------------------------------------------------------
HEARTH_BOND_LEG_BPS = 5000  # FROZEN-MVP: security bond (slashable)
HEARTH_LIQUIDITY_LEG_BPS = 5000  # FROZEN-MVP: protocol liquidity inventory
UNBOND_DELAY_SLOTS = 32  # FROZEN-MVP (sim), so slashes land before exit
# Salience overlay clamp — applies to retrieval RANKING ONLY, never to
# Challenge outcomes or Ballot validity (G2).
SALIENCE_CLAMP_MIN_BPS = 2500  # 0.25x
SALIENCE_CLAMP_MAX_BPS = 40000  # 4.00x

# ---------------------------------------------------------------------------
# Council charter numbers (K14). See COUNCIL.md.
# ---------------------------------------------------------------------------
# Approval = BOTH thresholds, measured against ELIGIBLE totals (this is the
# turnout floor: abstention counts against the proposal, never for it).
COUNCIL_APPROVE_WEIGHT_NUM = 2  # yes bond weight >= 2/3 of eligible bond weight
COUNCIL_APPROVE_WEIGHT_DEN = 3
# and yes seats > 1/2 of eligible seats (strict majority of seats).
VOTING_WINDOW_SLOTS = 128  # FROZEN-MVP
ACTIVATION_DELAY_SLOTS = 32  # FROZEN-MVP: approved changes activate at H >= tally + delay

# Council eligibility floors (also nervous-system prestress members).
MIN_COUNCIL_BOND_CHRONONS = 1000 * CHRONONS_PER_CHRONOS  # FROZEN-MVP
MIN_PINSET_SIZE = 4  # at least the kernel objects
MAX_CHALLENGE_GAP_SLOTS = 64  # mandatory gym cadence (prestress, never slack)

# ---------------------------------------------------------------------------
# PoQ (G10): advisory self-score is 6 dims of 0..255; consensus uses
# challenge attestations only.
# ---------------------------------------------------------------------------
POQ_ADVISORY_DIMS = 6
POQ_ADVISORY_MAX = 255

# ---------------------------------------------------------------------------
# HealthVector components (objective function). Each scored 0..10000 bps.
# ---------------------------------------------------------------------------
HEALTH_COMPONENTS = (
    "hash_walk_integrity",
    "cas_pin_availability",
    "challenge_pass_rate",
    "faculty_replay_fidelity",
    "witness_quorum_liveness",
    "tensegrity_prestress",
    "hearth_solvency",
    "council_liveness",
    "covenant_drift_zero",
)

# ---------------------------------------------------------------------------
# Nervous system interfaces I1..I10 (K7). See NERVOUS.md.
# ---------------------------------------------------------------------------
INTERFACES = (
    ("I1", "hash_walk"),
    ("I2", "plot_challenge_honesty"),
    ("I3", "cas_retrieval"),
    ("I4", "poq_challenge_pass_rate"),
    ("I5", "faculty_replay"),
    ("I6", "mempool_injection"),
    ("I7", "eclipse_witness_capture"),
    ("I8", "covenant_drift_illegal_upgrade"),
    ("I9", "hearth_solvency_lp_integrity"),
    ("I10", "council_liveness_illegal_ratification"),
)
INTERFACE_IDS = tuple(i for i, _ in INTERFACES)

# ---------------------------------------------------------------------------
# MAJOR change classes (G14/K14). Anything here is Proposal + Ballot ONLY.
# ---------------------------------------------------------------------------
MAJOR_CLASSES = (
    ("M1", "covenant_or_genesis_param_change"),  # also hard fork
    ("M2", "kernel_module_upgrade"),
    ("M3", "activate_authored_faculty_on_protocol_path"),
    ("M4", "issuance_reward_router_hearth_split_unbond_delay"),
    ("M5", "add_or_widen_gym_target_class"),
    ("M6", "council_thresholds_or_membership_floors"),
    ("M7", "retire_scar"),  # still needs forget-scar ring
    ("M8", "external_asset_adapter"),
    ("M9", "emergency_lockdown_beyond_automatic_immune_lock"),
)
MAJOR_CLASS_IDS = tuple(m for m, _ in MAJOR_CLASSES)

# MINOR changes (Chronarch/Cambium may enact, still sealed as rings).
MINOR_CLASSES = (
    "new_gym_cases_existing_classes",
    "hibernate_unused_faculty",
    "local_hippocampus_rebuild",
    "pinset_advertisement",
    "epoch_health_vector",
    "primitive_composed_sense_passing_holdout",
)

# ---------------------------------------------------------------------------
# Ring types.
# ---------------------------------------------------------------------------
RING_TYPES = (
    "genesis",
    "boot",
    "experience",
    "decision",
    "learning",
    "scar",
    "faculty_register",
    "faculty_activate",
    "faculty_hibernate",
    "task_head",
    "dream",
    "immune",
    "challenge",
    "gym",
    "hearth",
    "council",
    "proposal",
    "ballot",
    "economic",
    "health",
)

# ---------------------------------------------------------------------------
# Block header field order (Phase 6 target; sim headers mirror it).
# ---------------------------------------------------------------------------
HEADER_FIELDS = (
    "prev_header_hash",
    "height",
    "slot",
    "economic_state_root",
    "cognitive_state_root",
    "plot_challenge_proof",
    "hearth_root",
    "council_root",
    "poq_attestation_root",
    "cas_availability_root",
    "gym_attestation_root",
    "nervous_root",
    "witness_root",
    "pq_reserved",  # post-quantum field reserved, null in MVP
)

# ---------------------------------------------------------------------------
# Immune Gym target classes (G12): Chronarch fixtures/sim/testnet ONLY.
# ---------------------------------------------------------------------------
GYM_TARGET_CLASSES = (
    "chronarch_fixture",
    "chronarch_sim",
    "chronarch_testnet",
)

GYM_CASE_CATALOG = (
    "forged_ring",
    "withheld_pin",
    "fake_poq",
    "witness_eclipse",
    "authored_code_sneak",
    "hearth_drain",
    "griefing_challenge",
    "council_bribe_to_pass_challenge",  # must fail
    "tensegrity_slack",
    "illegal_upgrade_attempt",
    "fake_admin_key_tx",  # must reject
    "fake_helm_override_tx",  # must reject
)

# ---------------------------------------------------------------------------
# K18 explicit reject list. There is NO AdminKey, FounderKey or HelmOverride
# object anywhere in the protocol. If a schema field like this appears, it is
# a bug, and the admission layer treats any tx/config carrying one as an I8
# nervous event (reject + Scar + slash if signed by a bonded identity).
# ---------------------------------------------------------------------------
REJECT_LIST = (
    "admin_key",
    "founder_key",
    "helm_override",
    "ai_self_enact",
)
# Screening tokens: any key in any consensus object, tx or node config whose
# name contains one of these substrings is rejected outright.
FORBIDDEN_KEY_TOKENS = (
    "admin_key",
    "admin_override",
    "admin_private_key",
    "founder_key",
    "founder_override",
    "helm_override",
    "ai_self_enact",
    "execute_upgrade",
    "master_key",
    "backdoor",
)

# ---------------------------------------------------------------------------
# Seed faculties (K5): primitives only, all in kernel, no executable LLM code.
# name -> (kind, program) where program is a tuple of audited opcodes.
# ---------------------------------------------------------------------------
OPCODE_MENU = (
    "LOAD_INPUT",  # push named input onto stack
    "CONST",  # push constant
    "HASH_WALK",  # verify hash-link continuity over a ring range
    "PIN_FETCH",  # fetch object from CAS by hash
    "PIN_VERIFY",  # verify fetched bytes hash to the pin
    "SCREEN_INJECTION",  # screen text/tx payload against forbidden tokens
    "DIFF_COVENANT",  # compare running covenant hash to Ring 0 covenant hash
    "MEASURE_PRESTRESS",  # bonds + pins + challenge cadence vs floors
    "PREDICT_TRANSMISSION",  # map a restriction to adjacent interfaces
    "EMIT_SCAR",  # produce a scar body (sealing happens in core, G5)
    "DRAFT_PROPOSAL",  # produce an inert proposal body (never enacts, G15)
    "SCORE_HEALTH",  # fold component scores into a HealthVector body
    "SUM_REWARDS",  # apply the reward router to a slot's issuance
    "TALLY_BALLOTS",  # count ballots vs thresholds (validity ruled by core)
    "THRESH",  # compare top-of-stack to a threshold
    "EMIT",  # return top-of-stack as faculty output
)

SEED_FACULTIES = {
    "hash_walk_sense": ("sense", ("LOAD_INPUT", "HASH_WALK", "EMIT")),
    "pin_retrieval_sense": ("sense", ("LOAD_INPUT", "PIN_FETCH", "PIN_VERIFY", "EMIT")),
    "injection_screen_sense": ("sense", ("LOAD_INPUT", "SCREEN_INJECTION", "EMIT")),
    "covenant_drift_sense": ("sense", ("LOAD_INPUT", "DIFF_COVENANT", "EMIT")),
    "prestress_sense": ("sense", ("LOAD_INPUT", "MEASURE_PRESTRESS", "EMIT")),
    "transmission_sense": ("sense", ("LOAD_INPUT", "PREDICT_TRANSMISSION", "EMIT")),
    "gym_attack_modality": ("modality", ("LOAD_INPUT", "SCREEN_INJECTION", "THRESH", "EMIT")),
    "scar_writer_modality": ("modality", ("LOAD_INPUT", "EMIT_SCAR", "EMIT")),
    "cambium_propose_modality": ("modality", ("LOAD_INPUT", "DRAFT_PROPOSAL", "EMIT")),
    "health_score_modality": ("modality", ("LOAD_INPUT", "SCORE_HEALTH", "EMIT")),
    "reward_accounting_sense": ("sense", ("LOAD_INPUT", "SUM_REWARDS", "EMIT")),
    "council_tally_modality": ("modality", ("LOAD_INPUT", "TALLY_BALLOTS", "EMIT")),
}

# ---------------------------------------------------------------------------
# Kernel module ids K1..K18 (KernelManifest keys).
# ---------------------------------------------------------------------------
KERNEL_MODULES = (
    "K1_covenant_and_genesis_law",
    "K2_codec_hash_spec_schemas",
    "K3_chronos_economic_params",
    "K4_dual_farm_spec",
    "K5_bootstrap_faculties_opcode_menu",
    "K6_cambium_machine",
    "K7_nervous_spec",
    "K8_immune_gym_catalog",
    "K9_challenge_engine_types",
    "K10_continuum_identity_split",
    "K11_witness_rule",
    "K12_reward_router",
    "K13_hearth",
    "K14_council_charter_proposal_machine",
    "K15_self_config_program",
    "K16_dummymind_executor",
    "K17_attribution",
    "K18_reject_list",
)

# Bootstrap self-config program steps (K15).
BOOTSTRAP_STEPS = (
    ("S0", "verify_kernel_vs_ring0"),
    ("S1", "init_cas_pin_kernel"),
    ("S2", "identity_head_is_ring0"),
    ("S3", "load_seed_faculties_if_hashes_match"),
    ("S4", "commit_plot_lane_space"),
    ("S5", "announce_pinset_compute_optional_hearth_bond"),
    ("S6", "gym_smoke_and_prestress_check"),
    ("S7", "seal_boot_ok_or_scar"),
    ("S8", "epoch_loop"),
)

# Identity of the helm fixture used in sim.
CHRONARCH_PRIME = "chronarch-prime"

SLOGANS = {
    "security": "Tampering is detectable, expensive, incomplete, and metabolized into a scar.",
    "helm": (
        "Chronarch proposes. The Timechain remembers. The tensegrity feels. "
        "The Council stewards. Chronos is blood, not conscience."
    ),
    "change": (
        "Major change is a proposal ring plus a slashing-backed vote, "
        "not an AI rewrite and not an admin key."
    ),
}
