"""Evaluation Dataset Management & Leakage Detection for Phase 7.2.

Constructs reproducible evaluation tasks and loads real persisted corpus papers from PostgreSQL.
Strictly enforces zero leakage between generation and held-out corpora.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Set, Optional, Any
import hashlib
import uuid


class EvaluationProviderError(Exception):
    """Raised when an LLM provider or database service is unavailable during evaluation."""
    pass


class EvaluationLeakageError(Exception):
    """Raised when paper leakage is detected between generation and held-out evaluation corpora."""
    pass


class EvaluationPaperMetadata(BaseModel):
    id: str
    source_id: str
    title: str
    doi: Optional[str] = None
    content_hash: Optional[str] = None
    abstract: str
    domain_tags: List[str] = Field(default_factory=list)


class EvaluationTask(BaseModel):
    task_id: str
    name: str
    research_problem: str
    domain_tag: str
    generation_corpus: List[EvaluationPaperMetadata]
    heldout_corpus: List[EvaluationPaperMetadata]


class EvaluationDatasetSplit(BaseModel):
    dataset_version: str = "v2.0-real-corpus"
    domain: str = "RAG & LLM Reliability"
    tasks: List[EvaluationTask] = Field(default_factory=list)
    generation_corpus: List[EvaluationPaperMetadata] = Field(default_factory=list)
    heldout_evaluation_corpus: List[EvaluationPaperMetadata] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class EvaluationDatasetManager:
    """Manages evaluation datasets and strictly enforces leakage prevention."""

    def __init__(self, split: EvaluationDatasetSplit):
        self.split = split
        self.verify_no_leakage()

    def verify_no_leakage(self) -> None:
        """Verifies zero overlap between generation and held-out evaluation sets."""
        gen_source_ids = {p.source_id for p in self.split.generation_corpus if p.source_id}
        heldout_source_ids = {p.source_id for p in self.split.heldout_evaluation_corpus if p.source_id}
        source_id_overlap = gen_source_ids.intersection(heldout_source_ids)
        if source_id_overlap:
            raise EvaluationLeakageError(
                f"Data leakage detected! Overlapping source_ids between generation and held-out corpora: {source_id_overlap}"
            )

        gen_dois = {p.doi for p in self.split.generation_corpus if p.doi}
        heldout_dois = {p.doi for p in self.split.heldout_evaluation_corpus if p.doi}
        doi_overlap = gen_dois.intersection(heldout_dois)
        if doi_overlap:
            raise EvaluationLeakageError(
                f"Data leakage detected! Overlapping DOIs between generation and held-out corpora: {doi_overlap}"
            )

        gen_hashes = {p.content_hash for p in self.split.generation_corpus if p.content_hash}
        heldout_hashes = {p.content_hash for p in self.split.heldout_evaluation_corpus if p.content_hash}
        hash_overlap = gen_hashes.intersection(heldout_hashes)
        if hash_overlap:
            raise EvaluationLeakageError(
                f"Data leakage detected! Overlapping content hashes between generation and held-out corpora: {hash_overlap}"
            )

        for task in self.split.tasks:
            t_gen_sids = {p.source_id for p in task.generation_corpus if p.source_id}
            t_held_sids = {p.source_id for p in task.heldout_corpus if p.source_id}
            if t_gen_sids.intersection(t_held_sids):
                raise EvaluationLeakageError(f"Data leakage in task {task.task_id} by source_id")

            t_gen_dois = {p.doi for p in task.generation_corpus if p.doi}
            t_held_dois = {p.doi for p in task.heldout_corpus if p.doi}
            if t_gen_dois.intersection(t_held_dois):
                raise EvaluationLeakageError(f"Data leakage in task {task.task_id} by DOI")

            t_gen_hashes = {p.content_hash for p in task.generation_corpus if p.content_hash}
            t_held_hashes = {p.content_hash for p in task.heldout_corpus if p.content_hash}
            if t_gen_hashes.intersection(t_held_hashes):
                raise EvaluationLeakageError(f"Data leakage in task {task.task_id} by content hash")


def _make_paper(num: int, is_heldout: bool, tag: str) -> EvaluationPaperMetadata:
    prefix = "heldout" if is_heldout else "gen"
    sid = f"openalex_{prefix}_{num:04d}"
    doi = f"10.48550/arXiv.2026.{num:04d}"
    content_str = f"paper_content_{prefix}_{num}"
    chash = hashlib.sha256(content_str.encode()).hexdigest()

    return EvaluationPaperMetadata(
        id=str(uuid.uuid5(uuid.NAMESPACE_DNS, sid)),
        source_id=sid,
        title=f"Scientific Paper on {tag.replace('_', ' ').title()} #{num}",
        doi=doi,
        content_hash=chash,
        abstract=f"Comprehensive empirical study evaluating {tag} in RAG systems.",
        domain_tags=[tag]
    )


def create_sample_rag_reliability_dataset() -> EvaluationDatasetSplit:
    """Creates a 12-task evaluation dataset split for RAG/LLM Reliability domain."""
    task_definitions = [
        ("task_01_hallucination_detection", "Hallucination Detection", "Mitigating fabricated statements during retrieval synthesis.", "hallucination"),
        ("task_02_citation_reliability", "Citation Reliability", "Verifying reference attribution and avoiding fake citations.", "citation_reliability"),
        ("task_03_context_compression", "Context Compression", "Compressing long passages without losing critical facts.", "context_compression"),
        ("task_04_long_context_rag", "Long-Context RAG", "Handling 32k+ token context windows in dense retrieval.", "long_context_rag"),
        ("task_05_retrieval_efficiency", "Retrieval Efficiency", "Latency vs precision trade-offs in vector reranking.", "retrieval_efficiency"),
        ("task_06_factuality_verification", "Factuality Verification", "Automated claim-level verification using knowledge graphs.", "factuality"),
        ("task_07_active_retrieval_triggering", "Active Retrieval Triggering", "Dynamic confidence-based retrieval during generation.", "retrieval_quality"),
        ("task_08_evidence_grounding", "Evidence Grounding", "Tracing generated statements to exact passage spans.", "evidence_grounding"),
        ("task_09_noisy_context_filtering", "Noisy Context Filtering", "Filtering irrelevant retrieved passages before prompting.", "retrieval_quality"),
        ("task_10_contradiction_resolution", "Contradiction Resolution", "Resolving conflicting claims across literature sources.", "factuality"),
        ("task_11_multidoc_summarization", "Multi-Doc Summarization", "Synthesizing research gap statements across papers.", "evidence_grounding"),
        ("task_12_prior_art_validation", "Prior-Art Validation", "Assessing opportunity novelty against held-out papers.", "citation_reliability"),
    ]

    all_gen_papers = []
    all_heldout_papers = []
    tasks = []

    paper_idx = 1
    for task_id, name, prob, tag in task_definitions:
        g_paper1 = _make_paper(paper_idx, is_heldout=False, tag=tag)
        g_paper2 = _make_paper(paper_idx + 1, is_heldout=False, tag=tag)
        h_paper = _make_paper(paper_idx + 100, is_heldout=True, tag=tag)

        paper_idx += 2

        all_gen_papers.extend([g_paper1, g_paper2])
        all_heldout_papers.append(h_paper)

        tasks.append(EvaluationTask(
            task_id=task_id,
            name=name,
            research_problem=prob,
            domain_tag=tag,
            generation_corpus=[g_paper1, g_paper2],
            heldout_corpus=[h_paper]
        ))

    return EvaluationDatasetSplit(
        dataset_version="v1.1-rag-reliability-12tasks",
        domain="RAG & LLM Reliability",
        tasks=tasks,
        generation_corpus=all_gen_papers,
        heldout_evaluation_corpus=all_heldout_papers,
        metadata={
            "created_at": "2026-10-06T22:39:00Z",
            "task_count": len(tasks),
            "split_strategy": "per_task_disjoint_heldout"
        }
    )


def load_persisted_evaluation_dataset(db_session: Any) -> EvaluationDatasetSplit:
    """Loads real persisted scientific literature papers from PostgreSQL database for evaluation split.
    Excludes synthetic test fixtures (test1.pdf, test2.pdf, test3.pdf) and out-of-domain papers (MMMU, QLoRA).
    Raises EvaluationProviderError if fewer than 36 valid literature papers exist in DB.
    """
    from ideagen.db.models import Paper

    all_papers = db_session.query(Paper).all()

    # Explicit out-of-domain paper IDs
    excluded_out_of_domain = {"arxiv_2311.16502", "arxiv_2305.14314"}

    valid_papers = []
    for p in all_papers:
        title_lower = (p.title or "").lower()
        source_lower = (p.source_id or "").lower()

        # 1. Exclude synthetic test fixtures
        if any(fix in title_lower or fix in source_lower for fix in ["test1.pdf", "test2.pdf", "test3.pdf"]):
            continue

        # 2. Exclude out-of-domain papers
        if p.source_id in excluded_out_of_domain:
            continue

        valid_papers.append(p)

    if len(valid_papers) < 36:
        raise EvaluationProviderError(
            f"Insufficient valid scientific literature papers in PostgreSQL database for 36-paper evaluation split. "
            f"Found {len(valid_papers)} valid papers (minimum 36 required: 24 generation + 12 held-out)."
        )

    def _convert(p) -> EvaluationPaperMetadata:
        chash = None
        if p.documents and p.documents[0].content_hash:
            chash = p.documents[0].content_hash
        return EvaluationPaperMetadata(
            id=str(p.id),
            source_id=p.source_id,
            title=p.title or f"Paper {p.source_id}",
            doi=p.doi,
            content_hash=chash,
            abstract=p.abstract or "",
            domain_tags=[p.source_type]
        )

    # Use first 36 valid literature papers deterministically
    selected_papers = valid_papers[:36]
    all_meta = [_convert(p) for p in selected_papers]

    gen_meta = all_meta[:24]
    heldout_meta = all_meta[24:36]

    task_definitions = [
        ("task_01_hallucination_detection", "Hallucination Detection", "Mitigating fabricated statements during retrieval synthesis.", "hallucination"),
        ("task_02_citation_reliability", "Citation Reliability", "Verifying reference attribution and avoiding fake citations.", "citation_reliability"),
        ("task_03_context_compression", "Context Compression", "Compressing long passages without losing critical facts.", "context_compression"),
        ("task_04_long_context_rag", "Long-Context RAG", "Handling 32k+ token context windows in dense retrieval.", "long_context_rag"),
        ("task_05_retrieval_efficiency", "Retrieval Efficiency", "Latency vs precision trade-offs in vector reranking.", "retrieval_efficiency"),
        ("task_06_factuality_verification", "Factuality Verification", "Automated claim-level verification using knowledge graphs.", "factuality"),
        ("task_07_active_retrieval_triggering", "Active Retrieval Triggering", "Dynamic confidence-based retrieval during generation.", "retrieval_quality"),
        ("task_08_evidence_grounding", "Evidence Grounding", "Tracing generated statements to exact passage spans.", "evidence_grounding"),
        ("task_09_noisy_context_filtering", "Noisy Context Filtering", "Filtering irrelevant retrieved passages before prompting.", "retrieval_quality"),
        ("task_10_contradiction_resolution", "Contradiction Resolution", "Resolving conflicting claims across literature sources.", "factuality"),
        ("task_11_multidoc_summarization", "Multi-Doc Summarization", "Synthesizing research gap statements across papers.", "evidence_grounding"),
        ("task_12_prior_art_validation", "Prior-Art Validation", "Assessing opportunity novelty against held-out papers.", "citation_reliability"),
    ]

    tasks = []
    for idx, (task_id, name, prob, tag) in enumerate(task_definitions):
        g1 = gen_meta[idx * 2]
        g2 = gen_meta[idx * 2 + 1]
        h = heldout_meta[idx]
        tasks.append(EvaluationTask(
            task_id=task_id,
            name=name,
            research_problem=prob,
            domain_tag=tag,
            generation_corpus=[g1, g2],
            heldout_corpus=[h]
        ))

    return EvaluationDatasetSplit(
        dataset_version="v2.1-clean-task-aligned-postgres-corpus",
        domain="RAG & LLM Reliability (Clean PostgreSQL Corpus)",
        tasks=tasks,
        generation_corpus=gen_meta,
        heldout_evaluation_corpus=heldout_meta,
        metadata={
            "is_real_postgres": True,
            "total_db_paper_count": len(all_papers),
            "valid_literature_paper_count": len(valid_papers),
            "selected_paper_count": len(selected_papers),
            "task_count": len(tasks),
            "excluded_test_fixtures": True,
            "excluded_out_of_domain": True
        }
    )
