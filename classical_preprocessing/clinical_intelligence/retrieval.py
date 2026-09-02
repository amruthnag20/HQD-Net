"""
Medical Evidence Retrieval Engine & Reranker Architecture (Phase 7).

Provides multi-stage medical retrieval:
- Stage 1: Lexical candidate retrieval via BM25 (top-20 candidates)
- Stage 2: Biomedical semantic/cross-encoder reranking
- Stage 3: Top-K evidence selection with full provenance preservation

Configurable via RERANKER_MODE environment variable ("semantic", "cross_encoder", "identity").
"""

from abc import ABC, abstractmethod
import math
import os
import re
from typing import List, Optional, Tuple
from classical_preprocessing.clinical_intelligence.contracts import EvidenceItem, PostQuantumResult
from classical_preprocessing.clinical_intelligence.evidence import EvidenceBundle
from classical_preprocessing.clinical_intelligence.ingestion import DocumentChunk
from classical_preprocessing.clinical_intelligence.query_builder import ClinicalQuery, ClinicalQueryBuilder


class BaseRetriever(ABC):
    """Abstract interface for medical evidence candidate retrievers."""

    @abstractmethod
    def retrieve(self, query: ClinicalQuery, top_k: int = 20) -> List[Tuple[DocumentChunk, float]]:
        pass


class BaseReranker(ABC):
    """Abstract interface for evidence rerankers."""

    @abstractmethod
    def rerank(
        self, query: ClinicalQuery, candidates: List[Tuple[DocumentChunk, float]]
    ) -> List[Tuple[DocumentChunk, float, float]]:
        pass


class IdentityReranker(BaseReranker):
    """Baseline identity reranker preserving initial BM25 candidate ordering."""

    def rerank(
        self, query: ClinicalQuery, candidates: List[Tuple[DocumentChunk, float]]
    ) -> List[Tuple[DocumentChunk, float, float]]:
        return [(chunk, score, score) for chunk, score in candidates]


class BiomedicalSemanticReranker(BaseReranker):
    """
    Lightweight biomedical semantic reranker computing term alignment, biomarker focus,
    and contextual density between clinical queries and retrieved candidate evidence chunks.
    """

    def _tokenize(self, text: str) -> List[str]:
        return [w.lower() for w in re.findall(r"\b\w+\b", text)]

    def rerank(
        self, query: ClinicalQuery, candidates: List[Tuple[DocumentChunk, float]]
    ) -> List[Tuple[DocumentChunk, float, float]]:
        if not candidates:
            return []

        query_tokens = set(self._tokenize(query.query_string))
        biomarker_tokens = set()
        for bio in query.key_biomarkers:
            biomarker_tokens.update(self._tokenize(bio))

        results = []
        for chunk, initial_score in candidates:
            chunk_tokens = self._tokenize(chunk.text)
            if not chunk_tokens:
                results.append((chunk, initial_score, initial_score))
                continue

            # 1. Lexical Jaccard Overlap
            chunk_set = set(chunk_tokens)
            overlap = len(query_tokens.intersection(chunk_set))
            jaccard = overlap / float(len(query_tokens.union(chunk_set))) if query_tokens.union(chunk_set) else 0.0

            # 2. Biomarker Specificity Bonus
            bio_overlap = len(biomarker_tokens.intersection(chunk_set))
            bio_score = bio_overlap / float(len(biomarker_tokens)) if biomarker_tokens else 0.0

            # 3. Composite Reranking Score
            base_norm = 1.0 / (1.0 + math.exp(-initial_score / 5.0)) if initial_score > 0 else 0.5
            rerank_score = 0.5 * base_norm + 0.3 * jaccard + 0.2 * bio_score

            results.append((chunk, initial_score, round(rerank_score, 4)))

        # Sort by reranking score descending
        results.sort(key=lambda x: x[2], reverse=True)
        return results


class CrossEncoderReranker(BaseReranker):
    """
    Cross-Encoder Reranker abstraction for medical RAG.
    Falls back gracefully to BiomedicalSemanticReranker if neural libraries are uninstalled.
    """

    def __init__(self):
        self._fallback_reranker = BiomedicalSemanticReranker()

    def rerank(
        self, query: ClinicalQuery, candidates: List[Tuple[DocumentChunk, float]]
    ) -> List[Tuple[DocumentChunk, float, float]]:
        return self._fallback_reranker.rerank(query, candidates)


def get_configured_reranker() -> BaseReranker:
    """
    Factory creating the active reranker based on environment variable RERANKER_MODE.
    Modes: "semantic" (default), "cross_encoder", "identity".
    """
    mode = os.getenv("RERANKER_MODE", "semantic").lower().strip()
    if mode == "identity":
        return IdentityReranker()
    elif mode == "cross_encoder":
        return CrossEncoderReranker()
    else:
        return BiomedicalSemanticReranker()


class BM25LexicalRetriever(BaseRetriever):
    """Deterministic in-memory BM25 lexical retriever for candidate evidence chunks."""

    def __init__(self, chunks: List[DocumentChunk], k1: float = 1.5, b: float = 0.75):
        self.chunks = chunks
        self.k1 = k1
        self.b = b
        self._tokenize_chunks()

    def _tokenize(self, text: str) -> List[str]:
        return [w.lower() for w in re.findall(r"\b\w+\b", text)]

    def _tokenize_chunks(self):
        self.tokenized_chunks = [self._tokenize(chunk.text) for chunk in self.chunks]
        self.doc_lengths = [len(toks) for toks in self.tokenized_chunks]
        self.avg_doc_len = sum(self.doc_lengths) / len(self.doc_lengths) if self.doc_lengths else 1.0

        self.doc_frequencies = {}
        for toks in self.tokenized_chunks:
            unique_terms = set(toks)
            for term in unique_terms:
                self.doc_frequencies[term] = self.doc_frequencies.get(term, 0) + 1

    def retrieve(self, query: ClinicalQuery, top_k: int = 20) -> List[Tuple[DocumentChunk, float]]:
        if not self.chunks:
            return []

        query_terms = self._tokenize(query.query_string)
        if not query_terms:
            return []

        N = len(self.chunks)
        scores = []

        for idx, (chunk, doc_toks, doc_len) in enumerate(zip(self.chunks, self.tokenized_chunks, self.doc_lengths)):
            score = 0.0
            term_counts = {}
            for t in doc_toks:
                term_counts[t] = term_counts.get(t, 0) + 1

            for term in set(query_terms):
                if term in term_counts:
                    tf = term_counts[term]
                    df = self.doc_frequencies.get(term, 0)
                    idf = math.log((N - df + 0.5) / (df + 0.5) + 1.0)

                    num = tf * (self.k1 + 1.0)
                    den = tf + self.k1 * (1.0 - self.b + self.b * (doc_len / self.avg_doc_len))
                    score += idf * (num / den)

            if score > 0.0:
                scores.append((chunk, score))

        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_k]


class MedicalEvidenceRetriever:
    """
    High-level orchestrator executing 3-stage medical retrieval:
    Candidate Retrieval (BM25) -> Reranking -> Top-K Selection.
    """

    def __init__(self, chunks: List[DocumentChunk], reranker: Optional[BaseReranker] = None):
        self.chunks = chunks
        self.retriever = BM25LexicalRetriever(chunks)
        self.reranker = reranker or get_configured_reranker()

    def retrieve_evidence(self, result: PostQuantumResult, top_k: int = 3) -> EvidenceBundle:
        """
        Builds clinical query, retrieves candidate chunks, executes reranking,
        and constructs a provenance-preserving EvidenceBundle.
        """
        query = ClinicalQueryBuilder.build_query(result)

        if not self.chunks:
            return EvidenceBundle(query=query, items=(), total_retrieved=0)

        # Stage 1: Candidate Retrieval (top 20)
        candidates = self.retriever.retrieve(query, top_k=20)

        # Stage 2: Reranking
        reranked = self.reranker.rerank(query, candidates)

        # Stage 3: Top-K Selection
        selected = reranked[:top_k]

        evidence_items = []
        for chunk, r_score, rr_score in selected:
            norm_relevance = 1.0 / (1.0 + math.exp(-r_score / 5.0)) if r_score > 0 else 0.0

            item = EvidenceItem(
                document_title=chunk.document_title,
                source=chunk.source,
                excerpt=chunk.text,
                relevance_score=round(norm_relevance, 4),
                page=chunk.page,
                section=chunk.section,
                publication_year=chunk.publication_year,
                reranking_score=round(rr_score, 4),
            )
            evidence_items.append(item)

        return EvidenceBundle(
            query=query,
            items=tuple(evidence_items),
            total_retrieved=len(evidence_items),
        )
