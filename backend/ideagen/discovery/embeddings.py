"""Pretrained scientific and text embedding providers (Phase 8 - Ollama Architecture).

Generates real, reproducible dense vector representations of research statements
supporting Ollama local embeddings (e.g., nomic-embed-text) and local SentenceTransformers.
"""

from __future__ import annotations

import logging
from typing import List, Protocol, runtime_checkable
import numpy as np
import requests

from ideagen.core.config import get_settings

logger = logging.getLogger(__name__)


@runtime_checkable
class EmbeddingProvider(Protocol):
    """Protocol for dense vector embedding generators."""

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        """Generates L2-normalized float32 embeddings for a batch of strings."""
        ...

    @property
    def dimension(self) -> int:
        """Returns the dimensionality of the generated vectors."""
        ...

    @property
    def model_name(self) -> str:
        """Returns the model identifier for provenance and reproducibility."""
        ...


class OllamaEmbeddingProvider:
    """Generates embeddings locally using Ollama embedding models."""

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model_name: str = "nomic-embed-text",
        timeout: float = 60.0,
        dimension: int = 768,
    ):
        self._base_url = base_url.rstrip("/")
        self._model_name = model_name
        self._timeout = timeout
        self._dimension = dimension

    @property
    def dimension(self) -> int:
        return self._dimension

    @property
    def model_name(self) -> str:
        return self._model_name

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        """Embeds texts using Ollama /api/embed with L2 normalization."""
        if not texts:
            return np.empty((0, self._dimension), dtype=np.float32)

        clean_texts = [
            t.strip() if t and t.strip() else "scientific research statement"
            for t in texts
        ]

        embed_url = f"{self._base_url}/api/embed"
        batch_size = 32
        all_embeddings: List[List[float]] = []

        for i in range(0, len(clean_texts), batch_size):
            chunk = clean_texts[i : i + batch_size]
            payload = {
                "model": self._model_name,
                "input": chunk,
            }
            try:
                resp = requests.post(embed_url, json=payload, timeout=self._timeout)
            except Exception as e:
                raise RuntimeError(
                    f"Ollama embedding request failed at {self._base_url}: {e}"
                ) from e

            if resp.status_code != 200:
                raise RuntimeError(
                    f"Ollama embedding API returned HTTP {resp.status_code}: {resp.text}"
                )

            data = resp.json()
            embeddings = data.get("embeddings", [])
            if not embeddings or len(embeddings) != len(chunk):
                raise RuntimeError(
                    f"Ollama returned {len(embeddings)} embeddings for chunk of {len(chunk)} items"
                )

            all_embeddings.extend(embeddings)

        arr = np.array(all_embeddings, dtype=np.float32)
        if arr.shape[1] != self._dimension:
            # Update dimension to match actual model output
            self._dimension = arr.shape[1]

        # Normalize to unit length for cosine similarity via inner product
        norms = np.linalg.norm(arr, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return arr / norms


class SentenceTransformerEmbeddingProvider:
    """Generates embeddings locally using SentenceTransformers pretrained models."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        from sentence_transformers import SentenceTransformer
        self._model_name = model_name
        self._model = SentenceTransformer(model_name)
        self._dimension = self._model.get_sentence_embedding_dimension()

    @property
    def dimension(self) -> int:
        return self._dimension

    @property
    def model_name(self) -> str:
        return self._model_name

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        """Embeds texts using SentenceTransformer with L2 normalization."""
        if not texts:
            return np.empty((0, self._dimension), dtype=np.float32)

        clean_texts = [t.strip() if t and t.strip() else "statement" for t in texts]
        embeddings = self._model.encode(
            clean_texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )
        return embeddings.astype(np.float32)


def get_default_embedding_provider() -> EmbeddingProvider:
    """Returns the configured default Ollama embedding provider."""
    settings = get_settings()
    return OllamaEmbeddingProvider(
        base_url=settings.ollama_base_url,
        model_name=settings.ollama_embedding_model,
        timeout=settings.ollama_timeout,
    )
