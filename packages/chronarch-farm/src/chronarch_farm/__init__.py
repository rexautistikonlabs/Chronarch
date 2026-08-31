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
]
