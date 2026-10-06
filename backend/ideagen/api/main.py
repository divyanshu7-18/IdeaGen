from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List
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
            abstract = extracted_text[:1000]
            unique_source_id = f"upload_{uuid.uuid4().hex}"
            pub_date = datetime.date.today()
            
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
                raw_metadata={"original_filename": file.filename}
            )
            saved_id = persistence.save_paper(paper_dto)
            
            doc_dto = PaperDocumentCreateDTO(
                paper_id=saved_id,
                full_text=extracted_text,
                extraction_method=service.extraction_method,
                extraction_version=service.extraction_version,
                extracted_at=datetime.datetime.now(datetime.timezone.utc)
            )
            persistence.save_paper_document(doc_dto)
            
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
                    "abstract": abstract
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

