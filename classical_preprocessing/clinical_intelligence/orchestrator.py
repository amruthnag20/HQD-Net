"""
Backend Pipeline Orchestrator for Post-Quantum Clinical Intelligence (Phase 4 & 5).

Connects raw clinical inputs to HQDNetPipelineRunner, converts outputs into PostQuantumResult,
retrieves medical evidence via BM25, generates structured ClinicalReport via ClinicalLLM,
and formats the resulting API payload for frontend consumption.
Ensures single-pass execution per request without duplicate model runs.
"""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from classical_preprocessing.clinical_intelligence.api_contract import (
    build_api_error_payload,
    build_api_response_payload,
)
from classical_preprocessing.clinical_intelligence.contracts import post_quantum_result_from_payload
from classical_preprocessing.clinical_intelligence.ingestion import DocumentChunk, ingest_knowledge_directory
from classical_preprocessing.clinical_intelligence.llm import ClinicalLLM, generate_clinical_report
from classical_preprocessing.clinical_intelligence.retrieval import MedicalEvidenceRetriever
from classical_preprocessing.pipeline_runner import run_hqd_real_pipeline

# Knowledge Base Disk Chunk Cache to prevent redundant directory parsing
_KB_CACHE: Dict[str, List[DocumentChunk]] = {}


def _get_cached_kb_chunks(kb_dir: str) -> List[DocumentChunk]:
    """Caches ingested knowledge base chunks by directory path."""
    if kb_dir not in _KB_CACHE:
        if os.path.exists(kb_dir):
            _KB_CACHE[kb_dir] = ingest_knowledge_directory(kb_dir)
        else:
            _KB_CACHE[kb_dir] = []
    return _KB_CACHE[kb_dir]


def run_clinical_analysis(
    raw_features: Optional[List[float]] = None,
    tabular_file_path: Optional[Union[str, Path]] = None,
    image_2d_path: Optional[Union[str, Path]] = None,
    image_3d_path: Optional[Union[str, Path]] = None,
    backend_choice: str = "VQC",
    kb_dir: str = "knowledge_base",
    llm_provider: Optional[ClinicalLLM] = None,
) -> Dict[str, Any]:
    """
    Executes the end-to-end clinical intelligence analysis pipeline in a single pass.

    Parameters
    ----------
    raw_features : Optional[List[float]]
        24-feature clinical array.
    tabular_file_path : Optional[Union[str, Path]]
        CSV/XLSX file path.
    image_2d_path : Optional[Union[str, Path]]
        2D Chest X-Ray image file path.
    image_3d_path : Optional[Union[str, Path]]
        3D NIfTI/DICOM volume file path.
    backend_choice : str
        Quantum core backend selection ("VQC" or "QSVM").
    kb_dir : str
        Directory path containing medical knowledge base files.
    llm_provider : Optional[ClinicalLLM]
        Optional LLM provider instance (defaults to MockLLMProvider).

    Returns
    -------
    Dict[str, Any]
        Stable API response payload.
    """
    try:
        # 1. Run core preprocessing & quantum model pipeline (ONE execution)
        tab_input = tabular_file_path if tabular_file_path is not None else raw_features

        raw_payload = run_hqd_real_pipeline(
            tabular_input=tab_input,
            image_2d_input=image_2d_path,
            image_3d_input=image_3d_path,
            backend_choice=backend_choice,
        )

        if raw_payload.get("status") == "error":
            return build_api_error_payload("PREPROCESSING_ERROR", raw_payload.get("error_message", "Unknown error"))

        # 2. Parse into validated PostQuantumResult contract
        post_q_result = post_quantum_result_from_payload(raw_payload)

        # 3. Retrieve Evidence from Knowledge Base
        chunks = _get_cached_kb_chunks(kb_dir)
        retrieval_engine = MedicalEvidenceRetriever(chunks)
        evidence_bundle = retrieval_engine.retrieve_evidence(post_q_result, top_k=3)

        # 4. Generate Evidence-Grounded Clinical Report
        clinical_report = generate_clinical_report(post_q_result, evidence_bundle, llm=llm_provider)

        # 5. Build and return stable API payload
        return build_api_response_payload(post_q_result, evidence_bundle, clinical_report)

    except Exception as err:
        return build_api_error_payload("PIPELINE_EXECUTION_ERROR", str(err))
