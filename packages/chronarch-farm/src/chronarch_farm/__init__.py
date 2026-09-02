"""chronarch-farm: dual-farm plot lane (Phase 4).

PlotCommitment / PlotProof, the size table, the abstract-to-plot adapter,
and a structural stub verifier. Plots prove space; CAS stores memory.
No VDF, no Chia header fork — that boundary is Phase 6's.
"""
from .adapter import commitments_from_abstract, space_table_from_commitments, total_units
from .plots import (
    SIZE_TABLE,
    PlotError,
    cas_root_of,
    commitment_binds_pinset,
    derive_plot_id,
    make_plot_commitment,
    make_plot_proof,
    verify_plot_commitment,
    verify_plot_proof,
)
from .pospace import (
    POSPACE_BAD_STRUCTURE,
    POSPACE_BELOW_DIFFICULTY,
    POSPACE_OK,
    POSPACE_QUALITY_MISMATCH,
    POSPACE_ZERO_SPACE,
    difficulty_from_space_units,
    make_pospace,
    make_vdf_record,
    verify_pospace,
    verify_vdf_record,
)
from .infusion import (
    DEFAULT_VDF_ITERATIONS,
    FILTER_PREFIX_BITS,
    MAX_VDF_ITERATIONS,
    genesis_challenge,
    infuse_challenge,
    leading_zero_bits,
    make_sequential_vdf,
    plot_filter_ok,
    timechain_vdf_input,
    verify_sequential_vdf,
)
from . import wesolowski
from . import post
from . import spacefile
from . import pins
from .pins import PINS_OK, PIN_MISMATCH, PIN_MISSING, verify_pins
from .spacefile import (
    CSEAL_EXT,
    TEST_BODY_BYTES,
    SpaceFileError,
    file_body_bytes,
    inspect_space_seal,
    prove_from_file,
    read_space_seal,
    write_space_seal,
)
from .post import (
    filter_ok,
    genesis_pulse,
    make_space_proof,
    make_space_seal,
    make_time_proof,
    make_time_seal,
    next_pulse,
    verify_pulse,
    verify_space_proof,
    verify_space_seal,
    verify_time_proof,
    verify_time_seal,
)
from .chiapos_backend import (
    BACKEND_CHIAPOS,
    BACKEND_STANDIN,
    active_backend,
    chiapos_available,
    chiapos_enabled,
    verify_pospace_extra,
)

__all__ = [
    "SIZE_TABLE",
    "PlotError",
    "derive_plot_id",
    "make_plot_commitment",
    "make_plot_proof",
    "verify_plot_commitment",
    "verify_plot_proof",
    "cas_root_of",
    "commitment_binds_pinset",
    "commitments_from_abstract",
    "total_units",
    "space_table_from_commitments",
    # Phase 6 PoSpace stand-in + VDF stub
    "make_pospace",
    "verify_pospace",
    "difficulty_from_space_units",
    "make_vdf_record",
    "verify_vdf_record",
    "POSPACE_OK",
    "POSPACE_BAD_STRUCTURE",
    "POSPACE_QUALITY_MISMATCH",
    "POSPACE_BELOW_DIFFICULTY",
    "POSPACE_ZERO_SPACE",
    # Phase 7 infusion + filter + sequential VDF
    "FILTER_PREFIX_BITS",
    "DEFAULT_VDF_ITERATIONS",
    "MAX_VDF_ITERATIONS",
    "genesis_challenge",
    "infuse_challenge",
    "leading_zero_bits",
    "plot_filter_ok",
    "make_sequential_vdf",
    "verify_sequential_vdf",
    "timechain_vdf_input",
    # Phase 8 Wesolowski test-group VDF (optional)
    "wesolowski",
    # Phase 9 Chronarch-native PoST façade (canonical names)
    "post",
    "make_space_seal",
    "verify_space_seal",
    "make_space_proof",
    "verify_space_proof",
    "filter_ok",
    "genesis_pulse",
    "next_pulse",
    "verify_pulse",
    "make_time_seal",
    "verify_time_seal",
    "make_time_proof",
    "verify_time_proof",
    # Phase 10 on-disk SpaceSeal files (.cseal)
    "spacefile",
    "write_space_seal",
    "read_space_seal",
    "inspect_space_seal",
    "prove_from_file",
    "file_body_bytes",
    "SpaceFileError",
    "CSEAL_EXT",
    "TEST_BODY_BYTES",
    # Phase 12 pin lane binding
    "pins",
    "verify_pins",
    "PINS_OK",
    "PIN_MISSING",
    "PIN_MISMATCH",
    # Phase 7 optional real-tables backend (off by default)
    "active_backend",
    "verify_pospace_extra",
    "chiapos_available",
    "chiapos_enabled",
    "BACKEND_STANDIN",
    "BACKEND_CHIAPOS",
]
