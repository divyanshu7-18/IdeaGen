from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
import uuid
import datetime
import tempfile
import os
from pathlib import Path

from ideagen.db import get_db, Paper, SQLAlchemyPersistenceLayer
from ideagen.ingestion.models import PaperCreateDTO, PaperDocumentCreateDTO, SourceType
from ideagen.api.schema import DemoScenarioResponse, DemoOpportunityOverview, SearchResponse, AnalyzeRequest, SearchResultPaper
from ideagen.api.demo_service import build_demo_scenario
from ideagen.ingestion.search import ArxivSearchProvider
from ideagen.ingestion.pdf import ManualPDFIngestionService, PDFExtractionError
from ideagen.understanding import PaperUnderstandingPipeline, ResearchKnowledgeResponseDTO
from ideagen.discovery import SemanticGapDiscoveryPipeline, ResearchGapResponseDTO, GapStatus

app = FastAPI(title="IdeaGen API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """Verifies application health and PostgreSQL database connectivity."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "postgresql_connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection error: {e}")


@app.get("/api/papers", response_model=List[dict])
def list_papers(limit: int = 50, db: Session = Depends(get_db)):
    """Lists real persisted papers from PostgreSQL."""
    papers = db.query(Paper).order_by(Paper.created_at.desc()).limit(limit).all()
    return [
        {
            "id": str(p.id),
            "source_type": p.source_type,
            "source_id": p.source_id,
            "title": p.title,
            "publication_date": str(p.publication_date) if p.publication_date else None,
            "doi": p.doi,
            "abstract": p.abstract,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in papers
    ]


# ── Demo / Prototype endpoints (Scheduled for replacement in future phases) ──

@app.get("/api/demo/scenario", response_model=DemoScenarioResponse)
def run_demo_scenario():
    """Runs the controlled prototype scenario. Retained during Phase 1 foundation migration."""
    return build_demo_scenario()


@app.get("/api/demo/opportunities", response_model=List[DemoOpportunityOverview])
def get_demo_opportunities():
    """Returns read-only opportunity overview list for demo. Retained during Phase 1."""
    res = build_demo_scenario()
    overview = DemoOpportunityOverview(
        opportunity_id=res.opportunity_id,
        title=res.title,
        problem_statement=res.problem_statement,
        status=res.final_status,
        confidence=0.9,
        supporting_papers_count=res.discovery.cluster_size,
        evidence_count=len(res.grounding.evidence)
    )
    return [overview]


@app.get("/api/search/papers", response_model=SearchResponse)
def search_papers(q: str, limit: int = 10):
    provider = ArxivSearchProvider()
    results = provider.search(q, limit)
    return SearchResponse(
        query=q,
        source="ARXIV",
        count=len(results),
        papers=[r.model_dump() for r in results]
    )


@app.post("/api/search/analyze", response_model=DemoScenarioResponse)
def analyze_search_papers(req: AnalyzeRequest):
    raw_papers = [p.raw_metadata for p in req.papers]
    for p, raw in zip(req.papers, raw_papers):
        raw["abstract"] = p.abstract
        
    return build_demo_scenario(custom_raw_papers=raw_papers)


@app.get("/api/documents/{document_id}/passages")
def get_document_passages(document_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieves all deterministic passages for an ingested document."""
    persistence = SQLAlchemyPersistenceLayer(db)
    passages = persistence.get_passages_by_document(document_id)
    return [
        {
            "id": str(p.id),
            "paper_id": str(p.paper_id),
            "document_id": str(p.document_id),
            "passage_index": p.passage_index,
            "page_start": p.page_start,
            "page_end": p.page_end,
            "section": p.section,
            "text": p.text,
        }
        for p in passages
    ]


@app.post("/api/papers/upload", response_model=SearchResponse)
async def upload_papers(files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 files allowed.")
    
    persistence = SQLAlchemyPersistenceLayer(db)
    service = ManualPDFIngestionService(persistence=persistence)
    
    results = []
    
    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            continue
            
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = Path(tmp.name)
            
        try:
            extracted_text = service.extract_text(tmp_path)
            content_hash = service.compute_sha256(tmp_path)
            
            # Check if this exact PDF content was already ingested
            if persistence.document_exists_by_hash(content_hash):
                # Duplicate detected: avoid creating duplicate document representation
                existing_doc = persistence.get_document_by_hash(content_hash)
                if existing_doc and existing_doc.paper:
                    p = existing_doc.paper
                    results.append(SearchResultPaper(
                        id=f"W{p.id.hex[:10]}",
                        source="UPLOAD",
                        title=p.title or file.filename,
                        authors=p.authors or [],
                        publication_year=p.publication_date.year if p.publication_date else datetime.date.today().year,
                        publication_date=p.publication_date.isoformat() if p.publication_date else datetime.date.today().isoformat(),
                        abstract=p.abstract,
                        url=None,
                        doi=p.doi,
                        raw_metadata=p.raw_metadata or {}
                    ))
                    continue

            abstract = extracted_text[:1000]
            unique_source_id = f"upload_{uuid.uuid4().hex}"
            pub_date = datetime.date.today()
            now_ts = datetime.datetime.now(datetime.timezone.utc)
            
            # Persist to PostgreSQL database
            paper_dto = PaperCreateDTO(
                source_type=SourceType.MANUAL_UPLOAD,
                source_id=unique_source_id,
                title=file.filename,
                publication_date=pub_date,
                batch_id="manual",
                abstract=abstract,
                authors=[],
                referenced_works=[],
                raw_metadata={
                    "original_filename": file.filename,
                    "content_hash": content_hash,
                }
            )
            saved_id = persistence.save_paper(paper_dto)
            
            doc_dto = PaperDocumentCreateDTO(
                paper_id=saved_id,
                full_text=extracted_text,
                extraction_method=service.extraction_method,
                extraction_version=service.extraction_version,
                extracted_at=now_ts,
                content_hash=content_hash,
                original_filename=file.filename,
                acquisition_timestamp=now_ts,
                provenance_metadata={
                    "source_type": SourceType.MANUAL_UPLOAD.value,
                    "source_id": unique_source_id,
                    "content_hash": content_hash,
                    "original_filename": file.filename,
                    "extraction_version": service.extraction_version,
                }
            )
            saved_doc_id = persistence.save_paper_document(doc_dto)
            
            # Extract structured blocks and create passages
            try:
                _, block_units = service.extract_structured(tmp_path)
            except Exception:
                from ideagen.ingestion.passage_chunker import BlockUnit
                block_units = [
                    BlockUnit(text=p.strip(), page_number=1, section=None)
                    for p in extracted_text.split("\n\n")
                    if p.strip()
                ]

            passages = service.chunker.create_passages(
                blocks=block_units,
                paper_id=saved_id,
                document_id=saved_doc_id,
            )
            persistence.save_passages(passages)
            
            paper_id_str = f"W{saved_id.hex[:10]}"
            res = SearchResultPaper(
                id=paper_id_str,
                source="UPLOAD",
                title=file.filename,
                authors=[],
                publication_year=pub_date.year,
                publication_date=pub_date.isoformat(),
                abstract=abstract,
                url=None,
                doi=None,
                raw_metadata={
                    "id": paper_id_str,
                    "title": file.filename,
                    "publication_date": pub_date.isoformat(),
                    "publication_year": pub_date.year,
                    "doi": None,
                    "abstract": abstract,
                    "content_hash": content_hash,
                }
            )
            results.append(res)
            
        except PDFExtractionError:
            pass
        finally:
            if tmp_path.exists():
                os.unlink(tmp_path)
                
    if not results:
        raise HTTPException(status_code=400, detail="No readable PDFs found.")
        
    return SearchResponse(
        query="Upload",
        source="UPLOAD",
        count=len(results),
        papers=[r.model_dump() for r in results]
    )


@app.post("/api/papers/{paper_id}/understand", response_model=ResearchKnowledgeResponseDTO)
def understand_paper(paper_id: uuid.UUID, db: Session = Depends(get_db)):
    """Triggers AI paper understanding pipeline on an ingested paper."""
    persistence = SQLAlchemyPersistenceLayer(db)
    pipeline = PaperUnderstandingPipeline(persistence=persistence)
    try:
        return pipeline.understand_paper(paper_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Understanding pipeline failed: {str(e)}")


@app.get("/api/papers/{paper_id}/knowledge", response_model=ResearchKnowledgeResponseDTO)
def get_paper_knowledge(paper_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieves extracted research knowledge for a paper."""
    persistence = SQLAlchemyPersistenceLayer(db)
    pipeline = PaperUnderstandingPipeline(persistence=persistence)
    knowledge = pipeline.get_paper_knowledge(paper_id)
    if not knowledge:
        raise HTTPException(status_code=404, detail=f"No research knowledge found for paper {paper_id}")
    return knowledge


@app.get("/api/papers/{paper_id}/statements")
def get_paper_statements(paper_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieves all grounded research statements with provenance for a paper."""
    persistence = SQLAlchemyPersistenceLayer(db)
    statements = persistence.get_statements_by_paper(paper_id)
    return [
        {
            "id": str(s.id),
            "paper_id": str(s.paper_id),
            "passage_id": str(s.passage_id) if s.passage_id else None,
            "statement_text": s.statement_text,
            "statement_type": s.statement_type,
            "page_start": s.page_start,
            "page_end": s.page_end,
            "section": s.section,
            "confidence": s.confidence,
            "metadata": s.metadata_json or {},
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in statements
    ]


@app.post("/api/gaps/discover", response_model=List[ResearchGapResponseDTO])
def discover_research_gaps(db: Session = Depends(get_db)):
    """Triggers end-to-end semantic gap discovery across all research statements."""
    persistence = SQLAlchemyPersistenceLayer(db)
    pipeline = SemanticGapDiscoveryPipeline(persistence=persistence)
    try:
        return pipeline.discover_gaps()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Discovery pipeline failed: {str(e)}")


@app.get("/api/gaps", response_model=List[ResearchGapResponseDTO])
def list_research_gaps(status: Optional[GapStatus] = None, db: Session = Depends(get_db)):
    """Retrieves all discovered research gaps, optionally filtered by status."""
    persistence = SQLAlchemyPersistenceLayer(db)
    pipeline = SemanticGapDiscoveryPipeline(persistence=persistence)
    return pipeline.get_gaps(status=status)


@app.get("/api/gaps/{gap_id}", response_model=ResearchGapResponseDTO)
def get_research_gap(gap_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieves a specific research gap by ID with evidence count and details."""
    persistence = SQLAlchemyPersistenceLayer(db)
    gap = persistence.get_research_gap(gap_id)
    if not gap:
        raise HTTPException(status_code=404, detail=f"Research gap {gap_id} not found")

    evidence_records = persistence.get_gap_evidence(gap_id)
    stmt_ids = [e.statement_id for e in evidence_records]
    paper_ids = list({e.paper_id for e in evidence_records})

    return ResearchGapResponseDTO(
        id=gap.id,
        gap_statement=gap.gap_statement,
        research_problem=gap.research_problem,
        status=GapStatus(gap.status),
        evidence_count=gap.evidence_count,
        supporting_statement_ids=stmt_ids,
        supporting_paper_ids=paper_ids,
        limitations=gap.limitations or [],
        future_work=gap.future_work or [],
        validation_reasoning=gap.validation_reasoning,
        validation_confidence=gap.validation_confidence,
        created_at=gap.created_at,
        metadata=gap.metadata_json or {},
    )

