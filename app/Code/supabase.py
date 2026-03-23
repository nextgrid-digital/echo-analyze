from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from urllib.parse import urlsplit

import httpx

UserRole = Literal["user", "admin"]


class SupabaseConfigError(RuntimeError):
    pass


class SupabaseUnauthorizedError(RuntimeError):
    pass


class SupabaseForbiddenError(RuntimeError):
    pass


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: Optional[str]
    role: UserRole


SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

_supabase_http_client: Optional[httpx.AsyncClient] = None


def is_supabase_auth_enabled() -> bool:
    return bool(SUPABASE_URL and SUPABASE_ANON_KEY)


def is_supabase_metrics_enabled() -> bool:
    return bool(SUPABASE_URL and SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY)


def get_supabase_origin() -> Optional[str]:
    if not SUPABASE_URL:
        return None
    parts = urlsplit(SUPABASE_URL)
    if not parts.scheme or not parts.netloc:
        return None
    return f"{parts.scheme}://{parts.netloc}"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _service_headers(prefer: Optional[str] = None) -> Dict[str, str]:
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def _anon_headers(access_token: str) -> Dict[str, str]:
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
    }


async def _get_http_client() -> httpx.AsyncClient:
    global _supabase_http_client
    if _supabase_http_client is None:
        _supabase_http_client = httpx.AsyncClient(timeout=20.0)
    return _supabase_http_client


async def close_supabase_http_client() -> None:
    global _supabase_http_client
    if _supabase_http_client is not None:
        await _supabase_http_client.aclose()
        _supabase_http_client = None


async def authenticate_access_token(access_token: str, require_admin: bool = False) -> AuthenticatedUser:
    if not is_supabase_auth_enabled():
        raise SupabaseConfigError("Supabase auth is not configured on the backend.")
    if not access_token:
        raise SupabaseUnauthorizedError("Missing bearer token.")

    client = await _get_http_client()
    response = await client.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers=_anon_headers(access_token),
    )
    if response.status_code >= 400:
        raise SupabaseUnauthorizedError("Supabase token validation failed.")

    payload = response.json() or {}
    user_id = payload.get("id")
    if not user_id:
        raise SupabaseUnauthorizedError("Supabase token did not resolve to a user.")

    role: UserRole = "user"
    if is_supabase_metrics_enabled():
        role = await fetch_user_role(user_id)

    if require_admin and role != "admin":
        raise SupabaseForbiddenError("Admin access is required.")

    return AuthenticatedUser(
        id=user_id,
        email=payload.get("email"),
        role=role,
    )


async def fetch_user_role(user_id: str) -> UserRole:
    if not is_supabase_metrics_enabled():
        return "user"

    client = await _get_http_client()
    response = await client.get(
        f"{SUPABASE_URL}/rest/v1/profiles",
        headers=_service_headers(),
        params={
            "select": "role",
            "id": f"eq.{user_id}",
            "limit": "1",
        },
    )
    response.raise_for_status()
    payload = response.json() or []
    if not payload:
        return "user"
    return "admin" if payload[0].get("role") == "admin" else "user"


async def record_sign_in_event(user_id: str) -> Optional[UserRole]:
    if not is_supabase_metrics_enabled():
        return None

    role = await fetch_user_role(user_id)
    client = await _get_http_client()

    profile_payload = {
        "id": user_id,
        "role": role,
        "last_sign_in_at": _utc_now_iso(),
    }
    upsert_profile_response = await client.post(
        f"{SUPABASE_URL}/rest/v1/profiles",
        headers=_service_headers(prefer="resolution=merge-duplicates,return=minimal"),
        params={"on_conflict": "id"},
        json=profile_payload,
    )
    upsert_profile_response.raise_for_status()

    event_response = await client.post(
        f"{SUPABASE_URL}/rest/v1/user_events",
        headers=_service_headers(prefer="return=minimal"),
        json={
            "user_id": user_id,
            "event_type": "signed_in",
            "metadata": {"source": "echo_web"},
        },
    )
    event_response.raise_for_status()
    return role


async def create_analysis_run(
    *,
    user_id: str,
    file_kind: str,
    file_size_bytes: int,
    had_password: bool,
) -> Optional[str]:
    if not is_supabase_metrics_enabled():
        return None

    client = await _get_http_client()
    response = await client.post(
        f"{SUPABASE_URL}/rest/v1/analysis_runs",
        headers=_service_headers(prefer="return=representation"),
        json={
            "user_id": user_id,
            "status": "started",
            "file_kind": file_kind if file_kind in {"pdf", "json"} else "unknown",
            "file_size_bytes": file_size_bytes,
            "had_password": had_password,
        },
    )
    response.raise_for_status()
    payload = response.json() or []
    if isinstance(payload, list) and payload:
        return payload[0].get("id")
    if isinstance(payload, dict):
        return payload.get("id")
    return None


async def finalize_analysis_run(
    run_id: Optional[str],
    *,
    status: Literal["succeeded", "failed"],
    duration_ms: int,
    error_code: Optional[str] = None,
) -> None:
    if not is_supabase_metrics_enabled() or not run_id:
        return

    client = await _get_http_client()
    response = await client.patch(
        f"{SUPABASE_URL}/rest/v1/analysis_runs",
        headers=_service_headers(prefer="return=minimal"),
        params={"id": f"eq.{run_id}"},
        json={
            "status": status,
            "duration_ms": duration_ms,
            "error_code": error_code,
            "completed_at": _utc_now_iso(),
        },
    )
    response.raise_for_status()


async def fetch_admin_metrics() -> Dict[str, Any]:
    if not is_supabase_metrics_enabled():
        raise SupabaseConfigError("Supabase metrics are not configured on the backend.")

    client = await _get_http_client()
    summary_response = await client.post(
        f"{SUPABASE_URL}/rest/v1/rpc/admin_overview_metrics",
        headers=_service_headers(),
        json={},
    )
    summary_response.raise_for_status()

    users_response = await client.post(
        f"{SUPABASE_URL}/rest/v1/rpc/admin_user_rollup",
        headers=_service_headers(),
        json={"limit_count": 25},
    )
    users_response.raise_for_status()

    runs_response = await client.post(
        f"{SUPABASE_URL}/rest/v1/rpc/admin_recent_runs",
        headers=_service_headers(),
        json={"limit_count": 20},
    )
    runs_response.raise_for_status()

    events_response = await client.post(
        f"{SUPABASE_URL}/rest/v1/rpc/admin_recent_user_events",
        headers=_service_headers(),
        json={"limit_count": 20},
    )
    events_response.raise_for_status()

    summary_payload = summary_response.json() or []
    return {
        "summary": summary_payload[0] if summary_payload else {},
        "user_metrics": users_response.json() or [],
        "recent_runs": runs_response.json() or [],
        "recent_events": events_response.json() or [],
    }
