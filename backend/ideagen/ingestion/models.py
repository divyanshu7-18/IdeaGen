from datetime import date, datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field

import enum

class SourceType(str, enum.Enum):
    OPENALEX_API = "OPENALEX_API"
    OPENALEX_SNAPSHOT = "OPENALEX_SNAPSHOT"
    MANUAL_UPLOAD = "MANUAL_UPLOAD"

class TemporalBatch(BaseModel):
    id: str
    start_date: date
    end_date: date

class PaperCreateDTO(BaseModel):
    source_type: SourceType
    source_id: str
    doi: Optional[str] = None
    title: str
    publication_date: Optional[date] = None
    batch_id: str
    abstract: str
    authors: List[Dict[str, Any]] = Field(default_factory=list)
    referenced_works: List[str] = Field(default_factory=list)
    raw_metadata: Dict[str, Any] = Field(default_factory=dict)

class IngestionConfig(BaseModel):
    query_filters: Dict[str, str] = Field(description="OpenAlex query filters (e.g. title_and_abstract.search)")
    polite_email: str
    base_url: str = "https://api.openalex.org/works"
    per_page: int = 50

class PaperDocumentCreateDTO(BaseModel):
    paper_id: UUID
    full_text: str
    extraction_method: str
    extraction_version: str
    extracted_at: datetime
