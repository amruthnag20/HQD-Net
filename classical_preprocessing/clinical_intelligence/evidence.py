"""
Evidence Data Structures & Provenance Contracts (Phase 2).

Encapsulates evidence bundles retrieved from the medical knowledge base.
"""

from dataclasses import dataclass
from typing import Tuple
from classical_preprocessing.clinical_intelligence.contracts import EvidenceItem
from classical_preprocessing.clinical_intelligence.query_builder import ClinicalQuery


@dataclass(frozen=True)
class EvidenceBundle:
    """
    Immutable container encapsulating retrieved medical evidence items paired with the originating query.
    """

    query: ClinicalQuery
    items: Tuple[EvidenceItem, ...]
    total_retrieved: int

    def __post_init__(self):
        if not isinstance(self.items, tuple):
            raise ValueError("items must be a tuple of EvidenceItem objects.")
        if self.total_retrieved < 0:
            raise ValueError(f"total_retrieved cannot be negative, got {self.total_retrieved}")
