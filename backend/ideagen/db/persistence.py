import uuid
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from ideagen.ingestion.models import PaperCreateDTO, SourceType
from ideagen.ingestion.pipeline import PersistenceLayer
from .models import Paper

class SQLAlchemyPersistenceLayer:
    def __init__(self, session: Session):
        self.session = session
        
    def paper_exists_by_source_id(self, source_type: str, source_id: str) -> bool:
        stmt = select(Paper.id).where(
            Paper.source_type == source_type,
            Paper.source_id == source_id
        )
        return self.session.scalar(stmt) is not None
        
    def paper_exists_by_doi(self, doi: str) -> bool:
        stmt = select(Paper.id).where(Paper.doi == doi)
        return self.session.scalar(stmt) is not None
        
    def save_paper(self, paper_dto: PaperCreateDTO) -> uuid.UUID:
        paper = Paper(
            source_type=paper_dto.source_type.value,
            source_id=paper_dto.source_id,
            doi=paper_dto.doi,
            title=paper_dto.title,
            publication_date=paper_dto.publication_date,
            batch_id=paper_dto.batch_id,
            abstract=paper_dto.abstract,
            authors=paper_dto.authors,
            referenced_works=paper_dto.referenced_works,
            raw_metadata=paper_dto.raw_metadata
        )
        try:
            self.session.add(paper)
            self.session.commit()
            return paper.id
        except IntegrityError as e:
            self.session.rollback()
            raise ValueError(f"IntegrityError saving paper: {e}")
        except Exception as e:
            self.session.rollback()
            raise e

    def save_paper_document(self, doc_dto: 'ideagen.ingestion.models.PaperDocumentCreateDTO') -> None:
        from .models import PaperDocument
        doc = PaperDocument(
            paper_id=doc_dto.paper_id,
            full_text=doc_dto.full_text,
            extraction_method=doc_dto.extraction_method,
            extraction_version=doc_dto.extraction_version,
            extracted_at=doc_dto.extracted_at
        )
        try:
            self.session.add(doc)
            self.session.commit()
        except IntegrityError as e:
            self.session.rollback()
            raise ValueError(f"IntegrityError saving paper document: {e}")
        except Exception as e:
            self.session.rollback()
            raise e


