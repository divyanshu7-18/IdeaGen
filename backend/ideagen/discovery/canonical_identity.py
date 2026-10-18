"""Canonical paper identity and duplicate resolution for scientific gap discovery (Phase 8.4).

Ensures that duplicate ingestions of the same scientific work (e.g., via manual PDF upload,
arXiv metadata, or OpenAlex) cannot count as independent papers during gap discovery.
Uses verified DOI, normalized arXiv ID, and normalized title identity.
Does not merge or delete database records automatically.
"""

from __future__ import annotations

import re
from typing import Any, Optional
import uuid


def get_canonical_paper_identity(paper: Any, fallback_id: Optional[uuid.UUID] = None) -> str:
    """Returns a normalized, canonical identity key for a paper.

    Precedence:
    1. Verified DOI / arXiv ID (normalized, versions stripped)
    2. Normalized title (alphanumeric lowercase)
    3. Fallback UUID
    """
    if not paper:
        return f"id:{fallback_id}" if fallback_id else "unknown"

    # 1. Check DOI
    doi = getattr(paper, "doi", None)
    if not doi and isinstance(paper, dict):
        doi = paper.get("doi")
    if doi:
        clean_doi = str(doi).strip().lower()
        # Handle arXiv DOIs e.g. https://doi.org/10.48550/arxiv.2510.22344v1 -> arxiv:2510.22344
        arxiv_match = re.search(r"arxiv\.(\d{4}\.\d{4,5})(?:v\d+)?", clean_doi)
        if arxiv_match:
            return f"arxiv:{arxiv_match.group(1)}"
        return f"doi:{clean_doi.replace('https://doi.org/', '').replace('http://doi.org/', '').rstrip('/')}"

    # 2. Check source_id or raw_metadata for arXiv identifier
    source_id = getattr(paper, "source_id", "")
    if not source_id and isinstance(paper, dict):
        source_id = paper.get("source_id", "")
    if source_id:
        clean_src = str(source_id).strip().lower()
        arxiv_match = re.search(r"(\d{4}\.\d{4,5})(?:v\d+)?", clean_src)
        if arxiv_match:
            return f"arxiv:{arxiv_match.group(1)}"

    raw_meta = getattr(paper, "raw_metadata", None)
    if not raw_meta and isinstance(paper, dict):
        raw_meta = paper.get("raw_metadata")
    if isinstance(raw_meta, dict):
        meta_doi = raw_meta.get("doi") or ""
        if meta_doi:
            arxiv_match = re.search(r"arxiv\.(\d{4}\.\d{4,5})(?:v\d+)?", str(meta_doi).lower())
            if arxiv_match:
                return f"arxiv:{arxiv_match.group(1)}"

    # 3. Fallback to normalized title
    title = getattr(paper, "title", None)
    if not title and isinstance(paper, dict):
        title = paper.get("title")
    if title:
        clean_title = re.sub(r"[^a-z0-9]", "", str(title).lower())
        if len(clean_title) >= 10:
            return f"title:{clean_title}"

    # 4. Fallback to paper UUID
    p_id = getattr(paper, "id", None) or fallback_id
    return f"id:{p_id}"
