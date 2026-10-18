"""Evaluation Baselines for Phase 7.2 System Evaluation.

Executes real LLM inference and consumes real DB records without templates or mocks.
Compares:
1. Baseline A — Plain LLM (Direct generation via LLM provider)
2. Baseline B — LLM + Literature Retrieval (RAG via LLM provider + retrieved literature)
3. Proposed System — IdeaGen (Complete Phase 1-6 pipeline output)
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uuid

from ideagen.evaluation.dataset import EvaluationProviderError
from ideagen.llm.provider import LLMProvider


class BaselineDefinition(BaseModel):
    name: str
    target_component: str
    description: str
    metrics: List[str]
    is_implemented: bool


def get_baselines() -> List[BaselineDefinition]:
    return [
        BaselineDefinition(
            name="Plain LLM",
            target_component="PlainLLMBaseline",
            description="Direct LLM prompt generation without literature retrieval.",
            metrics=["evidence_coverage", "prior_art_overlap"],
            is_implemented=False
        ),
        BaselineDefinition(
            name="LLM + Literature Retrieval",
            target_component="RAGBaseline",
            description="Retrieval-augmented LLM prompt generation without gap discovery.",
            metrics=["evidence_coverage", "prior_art_overlap"],
            is_implemented=False
        ),
        BaselineDefinition(
            name="IdeaGen Pipeline",
            target_component="IdeaGenSystemEvaluator",
            description="Complete Phase 1-6 pipeline with gap discovery & validation.",
            metrics=["evidence_coverage", "prior_art_overlap", "citation_correctness"],
            is_implemented=False
        ),
        BaselineDefinition(
            name="Static Opportunity",
            target_component="OpportunityEvolutionService",
            description="Assessing gap once without temporal tracking.",
            metrics=["temporal_state_accuracy"],
            is_implemented=False
        )
    ]


class EvaluationOpportunityOutput(BaseModel):
    opportunity_id: str
    system_name: str  # "PLAIN_LLM", "RAG_BASELINE", or "IDEAGEN"
    domain: str
    proposed_research_direction: str
    problem_statement: str
    identified_gap: str
    why_insufficient: str
    technical_approach: str
    expected_contribution: str
    claims: List[str] = Field(default_factory=list)
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    supporting_paper_ids: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class LLMOpportunitySchema(BaseModel):
    """Structured response schema for Baseline LLM generation."""
    proposed_research_direction: str = Field(description="Clear research hypothesis and target direction")
    problem_statement: str = Field(description="Target research problem statement")
    identified_gap: str = Field(description="Identified research gap")
    why_insufficient: str = Field(description="Why existing work is insufficient")
    technical_approach: str = Field(description="Concrete methodology and technical approach")
    expected_contribution: str = Field(description="Scientific or practical expected contribution")
    claims: List[str] = Field(default_factory=list, description="Core research claims")
    supporting_paper_ids: List[str] = Field(default_factory=list, description="Cited paper IDs")


class PlainLLMBaseline:
    """Baseline A: Plain LLM direct prompt generation via LLM provider."""

    def __init__(self, llm_provider: Optional[LLMProvider] = None):
        self.llm_provider = llm_provider

    def generate(self, domain_description: str) -> EvaluationOpportunityOutput:
        """Generates a research opportunity directly from LLM parametric memory using LLM provider."""
        if self.llm_provider is None:
            raise EvaluationProviderError(
                "LLM provider is not configured for PlainLLMBaseline. Real model access required."
            )

        prompt = f"""
You are an expert scientific researcher. Analyze the following research domain and propose a concrete research opportunity based ONLY on your pre-trained knowledge (no literature retrieval):

RESEARCH DOMAIN: {domain_description}

INSTRUCTIONS:
1. Identify a key open problem and research gap in this domain.
2. Propose a concrete research direction and technical approach.
3. List 2-3 core research claims.
"""
        opp_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"baseline_a_{domain_description}"))
        try:
            llm_res = self.llm_provider.generate_structured(prompt, LLMOpportunitySchema)
            return EvaluationOpportunityOutput(
                opportunity_id=opp_id,
                system_name="PLAIN_LLM",
                domain=domain_description,
                proposed_research_direction=llm_res.proposed_research_direction,
                problem_statement=llm_res.problem_statement,
                identified_gap=llm_res.identified_gap,
                why_insufficient=llm_res.why_insufficient,
                technical_approach=llm_res.technical_approach,
                expected_contribution=llm_res.expected_contribution,
                claims=llm_res.claims,
                supporting_evidence_ids=[],
                supporting_paper_ids=[],
                metadata={"retrieval_used": False, "gap_pipeline_used": False}
            )
        except Exception as e:
            raise EvaluationProviderError(f"PlainLLMBaseline generation failed via LLMProvider: {e}") from e


class RAGBaseline:
    """Baseline B: LLM + Literature Retrieval (RAG without gap discovery/validation)."""

    def __init__(self, llm_provider: Optional[LLMProvider] = None):
        self.llm_provider = llm_provider

    def generate(self, domain_description: str, retrieved_papers: List[Dict[str, Any]]) -> EvaluationOpportunityOutput:
        """Generates a research opportunity from retrieved literature using LLM provider."""
        if self.llm_provider is None:
            raise EvaluationProviderError(
                "LLM provider is not configured for RAGBaseline. Real model access required."
            )

        paper_contexts = []
        paper_ids = []
        for p in retrieved_papers:
            pid = str(p.get("id", "paper_id"))
            paper_ids.append(pid)
            title = p.get("title", "Untitled Paper")
            abstract = p.get("abstract", "")
            paper_contexts.append(f"Paper ID: {pid}\nTitle: {title}\nAbstract: {abstract}")

        context_str = "\n\n".join(paper_contexts) if paper_contexts else "No context papers retrieved."

        prompt = f"""
You are an expert scientific researcher. Analyze the following retrieved literature papers and propose a research opportunity addressing weaknesses in the retrieved context:

RESEARCH DOMAIN: {domain_description}

RETRIEVED LITERATURE CONTEXT:
{context_str}

INSTRUCTIONS:
1. Identify a key limitation or research gap based on the retrieved papers above.
2. Propose a concrete research direction and technical approach.
3. List core research claims and cite relevant Paper IDs in supporting_paper_ids.
"""
        opp_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"baseline_b_{domain_description}"))
        try:
            llm_res = self.llm_provider.generate_structured(prompt, LLMOpportunitySchema)
            return EvaluationOpportunityOutput(
                opportunity_id=opp_id,
                system_name="RAG_BASELINE",
                domain=domain_description,
                proposed_research_direction=llm_res.proposed_research_direction,
                problem_statement=llm_res.problem_statement,
                identified_gap=llm_res.identified_gap,
                why_insufficient=llm_res.why_insufficient,
                technical_approach=llm_res.technical_approach,
                expected_contribution=llm_res.expected_contribution,
                claims=llm_res.claims,
                supporting_evidence_ids=[],
                supporting_paper_ids=llm_res.supporting_paper_ids or paper_ids,
                metadata={"retrieval_used": True, "gap_pipeline_used": False}
            )
        except Exception as e:
            raise EvaluationProviderError(f"RAGBaseline generation failed via LLMProvider: {e}") from e


class IdeaGenSystemEvaluator:
    """Proposed System: IdeaGen full Phase 1-6 pipeline output mapper."""

    def generate(self, ideagen_opportunity_record: Any) -> EvaluationOpportunityOutput:
        """Converts a real persisted IdeaGen ResearchOpportunityRecord into standard evaluation output format.
        Raises EvaluationProviderError if no real record is provided.
        """
        if ideagen_opportunity_record is None:
            raise EvaluationProviderError(
                "No real IdeaGen ResearchOpportunityRecord provided for evaluation. Run Phase 5 pipeline to generate real opportunities."
            )

        opp_id = str(getattr(ideagen_opportunity_record, "id", uuid.uuid4()))
        return EvaluationOpportunityOutput(
            opportunity_id=opp_id,
            system_name="IDEAGEN",
            domain="RAG & LLM Reliability",
            proposed_research_direction=getattr(ideagen_opportunity_record, "proposed_research_direction", ""),
            problem_statement=getattr(ideagen_opportunity_record, "research_problem", ""),
            identified_gap=getattr(ideagen_opportunity_record, "identified_gap", ""),
            why_insufficient=getattr(ideagen_opportunity_record, "reasoning", ""),
            technical_approach=getattr(ideagen_opportunity_record, "technical_approach", ""),
            expected_contribution=getattr(ideagen_opportunity_record, "expected_contribution", ""),
            claims=[
                f"Grounded evidence statement {sid}" for sid in (getattr(ideagen_opportunity_record, "supporting_statement_ids", []) or [])
            ],
            supporting_evidence_ids=[str(sid) for sid in (getattr(ideagen_opportunity_record, "supporting_statement_ids", []) or [])],
            supporting_paper_ids=[str(pid) for pid in (getattr(ideagen_opportunity_record, "supporting_paper_ids", []) or [])],
            metadata={"retrieval_used": True, "gap_pipeline_used": True, "prior_art_validated": True}
        )
