"""Blinding and Anonymization System for Phase 7 Evaluation."""

from pydantic import BaseModel
from typing import Dict, List, Any
import random
import hashlib


class BlindedOpportunity(BaseModel):
    anonymized_id: str
    anonymized_system_label: str  # e.g., SYSTEM_A, SYSTEM_B, SYSTEM_C
    domain: str
    proposed_research_direction: str
    problem_statement: str
    identified_gap: str
    technical_approach: str
    expected_contribution: str
    claims: List[str]


class BlindingMappingKey(BaseModel):
    seed: int
    system_map: Dict[str, str]  # e.g., {"SYSTEM_A": "PLAIN_LLM", "SYSTEM_B": "RAG_BASELINE", "SYSTEM_C": "IDEAGEN"}
    opportunity_map: Dict[str, str]  # e.g., {"ANON_OPP_1": "real_opp_id_123"}


class BlindingManager:
    """Manages system anonymization and presentation order randomization."""

    def __init__(self, seed: int = 42):
        self.seed = seed
        self.rng = random.Random(seed)
        self.system_names = ["PLAIN_LLM", "RAG_BASELINE", "IDEAGEN"]
        
        # Shuffle system assignments deterministically
        labels = ["SYSTEM_A", "SYSTEM_B", "SYSTEM_C"]
        shuffled_names = list(self.system_names)
        self.rng.shuffle(shuffled_names)
        
        self.system_to_label: Dict[str, str] = dict(zip(shuffled_names, labels))
        self.label_to_system: Dict[str, str] = dict(zip(labels, shuffled_names))
        self.opportunity_map: Dict[str, str] = {}

    def blind_opportunity(self, system_name: str, real_opportunity_id: str, opportunity_data: Dict[str, Any]) -> BlindedOpportunity:
        """Converts an opportunity output into a blinded, anonymized format for evaluation."""
        if system_name not in self.system_to_label:
            raise ValueError(f"Unknown system name: {system_name}")

        anon_label = self.system_to_label[system_name]
        anon_id = f"ANON_{hashlib.sha256(f'{self.seed}_{real_opportunity_id}'.encode()).hexdigest()[:12]}"
        self.opportunity_map[anon_id] = real_opportunity_id

        return BlindedOpportunity(
            anonymized_id=anon_id,
            anonymized_system_label=anon_label,
            domain=opportunity_data.get("domain", "RAG Reliability"),
            proposed_research_direction=opportunity_data.get("proposed_research_direction", ""),
            problem_statement=opportunity_data.get("problem_statement", ""),
            identified_gap=opportunity_data.get("identified_gap", ""),
            technical_approach=opportunity_data.get("technical_approach", ""),
            expected_contribution=opportunity_data.get("expected_contribution", ""),
            claims=opportunity_data.get("claims", [])
        )

    def get_blinding_key(self) -> BlindingMappingKey:
        """Returns the secret mapping key for unblinding evaluation results."""
        return BlindingMappingKey(
            seed=self.seed,
            system_map=self.label_to_system,
            opportunity_map=self.opportunity_map
        )
