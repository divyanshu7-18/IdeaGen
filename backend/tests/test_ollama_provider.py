"""Comprehensive Unit Tests and Smoke Tests for Ollama Provider Architecture (Phase 8)."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch
import numpy as np
import pytest
import requests
from pydantic import BaseModel, Field

from ideagen.core.config import Settings, get_settings
from ideagen.llm.ollama_provider import OllamaLLMProvider
from ideagen.llm.exceptions import ProviderFailureError, MalformedResponseError
from ideagen.discovery.embeddings import (
    OllamaEmbeddingProvider,
    get_default_embedding_provider,
)


class SampleResearchHypothesis(BaseModel):
    hypothesis: str = Field(description="Scientific hypothesis statement")
    confidence: float = Field(ge=0.0, le=1.0)
    is_falsifiable: bool


# ── Unit Tests: Provider Selection & Initialization ─────────────────────────

def test_ollama_provider_defaults():
    provider = OllamaLLMProvider()
    assert provider.base_url == "http://localhost:11434"
    assert provider.model_name == "qwen3:8b"
    assert provider.timeout == 120.0


def test_ollama_provider_custom_config():
    provider = OllamaLLMProvider(
        base_url="http://custom-host:11434/",
        model_name="qwen3:8b",
        timeout=45.0,
    )
    assert provider.base_url == "http://custom-host:11434"
    assert provider.model_name == "qwen3:8b"
    assert provider.timeout == 45.0


def test_default_embedding_provider_selection():
    embedder = get_default_embedding_provider()
    assert isinstance(embedder, OllamaEmbeddingProvider)
    assert embedder.model_name == "nomic-embed-text"
    assert embedder.dimension == 768


# ── Unit Tests: Valid and Invalid Structured Output ─────────────────────────

def test_generate_structured_success():
    provider = OllamaLLMProvider()
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "message": {
            "role": "assistant",
            "content": json.dumps({
                "hypothesis": "Retrieval-augmented grounding reduces hallucinations.",
                "confidence": 0.95,
                "is_falsifiable": True,
            }),
        }
    }

    with patch("requests.post", return_value=mock_response) as mock_post:
        result = provider.generate_structured("Test prompt", SampleResearchHypothesis)
        assert isinstance(result, SampleResearchHypothesis)
        assert result.hypothesis == "Retrieval-augmented grounding reduces hallucinations."
        assert result.confidence == 0.95
        assert result.is_falsifiable is True
        mock_post.assert_called_once()


def test_generate_structured_strips_markdown_fences():
    provider = OllamaLLMProvider()
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "message": {
            "role": "assistant",
            "content": "```json\n" + json.dumps({
                "hypothesis": "Test hypothesis in markdown fence",
                "confidence": 0.88,
                "is_falsifiable": True,
            }) + "\n```",
        }
    }

    with patch("requests.post", return_value=mock_response):
        result = provider.generate_structured("Test prompt", SampleResearchHypothesis)
        assert result.hypothesis == "Test hypothesis in markdown fence"
        assert result.confidence == 0.88


def test_generate_structured_invalid_json_raises_malformed():
    provider = OllamaLLMProvider()
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "message": {
            "role": "assistant",
            "content": "Not a valid JSON string at all {broken",
        }
    }

    with patch("requests.post", return_value=mock_response):
        with pytest.raises(MalformedResponseError, match="Failed to parse JSON response"):
            provider.generate_structured("Test prompt", SampleResearchHypothesis)


def test_generate_structured_schema_violation_raises_malformed():
    provider = OllamaLLMProvider()
    mock_response = MagicMock()
    mock_response.status_code = 200
    # Missing required field "is_falsifiable", and "confidence" > 1.0
    mock_response.json.return_value = {
        "message": {
            "role": "assistant",
            "content": json.dumps({
                "hypothesis": "Hypothesis without falsifiability",
                "confidence": 1.5,
            }),
        }
    }

    with patch("requests.post", return_value=mock_response):
        with pytest.raises(MalformedResponseError, match="Response failed schema validation"):
            provider.generate_structured("Test prompt", SampleResearchHypothesis)


# ── Unit Tests: Timeout & Ollama Unavailable ────────────────────────────────

def test_generate_structured_timeout_raises_provider_failure():
    provider = OllamaLLMProvider(timeout=5.0)

    with patch("requests.post", side_effect=requests.exceptions.Timeout("Timed out")):
        with pytest.raises(ProviderFailureError, match="request timed out after 5.0s"):
            provider.generate_structured("Test prompt", SampleResearchHypothesis)


def test_generate_structured_connection_error_raises_provider_failure():
    provider = OllamaLLMProvider()

    with patch("requests.post", side_effect=requests.exceptions.ConnectionError("Connection refused")):
        with pytest.raises(ProviderFailureError, match="Ollama server connection error"):
            provider.generate_structured("Test prompt", SampleResearchHypothesis)


def test_generate_structured_http_500_raises_provider_failure():
    provider = OllamaLLMProvider()
    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = "Internal Server Error in Ollama runner"

    with patch("requests.post", return_value=mock_response):
        with pytest.raises(ProviderFailureError, match="Ollama API returned HTTP 500"):
            provider.generate_structured("Test prompt", SampleResearchHypothesis)


def test_generate_structured_empty_response_raises_provider_failure():
    provider = OllamaLLMProvider()
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "message": {
            "role": "assistant",
            "content": "",
        }
    }

    with patch("requests.post", return_value=mock_response):
        with pytest.raises(ProviderFailureError, match="Ollama returned an empty response"):
            provider.generate_structured("Test prompt", SampleResearchHypothesis)


# ── Unit Tests: Embedding Provider & Vector Dimensions ──────────────────────

def test_ollama_embedding_provider_empty_input():
    provider = OllamaEmbeddingProvider()
    arr = provider.embed_texts([])
    assert arr.shape == (0, 768)
    assert arr.dtype == np.float32


def test_ollama_embedding_provider_mocked_batch():
    provider = OllamaEmbeddingProvider()
    mock_response = MagicMock()
    mock_response.status_code = 200
    # Simulate two 768-dim vectors
    v1 = [0.1] * 768
    v2 = [0.2] * 768
    mock_response.json.return_value = {"embeddings": [v1, v2]}

    with patch("requests.post", return_value=mock_response):
        arr = provider.embed_texts(["first scientific text", "second scientific text"])
        assert arr.shape == (2, 768)
        assert arr.dtype == np.float32
        # Verify L2 normalization
        norms = np.linalg.norm(arr, axis=1)
        np.testing.assert_allclose(norms, [1.0, 1.0], atol=1e-5)


def test_ollama_embedding_provider_connection_failure():
    provider = OllamaEmbeddingProvider()

    with patch("requests.post", side_effect=requests.exceptions.ConnectionError("Offline")):
        with pytest.raises(RuntimeError, match="Ollama embedding request failed"):
            provider.embed_texts(["scientific text"])


# ── Live Smoke Tests: Local Ollama Server ───────────────────────────────────

def _is_ollama_online() -> bool:
    try:
        r = requests.get("http://localhost:11434/api/tags", timeout=2.0)
        return r.status_code == 200
    except Exception:
        return False


@pytest.mark.skipif(not _is_ollama_online(), reason="Local Ollama server is not running")
def test_live_smoke_ollama_server_tags():
    """Verify local Ollama server is running and has required models."""
    r = requests.get("http://localhost:11434/api/tags", timeout=5.0)
    assert r.status_code == 200
    data = r.json()
    model_names = [m["name"] for m in data.get("models", [])]
    # Check that qwen3:8b and nomic-embed-text are present
    assert any("qwen3" in name for name in model_names), f"qwen3 model missing: {model_names}"
    assert any("nomic-embed-text" in name for name in model_names), f"nomic-embed-text missing: {model_names}"


@pytest.mark.skipif(not _is_ollama_online(), reason="Local Ollama server is not running")
def test_live_smoke_ollama_structured_generation():
    """Live smoke test verifying qwen3:8b returns valid structured JSON conforming to Pydantic schema."""
    settings = get_settings()
    provider = OllamaLLMProvider(
        base_url=settings.ollama_base_url,
        model_name=settings.ollama_model,
        timeout=settings.ollama_timeout,
    )
    prompt = (
        "Evaluate the scientific premise: 'Graph neural networks capture non-Euclidean relational topologies'. "
        "Formulate a precise hypothesis, state confidence between 0.0 and 1.0, and specify if it is falsifiable."
    )
    result = provider.generate_structured(prompt, SampleResearchHypothesis)
    assert isinstance(result, SampleResearchHypothesis)
    assert len(result.hypothesis) > 10
    assert 0.0 <= result.confidence <= 1.0
    assert isinstance(result.is_falsifiable, bool)


@pytest.mark.skipif(not _is_ollama_online(), reason="Local Ollama server is not running")
def test_live_smoke_ollama_embeddings():
    """Live smoke test verifying nomic-embed-text generates 768-dim normalized embeddings."""
    settings = get_settings()
    embedder = OllamaEmbeddingProvider(
        base_url=settings.ollama_base_url,
        model_name=settings.ollama_embedding_model,
        timeout=settings.ollama_timeout,
    )
    texts = [
        "Contrastive self-supervised learning improves representation transfer in low-data regimes.",
        "Differential privacy guarantees provable bounds against reconstruction attacks.",
    ]
    vecs = embedder.embed_texts(texts)
    assert vecs.shape == (2, 768)
    assert vecs.dtype == np.float32
    norms = np.linalg.norm(vecs, axis=1)
    np.testing.assert_allclose(norms, [1.0, 1.0], atol=1e-5)
