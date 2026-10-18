from __future__ import annotations

import json
import logging
import re
from typing import Type, TypeVar
import requests
from pydantic import BaseModel, ValidationError

from ideagen.llm.provider import LLMProvider
from ideagen.llm.exceptions import ProviderFailureError, MalformedResponseError

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class OllamaLLMProvider(LLMProvider):
    """Local LLM Provider backed by Ollama with structured JSON schema output."""

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model_name: str = "qwen3:8b",
        timeout: float = 120.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.model_name = model_name
        self.timeout = timeout

    def generate_structured(self, prompt: str, response_schema: Type[T]) -> T:
        """Generates a structured response validated against the provided Pydantic schema.

        Args:
            prompt: The instruction and context prompt.
            response_schema: A Pydantic model class defining the expected output.

        Returns:
            An instance of response_schema.

        Raises:
            ProviderFailureError: If Ollama is unreachable, returns HTTP error, or times out.
            MalformedResponseError: If Ollama output cannot be parsed or fails schema validation.
        """
        chat_url = f"{self.base_url}/api/chat"
        schema_dict = response_schema.model_json_schema()

        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "format": schema_dict,
            "stream": False,
            "options": {
                "temperature": 0.0,
            },
        }

        try:
            response = requests.post(chat_url, json=payload, timeout=self.timeout)
        except requests.exceptions.Timeout as e:
            raise ProviderFailureError(
                f"Ollama request timed out after {self.timeout}s: {e}"
            ) from e
        except requests.exceptions.ConnectionError as e:
            raise ProviderFailureError(
                f"Ollama server connection error at {self.base_url}: {e}"
            ) from e
        except requests.exceptions.RequestException as e:
            raise ProviderFailureError(
                f"Ollama HTTP request error: {e}"
            ) from e

        if response.status_code != 200:
            raise ProviderFailureError(
                f"Ollama API returned HTTP {response.status_code}: {response.text}"
            )

        try:
            resp_data = response.json()
        except json.JSONDecodeError as e:
            raise ProviderFailureError(
                f"Ollama returned non-JSON HTTP response body: {response.text[:200]}"
            ) from e

        # Extract message content
        message = resp_data.get("message", {})
        raw_content = message.get("content", "")
        if not raw_content or not raw_content.strip():
            raise ProviderFailureError("Ollama returned an empty response.")

        clean_json_str = self._clean_json_text(raw_content)

        try:
            parsed_data = json.loads(clean_json_str)
        except json.JSONDecodeError as e:
            raise MalformedResponseError(
                f"Failed to parse JSON response: {e}\nRaw output: {raw_content}"
            ) from e

        try:
            return response_schema.model_validate(parsed_data)
        except ValidationError as e:
            raise MalformedResponseError(
                f"Response failed schema validation: {e}\nRaw output: {raw_content}"
            ) from e

    @staticmethod
    def _clean_json_text(text: str) -> str:
        """Strips markdown code fences and whitespace from JSON string if present."""
        cleaned = text.strip()
        # Handle markdown blocks like ```json ... ```
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", cleaned)
            cleaned = re.sub(r"\n?```$", "", cleaned)
            cleaned = cleaned.strip()
        return cleaned
