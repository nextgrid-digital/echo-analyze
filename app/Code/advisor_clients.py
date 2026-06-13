from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException

from app.Code.supabase_auth import SupabaseUser, _auth_headers, _get_supabase_service_key, _get_supabase_url

ADVISOR_CLIENT_SELECT = (
    "id,user_id,client_pan,client_name,email,phone,analysis_json,notes,updated_at"
)


def _service_headers() -> Dict[str, str]:
    service_key = _get_supabase_service_key()
    if not service_key:
        raise HTTPException(status_code=503, detail="Supabase service role is not configured.")
    return _auth_headers(service_key, service_key)


def _rest_url(table: str) -> str:
    supabase_url = _get_supabase_url()
    if not supabase_url:
        raise HTTPException(status_code=503, detail="Supabase is not configured.")
    return f"{supabase_url}/rest/v1/{table}"


def _raise_save_error(response: httpx.Response) -> None:
    detail = "Unable to save client."
    try:
        payload = response.json()
        if isinstance(payload, dict):
            message = payload.get("message") or payload.get("detail")
            if isinstance(message, str) and message.strip():
                detail = message.strip()
    except Exception:
        if response.text.strip():
            detail = response.text.strip()[:240]
    raise HTTPException(status_code=503, detail=detail)


async def list_advisor_clients_for_user(user_id: str) -> List[Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            _rest_url("advisor_clients"),
            headers=_service_headers(),
            params={
                "select": ADVISOR_CLIENT_SELECT,
                "user_id": f"eq.{user_id}",
                "order": "updated_at.desc",
            },
        )
    if response.status_code >= 400:
        _raise_save_error(response)
    payload = response.json()
    return payload if isinstance(payload, list) else []


async def upsert_advisor_client_for_user(
    user: SupabaseUser,
    *,
    client_pan: str,
    client_name: str,
    email: Optional[str],
    phone: Optional[str],
    analysis: Dict[str, Any],
    notes: str = "",
    updated_at: Optional[str] = None,
) -> Dict[str, Any]:
    if not analysis.get("success"):
        raise HTTPException(status_code=400, detail="Analysis must be successful.")

    normalized_pan = client_pan.strip().upper()
    if not normalized_pan or normalized_pan == "UNKNOWN":
        raise HTTPException(status_code=400, detail="Client PAN is required.")

    row = {
        "user_id": user.user_id,
        "client_pan": normalized_pan,
        "client_name": (client_name or "Unknown client").strip() or "Unknown client",
        "email": email,
        "phone": phone,
        "analysis_json": analysis,
        "notes": notes or "",
        "updated_at": updated_at or datetime.now(timezone.utc).isoformat(),
    }

    headers = _service_headers()
    headers["Content-Type"] = "application/json"
    headers["Prefer"] = "resolution=merge-duplicates,return=representation"

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{_rest_url('advisor_clients')}?on_conflict=user_id,client_pan",
            headers=headers,
            json=row,
        )

    if response.status_code >= 400:
        _raise_save_error(response)

    payload = response.json()
    rows = payload if isinstance(payload, list) else [payload]
    if not rows or not isinstance(rows[0], dict):
        raise HTTPException(status_code=503, detail="Could not save client.")
    return rows[0]
