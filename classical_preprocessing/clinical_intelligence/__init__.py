"""
Post-Quantum Clinical Intelligence Package for HQD-Net (Phases 1-7).
"""

from classical_preprocessing.clinical_intelligence.api_contract import (
    build_api_error_payload,
    build_api_response_payload,
)
from classical_preprocessing.clinical_intelligence.contracts import (
    ClinicalPrediction,
    ClinicalReport,
    EvidenceItem,
    ExplainabilityAttribution,
    ModelComparison,
    PostQuantumResult,
    QuantumPrediction,
    post_quantum_result_from_dict,
    post_quantum_result_from_payload,
    post_quantum_result_to_dict,
)
from classical_preprocessing.clinical_intelligence.evidence import EvidenceBundle
from classical_preprocessing.clinical_intelligence.ingestion import (
    DocumentChunk,
    generate_deterministic_chunk_id,
    ingest_json_knowledge_base,
    ingest_knowledge_directory,
)
from classical_preprocessing.clinical_intelligence.llm import (
    APIProvider,
    ClinicalLLM,
    ClinicalLLMRequest,
    ClinicalLLMResponse,
    MockLLMProvider,
    extract_json_payload,
    generate_clinical_report,
    generate_fallback_clinical_report,
    validate_and_build_report,
)
from classical_preprocessing.clinical_intelligence.orchestrator import run_clinical_analysis
from classical_preprocessing.clinical_intelligence.prompting import ClinicalPromptBuilder
from classical_preprocessing.clinical_intelligence.query_builder import (
    ClinicalQuery,
    ClinicalQueryBuilder,
)
from classical_preprocessing.clinical_intelligence.retrieval import (
    BM25LexicalRetriever,
    BiomedicalSemanticReranker,
    CrossEncoderReranker,
    IdentityReranker,
    MedicalEvidenceRetriever,
    get_configured_reranker,
)

__all__ = [
    # Contracts & Adapters
    "QuantumPrediction",
    "ClinicalPrediction",
    "ModelComparison",
    "ExplainabilityAttribution",
    "PostQuantumResult",
    "EvidenceItem",
    "ClinicalReport",
    "post_quantum_result_from_payload",
    "post_quantum_result_to_dict",
    "post_quantum_result_from_dict",
    # Ingestion
    "DocumentChunk",
    "generate_deterministic_chunk_id",
    "ingest_json_knowledge_base",
    "ingest_knowledge_directory",
    # Query Builder & Prompting
    "ClinicalQuery",
    "ClinicalQueryBuilder",
    "ClinicalPromptBuilder",
    # Evidence & Retrieval
    "EvidenceBundle",
    "BM25LexicalRetriever",
    "IdentityReranker",
    "BiomedicalSemanticReranker",
    "CrossEncoderReranker",
    "get_configured_reranker",
    "MedicalEvidenceRetriever",
    # Phase 3 LLM
    "ClinicalLLMRequest",
    "ClinicalLLMResponse",
    "ClinicalLLM",
    "MockLLMProvider",
    "APIProvider",
    "extract_json_payload",
    "generate_fallback_clinical_report",
    "validate_and_build_report",
    "generate_clinical_report",
    # Phase 4 API & Orchestrator
    "build_api_response_payload",
    "build_api_error_payload",
    "run_clinical_analysis",
]
