import json
import os
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

import httpx
import jwt
from fastapi import HTTPException, Request, status

CLERK_JWKS_ENDPOINT = "https://api.clerk.com/v1/jwks"
JWKS_CACHE_TTL_SECONDS = 60 * 60


@dataclass
class AuthContext:
    user_id: str
    session_id: Optional[str]
    is_admin: bool
    claims: Dict[str, Any]


class ClerkConfigurationError(RuntimeError):
    pass


_jwks_cache: Dict[str, Dict[str, Any]] = {}
_jwks_cached_at = 0.0


def _get_secret_key() -> str:
    secret_key = os.environ.get("CLERK_SECRET_KEY", "").strip()
    if not secret_key:
        raise ClerkConfigurationError(
            "CLERK_SECRET_KEY is not configured. Set it before calling protected API routes."
        )
    return secret_key


def _get_jwt_key() -> Optional[str]:
    jwt_key = os.environ.get("CLERK_JWT_KEY", "").strip()
    if not jwt_key:
        return None
    normalized = jwt_key.replace("\\n", "\n")
    if "BEGIN PUBLIC KEY" not in normalized:
        return None
    return normalized


def _get_allowed_parties() -> list[str]:
    raw = os.environ.get("CLERK_ALLOWED_PARTIES", "")
    return [item.strip() for item in raw.split(",") if item.strip()]


def get_admin_user_ids() -> set[str]:
    raw = os.environ.get("CLERK_ADMIN_USER_IDS", "")
    return {item.strip() for item in raw.split(",") if item.strip()}


def is_clerk_configured() -> bool:
    return bool(os.environ.get("CLERK_SECRET_KEY", "").strip() or _get_jwt_key())


def _extract_token(request: Request) -> Optional[str]:
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth_header:
        scheme, _, token = auth_header.partition(" ")
        if scheme.lower() == "bearer" and token.strip():
            return token.strip()

    session_cookie = request.cookies.get("__session")
    if session_cookie:
        return session_cookie
    return None


def _get_jwks_request_config() -> tuple[str, dict[str, str]]:
    custom_jwks_url = os.environ.get("CLERK_JWKS_URL", "").strip()
    if custom_jwks_url:
        return custom_jwks_url, {}
    return CLERK_JWKS_ENDPOINT, {"Authorization": f"Bearer {_get_secret_key()}"}


async def _fetch_jwks(force_refresh: bool = False) -> Dict[str, Dict[str, Any]]:
    global _jwks_cache, _jwks_cached_at

    now = time.time()
    if not force_refresh and _jwks_cache and (now - _jwks_cached_at) < JWKS_CACHE_TTL_SECONDS:
        return _jwks_cache

    jwks_url, headers = _get_jwks_request_config()
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(jwks_url, headers=headers)
        response.raise_for_status()
        payload = response.json()

    keys_payload = payload.get("keys") if isinstance(payload, dict) else payload
    if not isinstance(keys_payload, list):
        raise ClerkConfigurationError("Unexpected Clerk JWKS response format.")

    parsed_keys: Dict[str, Dict[str, Any]] = {}
    for key in keys_payload:
        if not isinstance(key, dict):
            continue
        kid = str(key.get("kid") or "").strip()
        if kid:
            parsed_keys[kid] = key

    if not parsed_keys:
        raise ClerkConfigurationError("No Clerk JWKS keys were returned for this instance.")

    _jwks_cache = parsed_keys
    _jwks_cached_at = now
    return _jwks_cache


def _raise_unauthorized(detail: str) -> None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def _raise_service_unavailable(detail: str) -> None:
    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)


def _verify_authorized_party(claims: Dict[str, Any]) -> None:
    allowed_parties = _get_allowed_parties()
    if not allowed_parties:
        return

    azp = str(claims.get("azp") or "").strip()
    if azp and azp not in allowed_parties:
        _raise_unauthorized("Session token was not issued for an allowed frontend origin.")


async def authenticate_request(request: Request) -> AuthContext:
    if not is_clerk_configured():
        _raise_service_unavailable(
            "Clerk backend authentication is not configured. Set CLERK_SECRET_KEY or CLERK_JWT_KEY first."
        )

    token = _extract_token(request)
    if not token:
        _raise_unauthorized("Authentication required.")

    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError:
        _raise_unauthorized("Invalid session token.")

    if header.get("alg") != "RS256":
        _raise_unauthorized("Unexpected token algorithm.")

    kid = str(header.get("kid") or "").strip()
    if not kid:
        _raise_unauthorized("Session token is missing a key identifier.")

    try:
        jwt_key = _get_jwt_key()
        if jwt_key:
            public_key = jwt_key
        else:
            jwks = await _fetch_jwks()
            jwk = jwks.get(kid)
            if jwk is None:
                jwks = await _fetch_jwks(force_refresh=True)
                jwk = jwks.get(kid)
            if jwk is None:
                _raise_unauthorized("Unable to validate session token.")

            public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))
        claims = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
    except ClerkConfigurationError as exc:
        _raise_service_unavailable(str(exc))
    except jwt.ExpiredSignatureError:
        _raise_unauthorized("Session token has expired.")
    except jwt.InvalidTokenError:
        _raise_unauthorized("Session token validation failed.")
    except httpx.HTTPError:
        _raise_service_unavailable("Unable to reach Clerk to validate the session token.")

    _verify_authorized_party(claims)

    user_id = str(claims.get("sub") or "").strip()
    if not user_id:
        _raise_unauthorized("Session token does not contain a user id.")

    session_id = claims.get("sid")
    return AuthContext(
        user_id=user_id,
        session_id=str(session_id) if session_id else None,
        is_admin=user_id in get_admin_user_ids(),
        claims=claims,
    )


async def require_authenticated_user(request: Request) -> AuthContext:
    return await authenticate_request(request)


async def require_admin_user(request: Request) -> AuthContext:
    auth = await authenticate_request(request)
    if not auth.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access is required for this resource.",
        )
    return auth


async def fetch_clerk_user_count() -> Optional[int]:
    if not is_clerk_configured():
        return None

    headers = {"Authorization": f"Bearer {_get_secret_key()}"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://api.clerk.com/v1/users/count", headers=headers)
            response.raise_for_status()
    except Exception:
        return None

    raw_body = response.text.strip()
    if raw_body.isdigit():
        return int(raw_body)

    try:
        payload = response.json()
    except Exception:
        return None

    if isinstance(payload, int):
        return payload
    if isinstance(payload, dict):
        for key in ("total_count", "totalCount", "count"):
            value = payload.get(key)
            if isinstance(value, int):
                return value
            if isinstance(value, str) and value.isdigit():
                return int(value)
    return None
