import json
from typing import Type, TypeVar

import httpx
from pydantic import BaseModel

from app.Code.ai.provider import LLMProvider, parse_json_model

T = TypeVar("T", bound=BaseModel)

OPENAI_API_BASE = "https://api.openai.com/v1"


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "gpt-4o-mini") -> None:
        self.api_key = api_key
        self.model = model

    async def complete_json(self, system_prompt: str, user_prompt: str, schema: Type[T]) -> T:
        schema_json = json.dumps(schema.model_json_schema())
        messages = [
            {"role": "system", "content": f"{system_prompt}\nRespond with JSON matching this schema:\n{schema_json}"},
            {"role": "user", "content": user_prompt},
        ]
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OPENAI_API_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": 0.3,
                    "response_format": {"type": "json_object"},
                },
            )
        if response.status_code >= 400:
            raise RuntimeError(f"OpenAI request failed: {response.status_code}")
        payload = response.json()
        content = payload["choices"][0]["message"]["content"]
        return parse_json_model(content, schema)
