import json
from typing import Type, TypeVar

import httpx
from pydantic import BaseModel

from app.Code.ai.provider import LLMProvider, parse_json_model

T = TypeVar("T", bound=BaseModel)

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"


class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "gemini-2.0-flash") -> None:
        self.api_key = api_key
        self.model = model

    async def complete_json(self, system_prompt: str, user_prompt: str, schema: Type[T]) -> T:
        schema_json = json.dumps(schema.model_json_schema())
        system_text = f"{system_prompt}\nRespond with JSON only matching this schema:\n{schema_json}"
        url = f"{GEMINI_API_BASE}/models/{self.model}:generateContent"
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                params={"key": self.api_key},
                headers={"Content-Type": "application/json"},
                json={
                    "systemInstruction": {"parts": [{"text": system_text}]},
                    "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
                    "generationConfig": {
                        "temperature": 0.3,
                        "responseMimeType": "application/json",
                    },
                },
            )
        if response.status_code >= 400:
            detail = response.text[:300]
            raise RuntimeError(f"Gemini request failed: {response.status_code} {detail}")

        payload = response.json()
        candidates = payload.get("candidates", [])
        if not candidates:
            raise RuntimeError("Gemini returned no candidates.")
        parts = candidates[0].get("content", {}).get("parts", [])
        text = ""
        for part in parts:
            if isinstance(part, dict) and part.get("text"):
                text += str(part["text"])
        if not text.strip():
            raise RuntimeError("Gemini returned empty content.")
        return parse_json_model(text, schema)
