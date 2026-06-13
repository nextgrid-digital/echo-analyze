import json
import os
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Type, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class LLMProvider(ABC):
    @abstractmethod
    async def complete_json(self, system_prompt: str, user_prompt: str, schema: Type[T]) -> T:
        raise NotImplementedError


def get_llm_provider() -> Optional[LLMProvider]:
    provider_name = os.environ.get("LLM_PROVIDER", "gemini").strip().lower()

    if provider_name == "gemini":
        api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        if not api_key:
            return None
        from app.Code.ai.gemini_provider import GeminiProvider

        model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash").strip() or "gemini-2.0-flash"
        return GeminiProvider(api_key=api_key, model=model)

    if provider_name == "anthropic":
        api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        if not api_key:
            return None
        from app.Code.ai.anthropic_provider import AnthropicProvider

        return AnthropicProvider(api_key=api_key)

    if provider_name == "openai":
        api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        if not api_key:
            return None
        from app.Code.ai.openai_provider import OpenAIProvider

        return OpenAIProvider(api_key=api_key)

    return None


def parse_json_model(payload: str, schema: Type[T]) -> T:
    cleaned = payload.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
    data = json.loads(cleaned)
    if isinstance(data, dict) and "data" in data and isinstance(data["data"], dict):
        data = data["data"]
    return schema.model_validate(data)
