import json
from typing import Type, TypeVar

import httpx
from pydantic import BaseModel

from app.Code.ai.provider import LLMProvider, parse_json_model

T = TypeVar("T", bound=BaseModel)

ANTHROPIC_API_BASE = "https://api.anthropic.com/v1"


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "claude-3-5-haiku-latest") -> None:
        self.api_key = api_key
        self.model = model

    async def complete_json(self, system_prompt: str, user_prompt: str, schema: Type[T]) -> T:
        schema_json = json.dumps(schema.model_json_schema())
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{ANTHROPIC_API_BASE}/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "max_tokens": 2048,
                    "system": f"{system_prompt}\nRespond with JSON only matching this schema:\n{schema_json}",
                    "messages": [{"role": "user", "content": user_prompt}],
                },
            )
        if response.status_code >= 400:
            raise RuntimeError(f"Anthropic request failed: {response.status_code}")
        payload = response.json()
        content_blocks = payload.get("content", [])
        text = ""
        for block in content_blocks:
            if isinstance(block, dict) and block.get("type") == "text":
                text += str(block.get("text", ""))
        return parse_json_model(text, schema)
