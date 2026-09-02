"""
Medical Knowledge Base Ingestion & Provenance Chunking (Phase 2).

Provides deterministic ingestion of medical documents, clinical guidelines,
and literature references, partitioning content into provenance-preserving chunks.
"""

from dataclasses import dataclass
import hashlib
import json
import os
from typing import List, Optional


@dataclass(frozen=True)
class DocumentChunk:
    """
    Immutable representation of a document text chunk with mandatory provenance metadata.
    """

    chunk_id: str
    document_id: str
    document_title: str
    source: str
    text: str
    publication_year: Optional[int] = None
    page: Optional[int] = None
    section: Optional[str] = None

    def __post_init__(self):
        if not isinstance(self.chunk_id, str) or not self.chunk_id.strip():
            raise ValueError("chunk_id must be a non-empty string.")
        if not isinstance(self.document_id, str) or not self.document_id.strip():
            raise ValueError("document_id must be a non-empty string.")
        if not isinstance(self.document_title, str) or not self.document_title.strip():
            raise ValueError("document_title must be a non-empty string.")
        if not isinstance(self.source, str) or not self.source.strip():
            raise ValueError("source must be a non-empty string.")
        if not isinstance(self.text, str) or not self.text.strip():
            raise ValueError("text must be a non-empty string.")


def generate_deterministic_chunk_id(doc_id: str, section: Optional[str], page: Optional[int], index: int) -> str:
    """
    Generates a deterministic SHA-256 derived chunk ID from document metadata and chunk index.
    """
    raw_key = f"{doc_id}:{section or 'NO_SECTION'}:{page or 0}:{index}"
    digest = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()[:12]
    return f"CHUNK_{doc_id}_{digest}"


def ingest_json_knowledge_base(file_path: str) -> List[DocumentChunk]:
    """
    Ingests a structured JSON clinical guideline file into a list of provenance-preserving DocumentChunk objects.

    Parameters
    ----------
    file_path : str
        Path to the JSON knowledge base file.

    Returns
    -------
    List[DocumentChunk]
        List of ingested immutable DocumentChunk objects.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Knowledge base file not found at: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError(f"Expected list of document objects in JSON knowledge base, got {type(data).__name__}")

    chunks: List[DocumentChunk] = []

    for doc in data:
        doc_id = str(doc.get("document_id", "DOC_UNKNOWN"))
        doc_title = str(doc.get("document_title", "Untitled Document"))
        source = str(doc.get("source", "Unknown Source"))
        pub_year = doc.get("publication_year")
        if pub_year is not None:
            try:
                pub_year = int(pub_year)
            except (ValueError, TypeError):
                pub_year = None

        sections = doc.get("sections", [])
        for idx, sec in enumerate(sections):
            sec_name = str(sec.get("section_name", f"Section {idx + 1}"))
            page_num = sec.get("page")
            if page_num is not None:
                try:
                    page_num = int(page_num)
                except (ValueError, TypeError):
                    page_num = None

            content = str(sec.get("content", "")).strip()
            if not content:
                continue

            chunk_id = generate_deterministic_chunk_id(doc_id, sec_name, page_num, idx)

            chunk = DocumentChunk(
                chunk_id=chunk_id,
                document_id=doc_id,
                document_title=doc_title,
                source=source,
                text=content,
                publication_year=pub_year,
                page=page_num,
                section=sec_name,
            )
            chunks.append(chunk)

    return chunks


def ingest_knowledge_directory(dir_path: str) -> List[DocumentChunk]:
    """
    Scans a directory for JSON knowledge base files and ingests all document chunks.
    """
    if not os.path.exists(dir_path):
        return []

    all_chunks: List[DocumentChunk] = []
    for root, _, files in os.walk(dir_path):
        for f in files:
            if f.endswith(".json"):
                full_path = os.path.join(root, f)
                all_chunks.extend(ingest_json_knowledge_base(full_path))

    return all_chunks
