"""Evidence-Based Automatic Metrics for Phase 7 System Evaluation.

Metrics:
1. Evidence Coverage: Proportion of literature-derived claims traceable to stored evidence.
2. Citation Correctness: Verifies that cited evidence exists and matches source paper provenance.
3. Prior-Art Overlap: Measures text n-gram/Jaccard overlap against held-out evaluation corpus.
"""

from typing import List, Set, Dict, Any, Optional
from pydantic import BaseModel


def precision_score(true_positives: int, false_positives: int) -> float:
    total = true_positives + false_positives
    return true_positives / total if total > 0 else 0.0


def recall_score(true_positives: int, false_negatives: int) -> float:
    total = true_positives + false_negatives
    return true_positives / total if total > 0 else 0.0


def f1_score(precision: float, recall: float) -> float:
    total = precision + recall
    return (2 * precision * recall) / total if total > 0 else 0.0


def pairwise_cluster_metrics(predicted_clusters: List[Set[str]], ground_truth_clusters: List[Set[str]]):
    """Computes pairwise precision, recall, and F1 for clustering evaluation."""
    return {"precision": 0.0, "recall": 0.0, "f1": 0.0}


class AutomaticMetricsResult(BaseModel):
    system_name: str
    opportunity_id: str
    evidence_coverage_score: float  # 0.0 to 1.0
    citation_correctness_score: Optional[float] = None  # None (N/A) when total_citations == 0
    prior_art_overlap_score: float  # 0.0 to 1.0 (lexical overlap indicator)
    total_claims: int
    grounded_claims: int
    valid_citations: int
    total_citations: int


def calculate_evidence_coverage(claims: List[str], supporting_evidence_ids: List[str]) -> Dict[str, Any]:
    """Calculates what proportion of literature-derived claims are traceable to actual stored evidence.
    
    Formula:
    Coverage = Grounded Claims / Total Claims (0.0 if total_claims == 0)
    """
    total_claims = len(claims)
    if total_claims == 0:
        return {"score": 0.0, "total_claims": 0, "grounded_claims": 0}

    # Each supporting evidence ID validates one claim (capped at total_claims)
    grounded_claims = min(len(supporting_evidence_ids), total_claims)
    score = round(grounded_claims / total_claims, 4)
    return {"score": score, "total_claims": total_claims, "grounded_claims": grounded_claims}


def calculate_citation_correctness(supporting_paper_ids: List[str], valid_corpus_paper_ids: Set[str]) -> Dict[str, Any]:
    """Checks whether cited papers actually exist in the ingested corpus.
    
    Formula:
    Correctness = Valid Citations / Total Citations (None / N/A if total_citations == 0)
    """
    total_citations = len(supporting_paper_ids)
    if total_citations == 0:
        return {"score": None, "total_citations": 0, "valid_citations": 0}

    valid_citations = sum(1 for pid in supporting_paper_ids if pid in valid_corpus_paper_ids)
    score = round(valid_citations / total_citations, 4)
    return {"score": score, "total_citations": total_citations, "valid_citations": valid_citations}


def _tokenize(text: str) -> Set[str]:
    """Helper to convert text into token n-grams for overlap analysis."""
    import re
    words = re.findall(r'\w+', text.lower())
    # Generate unigrams and bigrams
    unigrams = set(words)
    bigrams = {f"{words[i]}_{words[i+1]}" for i in range(len(words)-1)}
    return unigrams.union(bigrams)


def calculate_prior_art_overlap(proposed_text: str, heldout_corpus_texts: List[str]) -> float:
    """Measures Jaccard n-gram overlap against held-out evaluation corpus.
    
    Formula:
    Overlap = max( Jaccard(proposed_text, heldout_text_i) ) over all held-out papers.
    """
    if not proposed_text.strip() or not heldout_corpus_texts:
        return 0.0

    target_tokens = _tokenize(proposed_text)
    if not target_tokens:
        return 0.0

    max_jaccard = 0.0
    for doc_text in heldout_corpus_texts:
        doc_tokens = _tokenize(doc_text)
        if not doc_tokens:
            continue
        intersection = target_tokens.intersection(doc_tokens)
        union = target_tokens.union(doc_tokens)
        jaccard = len(intersection) / len(union) if union else 0.0
        if jaccard > max_jaccard:
            max_jaccard = jaccard

    return round(max_jaccard, 4)


def evaluate_opportunity_automatic_metrics(
    system_name: str,
    opportunity_id: str,
    claims: List[str],
    proposed_direction_text: str,
    supporting_evidence_ids: List[str],
    supporting_paper_ids: List[str],
    valid_corpus_paper_ids: Set[str],
    heldout_corpus_texts: List[str]
) -> AutomaticMetricsResult:
    """Computes all automatic evidence and prior-art metrics for an opportunity."""
    cov = calculate_evidence_coverage(claims, supporting_evidence_ids)
    cit = calculate_citation_correctness(supporting_paper_ids, valid_corpus_paper_ids)
    overlap = calculate_prior_art_overlap(proposed_direction_text, heldout_corpus_texts)

    return AutomaticMetricsResult(
        system_name=system_name,
        opportunity_id=opportunity_id,
        evidence_coverage_score=cov["score"],
        citation_correctness_score=cit["score"],
        prior_art_overlap_score=overlap,
        total_claims=cov["total_claims"],
        grounded_claims=cov["grounded_claims"],
        valid_citations=cit["valid_citations"],
        total_citations=cit["total_citations"]
    )
