import re
from pathlib import Path
from datetime import date, datetime
from typing import Optional, List, Dict, Any, Tuple
import pymupdf

from ideagen.ingestion.models import PaperCreateDTO, PaperDocumentCreateDTO, SourceType
from ideagen.ingestion.pipeline import PersistenceLayer

class PDFExtractionError(Exception):
    """Raised when PDF extraction fails or is unreadable."""
    pass

class ManualPDFIngestionService:
    def __init__(self, persistence: PersistenceLayer):
        self.persistence = persistence
        self.extraction_method = "pymupdf"
        self.extraction_version = pymupdf.__version__
        self.min_text_threshold = 500  # Conservative threshold to prevent empty documents

    def validate_file(self, pdf_path: Path) -> None:
        if not pdf_path.exists():
            raise FileNotFoundError(f"File not found: {pdf_path}")
        if not pdf_path.is_file():
            raise ValueError(f"Path is not a file: {pdf_path}")

    def normalize_text(self, text: str) -> str:
        # Conservative normalization
        # Remove consecutive empty lines (more than 2)
        text = re.sub(r'\n{3,}', '\n\n', text)
        # Remove trailing whitespace on each line
        text = re.sub(r'[ \t]+\n', '\n', text)
        return text.strip()

    def extract_text(self, pdf_path: Path) -> str:
        try:
            doc = pymupdf.open(str(pdf_path))
        except Exception as e:
            raise PDFExtractionError(f"Failed to open PDF file: {e}")

        if not doc.is_pdf:
            doc.close()
            raise PDFExtractionError("File is not a valid PDF document.")

        text_parts = []
        try:
            for page in doc:
                text_parts.append(page.get_text("text"))
        except Exception as e:
            doc.close()
            raise PDFExtractionError(f"Error extracting text: {e}")
        finally:
            doc.close()

        full_text = "\n".join(text_parts)
        normalized_text = self.normalize_text(full_text)
        
        if len(normalized_text) < self.min_text_threshold:
            raise PDFExtractionError(
                f"Extracted text length ({len(normalized_text)}) is below the minimum threshold ({self.min_text_threshold}). "
                "Document may be empty, image-based, or unreadable."
            )
            
        return normalized_text

    def ingest_pdf(
        self,
        pdf_path: Path,
        title: str,
        publication_date: Optional[date] = None,
        doi: Optional[str] = None,
        authors: Optional[List[Dict[str, Any]]] = None,
        source_id: Optional[str] = None
    ) -> Tuple[PaperCreateDTO, PaperDocumentCreateDTO]:
        
        self.validate_file(pdf_path)
        full_text = self.extract_text(pdf_path)
        
        # Use deterministic source_id if not provided
        final_source_id = source_id or pdf_path.name
        
        # Identity rules check (if we wanted to check before extraction, we could, 
        # but the prompt specifies persisting via the service. The PersistenceLayer 
        # will throw IntegrityError if duplicate, which is consistent with Phase 3).
        
        # Create PaperCreateDTO
        paper_dto = PaperCreateDTO(
            source_type=SourceType.MANUAL_UPLOAD,
            source_id=final_source_id,
            doi=doi,
            title=title,
            publication_date=publication_date,
            batch_id="manual",
            abstract="",  # Could potentially extract this in future, but currently empty
            authors=authors or [],
            referenced_works=[],
            raw_metadata={"original_filename": pdf_path.name}
        )
        
        # Persist Paper and get generated UUID
        paper_id = self.persistence.save_paper(paper_dto)
        
        if not paper_id:
            raise RuntimeError("Failed to retrieve paper ID after saving.")
            
        # Create and persist PaperDocument
        doc_dto = PaperDocumentCreateDTO(
            paper_id=paper_id,
            full_text=full_text,
            extraction_method=self.extraction_method,
            extraction_version=self.extraction_version,
            extracted_at=datetime.utcnow()
        )
        self.persistence.save_paper_document(doc_dto)
        
        return paper_dto, doc_dto
