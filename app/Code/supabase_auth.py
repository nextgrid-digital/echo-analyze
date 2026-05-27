import hashlib
import hmac
import os
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException, Request


@dataclass(frozen=True)
class SupabaseUser:
    user_id: str
    username: str
    email: Optional[str]
    app_metadata: Dict[str, Any]
    user_metadata: Dict[str, Any]
    is_admin: bool


def _get_supabase_url() -> str:
    return os.environ.get("SUPABASE_URL", "").strip().rstrip("/")


def _get_supabase_anon_key() -> str:
    return os.environ.get("SUPABASE_ANON_KEY", "").strip()


def _get_supabase_service_key() -> str:
    return os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()


def _auth_headers(token: str, api_key: str) -> Dict[str, str]:
    return {
        "apikey": api_key,
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }


def _extract_bearer_token(request: Request) -> str:
    authorization = request.headers.get("authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Authentication required.")
    return token.strip()


def _sanitize_username(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    username = str(value).strip()
    if not username:
        return None
    username = re.sub(r"[\r\n\t]+", " ", username)
    username = re.sub(r"\s+", " ", username).strip()
    username = re.sub(
        r"(?<![A-Za-z0-9_])[A-Za-z0-9][\w.+-]*@[\w.-]+\.[A-Za-z]{2,}(?![A-Za-z0-9_])",
        "[redacted-email]",
        username,
    )
    return username[:80] or None


def _fallback_username(user_id: str) -> str:
    salt = os.environ.get("ANALYTICS_ID_HASH_SALT") or "echo-analyze-local-analytics"
    digest = hmac.new(salt.encode("utf-8"), user_id.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"user_{digest[:8]}"


def _username_from_user(user: Dict[str, Any]) -> str:
    metadata = user.get("user_metadata")
    if not isinstance(metadata, dict):
        metadata = {}

    for key in ("username", "preferred_username", "name", "full_name"):
        username = _sanitize_username(metadata.get(key))
        if username:
            return username

    user_id = str(user.get("id") or "unknown")
    return _fallback_username(user_id)


def _metadata_roles(metadata: Dict[str, Any]) -> List[str]:
    roles: List[str] = []
    for key in ("role", "user_role"):
        value = metadata.get(key)
        if isinstance(value, str):
            roles.append(value)
    for key in ("roles", "user_roles"):
        value = metadata.get(key)
        if isinstance(value, list):
            roles.extend(str(item) for item in value if item is not None)
        elif isinstance(value, str):
            roles.extend(part.strip() for part in value.split(","))
    return [role.strip().lower() for role in roles if role and role.strip()]


def _is_admin_user(user: Dict[str, Any]) -> bool:
    user_id = str(user.get("id") or "").strip()
    email = str(user.get("email") or "").strip().lower()
    app_metadata = user.get("app_metadata") if isinstance(user.get("app_metadata"), dict) else {}
    user_metadata = user.get("user_metadata") if isinstance(user.get("user_metadata"), dict) else {}

    admin_role = os.environ.get("SUPABASE_ADMIN_ROLE", "admin").strip().lower() or "admin"
    roles = set(_metadata_roles(app_metadata)) | set(_metadata_roles(user_metadata))
    if admin_role in roles or bool(app_metadata.get("is_admin")):
        return True

    admin_user_ids = {
        item.strip()
        for item in os.environ.get("SUPABASE_ADMIN_USER_IDS", "").split(",")
        if item.strip()
    }
    if user_id and user_id in admin_user_ids:
        return True

    admin_emails = {
        item.strip().lower()
        for item in os.environ.get("SUPABASE_ADMIN_EMAILS", "").split(",")
        if item.strip()
    }
    return bool(email and email in admin_emails)


def _to_supabase_user(user: Dict[str, Any]) -> SupabaseUser:
    app_metadata = user.get("app_metadata") if isinstance(user.get("app_metadata"), dict) else {}
    user_metadata = user.get("user_metadata") if isinstance(user.get("user_metadata"), dict) else {}
    user_id = str(user.get("id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid Supabase user.")

    return SupabaseUser(
        user_id=user_id,
        username=_username_from_user(user),
        email=str(user.get("email") or "").strip() or None,
        app_metadata=app_metadata,
        user_metadata=user_metadata,
        is_admin=_is_admin_user(user),
    )


async def require_supabase_user(request: Request, *, require_admin: bool = False) -> SupabaseUser:
    token = _extract_bearer_token(request)
    supabase_url = _get_supabase_url()
    anon_key = _get_supabase_anon_key()
    if not supabase_url or not anon_key:
        raise HTTPException(status_code=503, detail="Supabase authentication is not configured.")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{supabase_url}/auth/v1/user",
                headers=_auth_headers(token, anon_key),
            )
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Unable to verify Supabase session.")

    if response.status_code in {401, 403}:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    if response.status_code >= 400:
        raise HTTPException(status_code=503, detail="Unable to verify Supabase session.")

    try:
        payload = response.json()
    except ValueError:
        raise HTTPException(status_code=503, detail="Invalid Supabase auth response.")

    user = _to_supabase_user(payload)
    if require_admin and not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user


async def get_supabase_registered_user_count() -> Optional[int]:
    supabase_url = _get_supabase_url()
    service_key = _get_supabase_service_key()
    if not supabase_url or not service_key:
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{supabase_url}/auth/v1/admin/users",
                params={"page": "1", "per_page": "1"},
                headers=_auth_headers(service_key, service_key),
            )
    except httpx.HTTPError:
        return None

    if response.status_code >= 400:
        return None

    total_header = response.headers.get("x-total-count")
    if total_header and total_header.isdigit():
        return int(total_header)

    content_range = response.headers.get("content-range", "")
    _, _, total = content_range.partition("/")
    if total.isdigit():
        return int(total)

    try:
        payload = response.json()
    except ValueError:
        return None
    users = payload.get("users") if isinstance(payload, dict) else None
    if isinstance(users, list):
        return len(users)
    return None
