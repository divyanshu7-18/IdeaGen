from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import datetime

class DemoPaper(BaseModel):
    id: str
    title: str
    date: Optional[datetime.date]

class DemoDiscovery(BaseModel):
    cluster_size: int
    papers: List[DemoPaper]

class DemoGroundedClaim(BaseModel):
    text: str
    refs: List[str]

class DemoEvidence(BaseModel):
    source_id: str
    title: str
    text: str

class DemoGrounding(BaseModel):
    claims: List[DemoGroundedClaim]
    evidence: List[DemoEvidence]

class DemoTimelineEvent(BaseModel):
    relationship: str
    paper_title: str
    paper_date: Optional[datetime.date]
    status_change: str
    excerpt: str

class DemoTimelineBatch(BaseModel):
    batch_id: str
    name: str
    events: List[DemoTimelineEvent]

class DemoLeakageProtection(BaseModel):
    future_paper: str
    future_date: Optional[datetime.date]
    result: str

class DemoScenarioResponse(BaseModel):
    opportunity_id: str
    title: str
    problem_statement: str
    initial_status: str
    final_status: str
    discovery: DemoDiscovery
    grounding: DemoGrounding
    timeline: List[DemoTimelineBatch]
    leakage_protection: DemoLeakageProtection

class DemoOpportunityOverview(BaseModel):
    opportunity_id: str
    title: str
    problem_statement: str
    status: str
    confidence: float
    supporting_papers_count: int
    evidence_count: int

class SearchResultPaper(BaseModel):
    id: str
    source: str
    title: str
    authors: List[str]
    publication_year: int
    publication_date: str
    abstract: str
    url: Optional[str]
    doi: Optional[str]
    raw_metadata: Dict[str, Any]

class SearchResponse(BaseModel):
    query: str
    source: str
    count: int
    papers: List[SearchResultPaper]

class AnalyzeRequest(BaseModel):
    papers: List[SearchResultPaper]
