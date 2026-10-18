"""Human Evaluation Infrastructure & Data Schemas for Phase 7.

Dimensions (1-5 Likert scale):
1. Relevance
2. Novelty / distinctiveness
3. Evidence support
4. Feasibility
5. Usefulness

Strictly enforces:
If real human ratings are not yet submitted, marks status as PENDING_HUMAN_DATA.
No fake or synthetic human ratings are fabricated.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime


class HumanRating(BaseModel):
    opportunity_id: str
    system_condition: str  # Blinded: SYSTEM_A, SYSTEM_B, SYSTEM_C
    anonymized_presentation_id: str
    evaluator_id: str
    relevance: int = Field(ge=1, le=5, description="1-5 Likert scale rating for relevance")
    novelty: int = Field(ge=1, le=5, description="1-5 Likert scale rating for novelty")
    evidence_support: int = Field(ge=1, le=5, description="1-5 Likert scale rating for evidence support")
    feasibility: int = Field(ge=1, le=5, description="1-5 Likert scale rating for feasibility")
    usefulness: int = Field(ge=1, le=5, description="1-5 Likert scale rating for usefulness")
    comments: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class HumanEvaluationPackage(BaseModel):
    status: str = "PENDING_HUMAN_DATA"  # "PENDING_HUMAN_DATA" or "COMPLETED"
    instruction_text: str = (
        "Rate each anonymized research opportunity from 1 (Very Low) to 5 (Very High) across "
        "Relevance, Novelty, Evidence Support, Feasibility, and Usefulness."
    )
    total_evaluators: int = 0
    ratings: List[HumanRating] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class HumanEvaluationRepository:
    """Manages collection and persistence of human evaluation ratings."""

    def __init__(self, ratings: Optional[List[HumanRating]] = None):
        self.ratings: List[HumanRating] = ratings or []

    def add_rating(self, rating: HumanRating) -> None:
        self.ratings.append(rating)

    def get_package(self) -> HumanEvaluationPackage:
        if not self.ratings:
            return HumanEvaluationPackage(
                status="PENDING_HUMAN_DATA",
                total_evaluators=0,
                ratings=[],
                metadata={"note": "No human ratings submitted yet. Evaluation infrastructure ready."}
            )

        evaluators = {r.evaluator_id for r in self.ratings}
        return HumanEvaluationPackage(
            status="COMPLETED",
            total_evaluators=len(evaluators),
            ratings=self.ratings,
            metadata={"submitted_ratings_count": len(self.ratings)}
        )
