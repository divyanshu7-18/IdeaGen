"""Regression tests for Phase 8.4: Duplicate-Paper Independence and Prior-Art Coverage."""

import uuid
import pytest
from ideagen.discovery.canonical_identity import get_canonical_paper_identity
from ideagen.discovery.models import GapCandidate, ValidationVerdict, GapStatus
from ideagen.discovery.pattern_analyzer import ResearchPatternAnalyzer
from ideagen.discovery.grouper import SemanticCluster
from ideagen.discovery.validator import GapValidator
from ideagen.llm.provider import LLMProvider


class FakeLLMProvider:
    """Mock LLM provider that always votes VALID for test purposes."""
    def __init__(self, verdict: ValidationVerdict = ValidationVerdict.VALID):
        self.verdict = verdict
        self.model_name = "mock-validator"

    def generate_structured(self, prompt: str, response_schema: type):
        from ideagen.discovery.models import GapValidationResult
        return GapValidationResult(
            verdict=self.verdict,
            reasoning="Mock scientific critique reasoning",
            supporting_evidence_statement_ids=[],
            counter_evidence_statement_ids=[],
            confidence=0.8,
        )


class MockStatement:
    def __init__(self, stmt_id: uuid.UUID, paper_id: uuid.UUID, stmt_type: str, text: str):
        self.id = stmt_id
        self.paper_id = paper_id
        self.statement_type = stmt_type
        self.statement_text = text
        self.section = "Abstract"
        self.page_start = 1
        self.page_end = 1


def test_canonical_paper_identity_doi_arxiv_normalization():
    """Verify that versioned and unversioned arXiv DOIs map to the identical canonical key."""
    paper_a = {
        "id": uuid.uuid4(),
        "doi": "https://doi.org/10.48550/arXiv.2510.22344",
        "title": "FAIR-RAG: Faithful Adaptive Iterative Refinement for Retrieval-Augmented Generation",
    }
    paper_b = {
        "id": uuid.uuid4(),
        "doi": "https://doi.org/10.48550/arXiv.2510.22344v1",
        "title": "FAIR-RAG: Faithful Adaptive Iterative Refinement for Retrieval-Augmented Generation",
    }
    paper_c = {
        "id": uuid.uuid4(),
        "doi": "https://doi.org/10.48550/arXiv.2401.99999",
        "title": "A Different Paper on Dense Retrieval",
    }

    key_a = get_canonical_paper_identity(paper_a)
    key_b = get_canonical_paper_identity(paper_b)
    key_c = get_canonical_paper_identity(paper_c)

    assert key_a == "arxiv:2510.22344"
    assert key_b == "arxiv:2510.22344"
    assert key_a == key_b, "Duplicate papers with versioned DOIs must yield identical canonical key"
    assert key_a != key_c, "Distinct papers must yield distinct canonical keys"


def test_canonical_paper_identity_title_fallback():
    """Verify title normalization when DOIs are missing."""
    paper_1 = {"id": uuid.uuid4(), "title": "Retrieval-Augmented Generation for Large Language Models: A Survey"}
    paper_2 = {"id": uuid.uuid4(), "title": "retrieval augmented generation for large language models a survey"}

    key_1 = get_canonical_paper_identity(paper_1)
    key_2 = get_canonical_paper_identity(paper_2)

    assert key_1 == key_2
    assert key_1.startswith("title:")


def test_duplicate_paper_not_counted_as_independent_in_pattern_analyzer():
    """Verify that duplicate papers do not increment contributing_canonical_paper_count."""
    paper_id_1 = uuid.uuid4()
    paper_id_2 = uuid.uuid4()

    paper_map = {
        paper_id_1: {"id": paper_id_1, "doi": "https://doi.org/10.48550/arXiv.2510.22344", "title": "FAIR-RAG"},
        paper_id_2: {"id": paper_id_2, "doi": "https://doi.org/10.48550/arXiv.2510.22344v1", "title": "FAIR-RAG"},
    }

    s1 = MockStatement(uuid.uuid4(), paper_id_1, "LIMITATION", "Method struggles with multihop.")
    s2 = MockStatement(uuid.uuid4(), paper_id_2, "FUTURE_WORK", "Extension to multimodal reasoning.")

    import numpy as np
    cluster = SemanticCluster(
        cluster_id=0,
        statements=[s1, s2],
        paper_ids={paper_id_1, paper_id_2},
        centroid=np.zeros(768, dtype=np.float32),
        statement_type_counts={"LIMITATION": 1, "FUTURE_WORK": 1},
    )

    analyzer = ResearchPatternAnalyzer(min_supporting_evidence=2, paper_map=paper_map)
    candidates = analyzer.analyze_clusters([cluster])

    assert len(candidates) == 1
    cand = candidates[0]
    # Raw UUID count is 2, but canonical paper count MUST be 1
    assert cand.signals["contributing_paper_count"] == 2
    assert cand.signals["contributing_canonical_paper_count"] == 1


def test_gap_validator_rejects_single_canonical_paper_when_multi_paper_required():
    """Verify that GapValidator rejects candidates lacking independent canonical paper corroboration."""
    paper_id_1 = uuid.uuid4()
    paper_id_2 = uuid.uuid4()

    paper_map = {
        paper_id_1: {"id": paper_id_1, "doi": "https://doi.org/10.48550/arXiv.2510.22344", "title": "FAIR-RAG"},
        paper_id_2: {"id": paper_id_2, "doi": "https://doi.org/10.48550/arXiv.2510.22344v1", "title": "FAIR-RAG"},
    }

    s1_id = uuid.uuid4()
    s2_id = uuid.uuid4()
    s1 = MockStatement(s1_id, paper_id_1, "LIMITATION", "RAG multi-hop limitation.")
    s2 = MockStatement(s2_id, paper_id_2, "FUTURE_WORK", "Multimodal extension.")

    statements_by_id = {s1_id: s1, s2_id: s2}

    candidate = GapCandidate(
        gap_statement="Multimodal RAG limitation",
        research_problem="RAG multi-hop falters",
        why_existing_work_insufficient="Existing work lacks multimodal extension",
        supporting_statement_ids=[s1_id, s2_id],
        supporting_paper_ids=[paper_id_1, paper_id_2],
        relevant_limitations=["RAG multi-hop limitation."],
        relevant_future_work=["Multimodal extension."],
        signals={},
    )

    fake_llm = FakeLLMProvider(verdict=ValidationVerdict.VALID)
    # Require at least 2 distinct independent canonical papers
    validator = GapValidator(
        provider=fake_llm,
        min_valid_evidence=2,
        paper_map=paper_map,
        min_independent_papers=2,
    )

    result_dto = validator.validate_candidate(candidate=candidate, statements_by_id=statements_by_id)

    # Must be REJECTED despite LLM voting VALID because canonical papers == 1
    assert result_dto.status == GapStatus.REJECTED
    assert "requires >= 2 distinct canonical work(s)" in result_dto.validation_reasoning
    assert result_dto.metadata.get("canonical_paper_count") == 1
