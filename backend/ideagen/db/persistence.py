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

    def document_exists_by_hash(self, content_hash: str) -> bool:
        if not content_hash:
            return False
        from .models import PaperDocument
        stmt = select(PaperDocument.id).where(PaperDocument.content_hash == content_hash)
        return self.session.scalar(stmt) is not None

    def get_document_by_hash(self, content_hash: str) -> Optional['PaperDocument']:
        if not content_hash:
            return None
        from .models import PaperDocument
        stmt = select(PaperDocument).where(PaperDocument.content_hash == content_hash)
        return self.session.scalar(stmt)

    def save_paper_document(self, doc_dto: 'ideagen.ingestion.models.PaperDocumentCreateDTO') -> uuid.UUID:
        from .models import PaperDocument
        doc = PaperDocument(
            paper_id=doc_dto.paper_id,
            full_text=doc_dto.full_text,
            extraction_method=doc_dto.extraction_method,
            extraction_version=doc_dto.extraction_version,
            extracted_at=doc_dto.extracted_at,
            content_hash=getattr(doc_dto, "content_hash", None),
            original_filename=getattr(doc_dto, "original_filename", None),
            acquisition_timestamp=getattr(doc_dto, "acquisition_timestamp", None),
            provenance_metadata=getattr(doc_dto, "provenance_metadata", None),
        )
        try:
            self.session.add(doc)
            self.session.commit()
            return doc.id
        except IntegrityError as e:
            self.session.rollback()
            raise ValueError(f"IntegrityError saving paper document: {e}")
        except Exception as e:
            self.session.rollback()
            raise e

    def save_passages(self, passage_dtos: list['ideagen.ingestion.models.PassageCreateDTO']) -> None:
        if not passage_dtos:
            return
        from .models import PaperPassage
        passages = [
            PaperPassage(
                paper_id=dto.paper_id,
                document_id=dto.document_id,
                passage_index=dto.passage_index,
                page_start=dto.page_start,
                page_end=dto.page_end,
                section=dto.section,
                text=dto.text,
            )
            for dto in passage_dtos
        ]
        try:
            self.session.add_all(passages)
            self.session.commit()
        except IntegrityError as e:
            self.session.rollback()
            raise ValueError(f"IntegrityError saving paper passages: {e}")
        except Exception as e:
            self.session.rollback()
            raise e

    def get_passages_by_document(self, document_id: uuid.UUID) -> list['PaperPassage']:
        from .models import PaperPassage
        stmt = select(PaperPassage).where(PaperPassage.document_id == document_id).order_by(PaperPassage.passage_index)
        return list(self.session.scalars(stmt).all())



