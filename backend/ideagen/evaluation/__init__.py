"""Phase 7 Evaluation Package for IdeaGen."""

from ideagen.evaluation.dataset import (
    EvaluationDatasetSplit,
    EvaluationDatasetManager,
    EvaluationLeakageError,
    EvaluationTask,
    create_sample_rag_reliability_dataset,
)
from ideagen.evaluation.baselines import (
    PlainLLMBaseline,
    RAGBaseline,
    IdeaGenSystemEvaluator,
    EvaluationOpportunityOutput,
    get_baselines,
)
from ideagen.evaluation.blinding import BlindingManager, BlindedOpportunity
from ideagen.evaluation.metrics import (
    AutomaticMetricsResult,
    evaluate_opportunity_automatic_metrics,
    calculate_evidence_coverage,
    calculate_citation_correctness,
    calculate_prior_art_overlap,
    precision_score,
    recall_score,
    f1_score,
    pairwise_cluster_metrics,
)
from ideagen.evaluation.human_eval import (
    HumanRating,
    HumanEvaluationPackage,
    HumanEvaluationRepository,
)
from ideagen.evaluation.stats import (
    compute_descriptive_stats,
    compute_kruskal_wallis,
    compute_inter_annotator_agreement,
)
from ideagen.evaluation.runner import (
    EvaluationPipelineRunner,
    FullEvaluationReport,
    TaskEvaluationResult,
    SystemAggregateSummary,
)

__all__ = [
    "EvaluationDatasetSplit",
    "EvaluationDatasetManager",
    "EvaluationLeakageError",
    "create_sample_rag_reliability_dataset",
    "PlainLLMBaseline",
    "RAGBaseline",
    "IdeaGenSystemEvaluator",
    "EvaluationOpportunityOutput",
    "BlindingManager",
    "BlindedOpportunity",
    "AutomaticMetricsResult",
    "evaluate_opportunity_automatic_metrics",
    "calculate_evidence_coverage",
    "calculate_citation_correctness",
    "calculate_prior_art_overlap",
    "HumanRating",
    "HumanEvaluationPackage",
    "HumanEvaluationRepository",
    "compute_descriptive_stats",
    "compute_kruskal_wallis",
    "compute_inter_annotator_agreement",
    "EvaluationPipelineRunner",
    "FullEvaluationReport",
    "SystemEvaluationSummary",
]
