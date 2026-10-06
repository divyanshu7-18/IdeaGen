import uuid
from datetime import date, datetime
from typing import Optional
import sqlalchemy
from sqlalchemy import String, Date, Text, DateTime, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB, ENUM
from sqlalchemy.sql import func, text
from ideagen.ingestion.models import SourceType

class Base(DeclarativeBase):
    pass

class Paper(Base):
    __tablename__ = "papers"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    source_type: Mapped[str] = mapped_column(
        ENUM(SourceType, name="source_type_enum", create_type=False)
    )
    source_id: Mapped[str] = mapped_column(String, index=True)
    doi: Mapped[str] = mapped_column(String, unique=True, nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    publication_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    batch_id: Mapped[str] = mapped_column(String, index=True)
    abstract: Mapped[str] = mapped_column(Text)
    authors: Mapped[list] = mapped_column(JSONB)
    referenced_works: Mapped[list] = mapped_column(JSONB)
    raw_metadata: Mapped[dict] = mapped_column(JSONB)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        Index(
            'idx_paper_openalex_identity', 
            'source_id', 
            unique=True, 
            postgresql_where=text("source_type IN ('OPENALEX_API', 'OPENALEX_SNAPSHOT')")
        ),
        Index(
            'idx_paper_manual_identity', 
            'source_id', 
            unique=True, 
            postgresql_where=text("source_type = 'MANUAL_UPLOAD'")
        ),
    )
    
    documents: Mapped[list["PaperDocument"]] = sqlalchemy.orm.relationship(back_populates="paper", cascade="all, delete-orphan")

class PaperDocument(Base):
    __tablename__ = "paper_documents"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    paper_id: Mapped[uuid.UUID] = mapped_column(sqlalchemy.ForeignKey("papers.id", ondelete="CASCADE"), index=True)
    full_text: Mapped[str] = mapped_column(Text)
    extraction_method: Mapped[str] = mapped_column(String)
    extraction_version: Mapped[str] = mapped_column(String)
    extracted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    content_hash: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    original_filename: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    acquisition_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    provenance_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    paper: Mapped["Paper"] = sqlalchemy.orm.relationship(back_populates="documents")
    passages: Mapped[list["PaperPassage"]] = sqlalchemy.orm.relationship(back_populates="document", cascade="all, delete-orphan", order_by="PaperPassage.passage_index")

class PaperPassage(Base):
    __tablename__ = "paper_passages"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    paper_id: Mapped[uuid.UUID] = mapped_column(sqlalchemy.ForeignKey("papers.id", ondelete="CASCADE"), index=True)
    document_id: Mapped[uuid.UUID] = mapped_column(sqlalchemy.ForeignKey("paper_documents.id", ondelete="CASCADE"), index=True)
    passage_index: Mapped[int] = mapped_column(sqlalchemy.Integer)
    page_start: Mapped[int] = mapped_column(sqlalchemy.Integer)
    page_end: Mapped[int] = mapped_column(sqlalchemy.Integer)
    section: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    text: Mapped[str] = mapped_column(Text)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_passage_doc_order', 'document_id', 'passage_index'),
    )
    
    document: Mapped["PaperDocument"] = sqlalchemy.orm.relationship(back_populates="passages")
    paper: Mapped["Paper"] = sqlalchemy.orm.relationship()

from ideagen.opportunity.models import OpportunityStatus, OpportunityRelationship
from sqlalchemy import Float, CheckConstraint

class Opportunity(Base):
    __tablename__ = "opportunities"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String)
    problem_statement: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        ENUM(OpportunityStatus, name="opportunity_status_enum", create_type=False)
    )
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint('confidence >= 0.0 AND confidence <= 1.0', name='check_confidence_bounds'),
    )
    
    evidence: Mapped[list["OpportunityEvidence"]] = relationship(back_populates="opportunity", cascade="all, delete-orphan")
    history: Mapped[list["OpportunityHistory"]] = relationship(back_populates="opportunity", cascade="all, delete-orphan")

class OpportunityEvidence(Base):
    __tablename__ = "opportunity_evidence"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    opportunity_id: Mapped[uuid.UUID] = mapped_column(sqlalchemy.ForeignKey("opportunities.id", ondelete="CASCADE"), index=True)
    paper_id: Mapped[uuid.UUID] = mapped_column(sqlalchemy.ForeignKey("papers.id", ondelete="RESTRICT"), index=True)
    evidence_type: Mapped[str] = mapped_column(
        ENUM(OpportunityRelationship, name="opportunity_relationship_enum", create_type=False)
    )
    supporting_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    opportunity: Mapped["Opportunity"] = relationship(back_populates="evidence")

class OpportunityHistory(Base):
    __tablename__ = "opportunity_history"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    opportunity_id: Mapped[uuid.UUID] = mapped_column(sqlalchemy.ForeignKey("opportunities.id", ondelete="CASCADE"), index=True)
    previous_status: Mapped[str] = mapped_column(
        ENUM(OpportunityStatus, name="opportunity_status_enum", create_type=False)
    )
    new_status: Mapped[str] = mapped_column(
        ENUM(OpportunityStatus, name="opportunity_status_enum", create_type=False)
    )
    trigger_type: Mapped[str] = mapped_column(
        ENUM(OpportunityRelationship, name="opportunity_relationship_enum", create_type=False)
    )
    evidence_id: Mapped[Optional[uuid.UUID]] = mapped_column(sqlalchemy.ForeignKey("opportunity_evidence.id", ondelete="SET NULL"), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    opportunity: Mapped["Opportunity"] = relationship(back_populates="history")

