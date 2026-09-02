"""
Medical Source Registry & Provenance Verification Manager (Phase 8).

Maintains a typed registry of verified medical literature sources,
distinguishing VERIFIED_PRIMARY, VERIFIED_SECONDARY, and DEMO_SYNTHETIC providers.
"""

from dataclasses import dataclass
import json
import os
from typing import Dict, List, Optional
from classical_preprocessing.clinical_intelligence.contracts import ProvenanceStatus


@dataclass(frozen=True)
class RegisteredSource:
    """
    Immutable representation of an authorized medical evidence source.
    """

    source_id: str
    name: str
    publisher: str
    source_type: str
    base_url: str
    license: str
    access_method: str
    provenance_policy: str
    enabled: bool = True

    def __post_init__(self):
        if not isinstance(self.source_id, str) or not self.source_id.strip():
            raise ValueError("source_id must be a non-empty string.")
        if not isinstance(self.name, str) or not self.name.strip():
            raise ValueError("name must be a non-empty string.")
        if self.provenance_policy not in ProvenanceStatus.ALL_STATUSES:
            raise ValueError(f"Invalid provenance_policy: {self.provenance_policy}")


class MedicalSourceRegistry:
    """
    Central registry governing medical information sources and their provenance classifications.
    """

    def __init__(self, registry_file: Optional[str] = None):
        self._sources: Dict[str, RegisteredSource] = {}
        if registry_file and os.path.exists(registry_file):
            self.load_registry(registry_file)

    def register_source(self, source: RegisteredSource):
        self._sources[source.source_id] = source

    def load_registry(self, registry_file: str):
        with open(registry_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        for item in data:
            src = RegisteredSource(
                source_id=item["source_id"],
                name=item["name"],
                publisher=item["publisher"],
                source_type=item["source_type"],
                base_url=item["base_url"],
                license=item["license"],
                access_method=item["access_method"],
                provenance_policy=item["provenance_policy"],
                enabled=item.get("enabled", True),
            )
            self.register_source(src)

    def get_source(self, source_id: str) -> Optional[RegisteredSource]:
        return self._sources.get(source_id)

    def get_provenance_status_for_source(self, source_id_or_name: str) -> str:
        for src in self._sources.values():
            if src.source_id == source_id_or_name or src.name in source_id_or_name:
                return src.provenance_policy
        return ProvenanceStatus.UNKNOWN

    def list_sources(self) -> List[RegisteredSource]:
        return list(self._sources.values())
