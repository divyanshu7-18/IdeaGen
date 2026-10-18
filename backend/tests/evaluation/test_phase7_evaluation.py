"""Comprehensive unit and integration tests for Phase 7.1: Final Evaluation Dataset & Experiment Run."""

import pytest
import tempfile
from pathlib import Path
import json

from ideagen.evaluation.dataset import (
    EvaluationPaperMetadata,
    EvaluationDatasetSplit,
    EvaluationDatasetManager,
    EvaluationLeakageError,
    EvaluationProviderError,
    create_sample_rag_reliability_dataset,
)
from ideagen.evaluation.baselines import (
    PlainLLMBaseline,
    RAGBaseline,
    IdeaGenSystemEvaluator,
)
from ideagen.evaluation.blinding import BlindingManager
from ideagen.evaluation.metrics import (
    calculate_evidence_coverage,
    calculate_citation_correctness,
    calculate_prior_art_overlap,
    evaluate_opportunity_automatic_metrics,
)
from ideagen.evaluation.human_eval import (
    HumanRating,
    HumanEvaluationRepository,
    HumanEvaluationPackage,
)
from ideagen.evaluation.stats import (
    compute_descriptive_stats,
    compute_kruskal_wallis,
    compute_inter_annotator_agreement,
)
from ideagen.evaluation.runner import EvaluationPipelineRunner


def test_leakage_detection_raises_error_on_overlap():
    """Verifies that EvaluationLeakageError is raised if generation and held-out corpora overlap."""
    gen_paper = EvaluationPaperMetadata(
        id="p1",
        source_id="W100",
        title="Paper A",
        doi="10.1000/182",
        content_hash="hash_a",
        abstract="Abstract A"
    )
    heldout_leak_paper = EvaluationPaperMetadata(
        id="p2",
        source_id="W100",  # Duplicate source_id -> LEAKAGE!
        title="Paper A Copy",
        doi="10.1000/999",
        content_hash="hash_b",
        abstract="Abstract B"
    )

    invalid_split = EvaluationDatasetSplit(
        generation_corpus=[gen_paper],
        heldout_evaluation_corpus=[heldout_leak_paper]
    )

    with pytest.raises(EvaluationLeakageError, match="Data leakage detected"):
        EvaluationDatasetManager(invalid_split)


def test_12_evaluation_tasks_dataset_and_leakage_pass():
    """Verifies that 12 evaluation tasks are generated and pass leakage checks."""
    valid_split = create_sample_rag_reliability_dataset()
    manager = EvaluationDatasetManager(valid_split)
    assert manager.split.domain == "RAG & LLM Reliability"
    assert len(manager.split.tasks) == 12
    assert len(manager.split.generation_corpus) == 24
    assert len(manager.split.heldout_evaluation_corpus) == 12

    # Check task IDs
    task_ids = [t.task_id for t in manager.split.tasks]
    assert "task_01_hallucination_detection" in task_ids
    assert "task_12_prior_art_validation" in task_ids


def test_baselines_require_real_llm_provider():
    """Verifies that baselines raise EvaluationProviderError when LLMProvider is missing or fails."""
    plain = PlainLLMBaseline(llm_provider=None)
    with pytest.raises(EvaluationProviderError, match="LLM provider is not configured"):
        plain.generate("RAG Reliability")

    rag = RAGBaseline(llm_provider=None)
    with pytest.raises(EvaluationProviderError, match="LLM provider is not configured"):
        rag.generate("RAG Reliability", [{"id": "p1", "title": "RAG Paper"}])


def test_ideagen_evaluator_requires_real_record():
    """Verifies that IdeaGenSystemEvaluator rejects missing / None records."""
    evaluator = IdeaGenSystemEvaluator()
    with pytest.raises(EvaluationProviderError, match="No real IdeaGen ResearchOpportunityRecord provided"):
        evaluator.generate(None)


def test_real_llm_provider_interface_invocation():
    """Verifies that PlainLLMBaseline and RAGBaseline invoke real LLMProvider interface with schema."""
    from unittest.mock import MagicMock
    from ideagen.evaluation.baselines import LLMOpportunitySchema

    mock_provider = MagicMock()
    mock_provider.model_name = "qwen3:8b"
    mock_provider.generate_structured.return_value = LLMOpportunitySchema(
        proposed_research_direction="Grounded Direction",
        problem_statement="Problem statement details",
        identified_gap="Identified gap statement",
        why_insufficient="Why insufficient details",
        technical_approach="Technical approach details",
        expected_contribution="Quantified contribution",
        supporting_paper_ids=["p1"]
    )

    plain = PlainLLMBaseline(llm_provider=mock_provider)
    out_a = plain.generate("RAG Reliability")
    assert out_a.system_name == "PLAIN_LLM"
    assert out_a.metadata["retrieval_used"] is False
    assert out_a.proposed_research_direction == "Grounded Direction"
    mock_provider.generate_structured.assert_called()

    mock_provider.reset_mock()
    mock_provider.generate_structured.return_value = LLMOpportunitySchema(
        proposed_research_direction="RAG Grounded Direction",
        problem_statement="Problem statement details",
        identified_gap="Identified gap statement",
        why_insufficient="Why insufficient details",
        technical_approach="Technical approach details",
        expected_contribution="Quantified contribution",
        supporting_paper_ids=["p1"]
    )

    rag = RAGBaseline(llm_provider=mock_provider)
    out_b = rag.generate("RAG Reliability", [{"id": "p1", "title": "RAG Paper", "abstract": "Abs"}])
    assert out_b.system_name == "RAG_BASELINE"
    assert out_b.metadata["retrieval_used"] is True
    assert len(out_b.supporting_paper_ids) == 1


def test_blinding_and_anonymization():
    """Verifies deterministic system anonymization and secret key unblinding."""
    blinding = BlindingManager(seed=123)
    blinded_a = blinding.blind_opportunity(
        system_name="PLAIN_LLM",
        real_opportunity_id="opp_plain_1",
        opportunity_data={"proposed_research_direction": "Test Dir"}
    )
    assert blinded_a.anonymized_system_label in ["SYSTEM_A", "SYSTEM_B", "SYSTEM_C"]
    assert "PLAIN_LLM" not in blinded_a.anonymized_system_label

    key = blinding.get_blinding_key()
    assert key.seed == 123
    assert key.system_map[blinded_a.anonymized_system_label] == "PLAIN_LLM"


def test_citation_correctness_returns_none_when_zero_citations():
    """Verifies that citation correctness returns None (N/A) when total citations == 0."""
    cit_zero = calculate_citation_correctness([], {"p1", "p2"})
    assert cit_zero["score"] is None
    assert cit_zero["total_citations"] == 0

    cit_valid = calculate_citation_correctness(["p1"], {"p1", "p2"})
    assert cit_valid["score"] == 1.0


def test_pending_human_data_protection():
    """Verifies that HumanEvaluationRepository defaults to PENDING_HUMAN_DATA without fake scores."""
    repo = HumanEvaluationRepository()
    package = repo.get_package()
    assert package.status == "PENDING_HUMAN_DATA"
    assert package.total_evaluators == 0
    assert len(package.ratings) == 0

    repo.add_rating(HumanRating(
        opportunity_id="opp_1",
        system_condition="SYSTEM_A",
        anonymized_presentation_id="anon_1",
        evaluator_id="evaluator_dr_smith",
        relevance=5,
        novelty=4,
        evidence_support=4,
        feasibility=5,
        usefulness=5
    ))

    package_updated = repo.get_package()
    assert package_updated.status == "COMPLETED"
    assert package_updated.total_evaluators == 1


def test_descriptive_and_inferential_statistics():
    """Verifies descriptive stats (mean, median, std, 95% CI) and Kruskal-Wallis calculation."""
    stats = compute_descriptive_stats([1.0, 2.0, 3.0, 4.0, 5.0])
    assert stats["mean"] == 3.0
    assert stats["median"] == 3.0
    assert len(stats["ci_95"]) == 2

    groups = {
        "PLAIN_LLM": [0.1, 0.2, 0.2],
        "RAG_BASELINE": [0.5, 0.6, 0.5],
        "IDEAGEN": [0.9, 1.0, 0.9]
    }
    kw_res = compute_kruskal_wallis(groups)
    assert kw_res["test"] == "Kruskal-Wallis H"
    assert kw_res["h_stat"] > 0.0


def test_evaluation_runner_with_mock_provider(tmp_path):
    """Verifies EvaluationPipelineRunner executes tasks across 3 systems using structured LLM outputs."""
    from unittest.mock import MagicMock
    from ideagen.evaluation.baselines import LLMOpportunitySchema

    mock_provider = MagicMock()
    mock_provider.model_name = "qwen3:8b"
    mock_provider.generate_structured.return_value = LLMOpportunitySchema(
        proposed_research_direction="Mocked Direction",
        problem_statement="Mocked Problem",
        identified_gap="Mocked Gap",
        why_insufficient="Mocked Reasoning",
        technical_approach="Mocked Approach",
        expected_contribution="Mocked Contribution",
        supporting_paper_ids=["p1"]
    )

    mock_record = type("Record", (), {
        "id": "opp_123",
        "proposed_research_direction": "Grounded Direction",
        "research_problem": "Problem",
        "identified_gap": "Gap",
        "reasoning": "Reasoning",
        "technical_approach": "Approach",
        "expected_contribution": "Contribution",
        "supporting_statement_ids": ["s1"],
        "supporting_paper_ids": ["p1"]
    })()

    split = create_sample_rag_reliability_dataset()
    split.tasks = split.tasks[:1]  # 1 task

    runner = EvaluationPipelineRunner(dataset_split=split, llm_provider=mock_provider, seed=99)
    report = runner.run_evaluation(ideagen_opportunity_records=[mock_record])

    assert report.leakage_check_passed is True
    assert report.total_tasks == 1
    assert report.total_opportunities_generated == 3
    assert len(report.task_results) == 3
    assert len(report.system_summaries) == 3

    json_path, csv_path = runner.export_results(report, tmp_path)
    assert json_path.exists()
    assert csv_path.exists()

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        assert data["total_opportunities_generated"] == 3
        assert data["leakage_check_passed"] is True


def test_load_persisted_evaluation_dataset_filters_fixtures_and_out_of_domain():
    """Verifies that load_persisted_evaluation_dataset excludes test fixtures, out-of-domain papers, and assigns 12 tasks with zero leakage."""
    from ideagen.db.session import SessionLocal
    from ideagen.evaluation.dataset import load_persisted_evaluation_dataset, EvaluationDatasetManager

    db = SessionLocal()
    try:
        split = load_persisted_evaluation_dataset(db)
        mgr = EvaluationDatasetManager(split)

        assert len(split.generation_corpus) == 24
        assert len(split.heldout_evaluation_corpus) == 12
        assert len(split.tasks) == 12

        all_selected = split.generation_corpus + split.heldout_evaluation_corpus
        for p in all_selected:
            t_lower = (p.title or "").lower()
            s_lower = (p.source_id or "").lower()
            assert "test1.pdf" not in t_lower and "test1.pdf" not in s_lower
            assert "test2.pdf" not in t_lower and "test2.pdf" not in s_lower
            assert "test3.pdf" not in t_lower and "test3.pdf" not in s_lower
            assert p.source_id not in ["arxiv_2311.16502", "arxiv_2305.14314"]

        gen_sources = {p.source_id for p in split.generation_corpus}
        held_sources = {p.source_id for p in split.heldout_evaluation_corpus}
        assert len(gen_sources & held_sources) == 0
    finally:
        db.close()
