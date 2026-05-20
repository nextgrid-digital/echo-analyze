"""Razorpay payment helpers for Echo Analyze.

Implements:
- One-time order creation (Razorpay Standard Checkout).
- Monthly subscription creation (Razorpay Subscriptions).
- HMAC-SHA256 signature verification for checkout callbacks and webhooks.

The KEY_SECRET never leaves this module; callers receive only the public key id
and Razorpay-generated identifiers (``order_id`` / ``subscription_id``).
"""

from __future__ import annotations

import hashlib
import hmac
import os
import re
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Mapping, Optional, Tuple

import httpx
from fastapi import HTTPException, status

RAZORPAY_API_BASE = "https://api.razorpay.com/v1"
RAZORPAY_HTTP_TIMEOUT_SECONDS = 15.0
MIN_AMOUNT_PAISE = 100
MAX_AMOUNT_PAISE = 100_000_000  # 10 lakh rupees, safety cap
DEFAULT_CURRENCY = "INR"
ALLOWED_CURRENCIES = {"INR", "USD", "EUR", "GBP", "SGD", "AUD", "AED"}
ALLOWED_PERIODS = {"daily", "weekly", "monthly", "yearly"}
SAFE_RECEIPT_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,40}$")


class RazorpayConfigurationError(RuntimeError):
    """Raised when required Razorpay environment variables are missing."""


@dataclass(frozen=True)
class RazorpayCredentials:
    key_id: str
    key_secret: str


@dataclass(frozen=True)
class RazorpayPlanDefaults:
    plan_id: Optional[str]
    amount_paise: Optional[int]
    currency: str
    period: str
    interval: int
    description: Optional[str]


def _get_env(name: str) -> str:
    return (os.environ.get(name) or "").strip()


def _is_configured() -> bool:
    return bool(_get_env("RAZORPAY_KEY_ID") and _get_env("RAZORPAY_KEY_SECRET"))


def get_public_key_id() -> Optional[str]:
    """Return the publishable Razorpay key id, or ``None`` if not configured."""

    key_id = _get_env("RAZORPAY_KEY_ID")
    return key_id or None


def _get_credentials() -> RazorpayCredentials:
    key_id = _get_env("RAZORPAY_KEY_ID")
    key_secret = _get_env("RAZORPAY_KEY_SECRET")
    if not key_id or not key_secret:
        raise RazorpayConfigurationError(
            "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
        )
    return RazorpayCredentials(key_id=key_id, key_secret=key_secret)


def get_webhook_secret() -> Optional[str]:
    secret = _get_env("RAZORPAY_WEBHOOK_SECRET")
    return secret or None


def _coerce_positive_int(value: str) -> Optional[int]:
    if not value:
        return None
    try:
        parsed = int(value)
    except ValueError:
        return None
    return parsed if parsed > 0 else None


def get_plan_defaults() -> RazorpayPlanDefaults:
    """Read default plan configuration from environment variables."""

    plan_id = _get_env("RAZORPAY_PLAN_ID") or None
    amount = _coerce_positive_int(_get_env("RAZORPAY_DEFAULT_AMOUNT_PAISE"))
    currency = (_get_env("RAZORPAY_CURRENCY") or DEFAULT_CURRENCY).upper()
    if currency not in ALLOWED_CURRENCIES:
        currency = DEFAULT_CURRENCY
    period = (_get_env("RAZORPAY_PLAN_PERIOD") or "monthly").lower()
    if period not in ALLOWED_PERIODS:
        period = "monthly"
    interval = _coerce_positive_int(_get_env("RAZORPAY_PLAN_INTERVAL")) or 1
    description = _get_env("RAZORPAY_PLAN_DESCRIPTION") or None
    return RazorpayPlanDefaults(
        plan_id=plan_id,
        amount_paise=amount,
        currency=currency,
        period=period,
        interval=interval,
        description=description,
    )


def is_ready() -> bool:
    """Whether Razorpay can accept payments based on current configuration."""

    return _is_configured()


def _hmac_sha256_hex(secret: str, message: str) -> str:
    return hmac.new(secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_checkout_signature(
    *,
    razorpay_order_id: Optional[str],
    razorpay_payment_id: Optional[str],
    razorpay_signature: Optional[str],
    razorpay_subscription_id: Optional[str] = None,
) -> bool:
    """Verify a Razorpay checkout callback signature.

    For one-time payments the signed message is ``order_id|payment_id``.
    For subscriptions Razorpay signs ``payment_id|subscription_id`` instead.
    """

    if not razorpay_payment_id or not razorpay_signature:
        return False

    try:
        credentials = _get_credentials()
    except RazorpayConfigurationError:
        return False

    if razorpay_subscription_id:
        message = f"{razorpay_payment_id}|{razorpay_subscription_id}"
    elif razorpay_order_id:
        message = f"{razorpay_order_id}|{razorpay_payment_id}"
    else:
        return False

    expected = _hmac_sha256_hex(credentials.key_secret, message)
    return hmac.compare_digest(expected, razorpay_signature)


def verify_webhook_signature(*, raw_body: bytes, signature_header: Optional[str]) -> bool:
    """Verify a Razorpay webhook signature using ``RAZORPAY_WEBHOOK_SECRET``."""

    if not signature_header:
        return False
    secret = get_webhook_secret()
    if not secret:
        return False
    try:
        expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    except Exception:
        return False
    return hmac.compare_digest(expected, signature_header.strip())


def _validate_amount(amount_paise: int) -> None:
    if not isinstance(amount_paise, int) or isinstance(amount_paise, bool):
        raise HTTPException(status_code=400, detail="amount must be an integer number of paise.")
    if amount_paise < MIN_AMOUNT_PAISE:
        raise HTTPException(
            status_code=400,
            detail=f"amount must be at least {MIN_AMOUNT_PAISE} paise (\u20b91).",
        )
    if amount_paise > MAX_AMOUNT_PAISE:
        raise HTTPException(status_code=400, detail="amount exceeds the configured maximum.")


def _validate_currency(currency: Optional[str]) -> str:
    code = (currency or DEFAULT_CURRENCY).strip().upper()
    if code not in ALLOWED_CURRENCIES:
        raise HTTPException(status_code=400, detail="currency is not supported.")
    return code


def _validate_receipt(receipt: Optional[str]) -> str:
    if not receipt:
        return f"echo_{int(time.time())}"
    receipt = receipt.strip()
    if not SAFE_RECEIPT_PATTERN.fullmatch(receipt):
        raise HTTPException(
            status_code=400,
            detail="receipt may contain letters, digits, '.', '_' or '-' (max 40 chars).",
        )
    return receipt


def _sanitize_notes(notes: Optional[Mapping[str, Any]]) -> Dict[str, str]:
    if not notes:
        return {}
    cleaned: Dict[str, str] = {}
    for key, value in notes.items():
        if value is None:
            continue
        safe_key = re.sub(r"[^A-Za-z0-9_]", "_", str(key))[:32]
        safe_value = str(value)[:250]
        if safe_key:
            cleaned[safe_key] = safe_value
        if len(cleaned) >= 15:
            break
    return cleaned


def _map_razorpay_status(status_code: int) -> int:
    if status_code == 401:
        return 401
    if 400 <= status_code < 500:
        return 502
    return 502


def _extract_razorpay_error_message(payload: Any) -> str:
    if isinstance(payload, dict):
        error = payload.get("error")
        if isinstance(error, dict):
            description = error.get("description")
            if isinstance(description, str) and description:
                return description
    return "Razorpay request failed."


async def _call_razorpay(
    *,
    method: str,
    path: str,
    json_body: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    credentials = _get_credentials()
    url = f"{RAZORPAY_API_BASE}{path}"
    try:
        async with httpx.AsyncClient(timeout=RAZORPAY_HTTP_TIMEOUT_SECONDS) as client:
            response = await client.request(
                method,
                url,
                json=json_body,
                auth=(credentials.key_id, credentials.key_secret),
                headers={"Accept": "application/json"},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to reach Razorpay. Please try again shortly.",
        ) from exc

    if response.status_code >= 400:
        try:
            payload = response.json()
        except Exception:
            payload = None
        raise HTTPException(
            status_code=_map_razorpay_status(response.status_code),
            detail=_extract_razorpay_error_message(payload),
        )

    try:
        payload = response.json()
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Razorpay returned an unexpected response.",
        ) from exc
    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=502,
            detail="Razorpay returned an unexpected response shape.",
        )
    return payload


async def create_order(
    *,
    amount_paise: int,
    currency: Optional[str] = None,
    receipt: Optional[str] = None,
    notes: Optional[Mapping[str, Any]] = None,
) -> Dict[str, Any]:
    """Create a Razorpay one-time order."""

    _validate_amount(amount_paise)
    safe_currency = _validate_currency(currency)
    safe_receipt = _validate_receipt(receipt)
    body: Dict[str, Any] = {
        "amount": amount_paise,
        "currency": safe_currency,
        "receipt": safe_receipt,
        "payment_capture": 1,
    }
    safe_notes = _sanitize_notes(notes)
    if safe_notes:
        body["notes"] = safe_notes
    payload = await _call_razorpay(method="POST", path="/orders", json_body=body)
    return {
        "order_id": payload.get("id"),
        "amount": payload.get("amount"),
        "currency": payload.get("currency"),
        "receipt": payload.get("receipt"),
        "status": payload.get("status"),
    }


async def create_subscription(
    *,
    plan_id: Optional[str] = None,
    total_count: Optional[int] = None,
    customer_notify: bool = True,
    notes: Optional[Mapping[str, Any]] = None,
) -> Dict[str, Any]:
    """Create a Razorpay subscription for recurring monthly billing.

    The plan id can be passed explicitly or fall back to ``RAZORPAY_PLAN_ID``.
    ``total_count`` defaults to 12 (charge for 12 monthly cycles, then stop).
    """

    defaults = get_plan_defaults()
    resolved_plan_id = (plan_id or defaults.plan_id or "").strip()
    if not resolved_plan_id:
        raise HTTPException(
            status_code=500,
            detail=(
                "No Razorpay plan is configured. Set RAZORPAY_PLAN_ID or pass plan_id."
            ),
        )

    if total_count is None:
        total_count = _coerce_positive_int(_get_env("RAZORPAY_SUBSCRIPTION_TOTAL_COUNT")) or 12
    if total_count <= 0 or total_count > 120:
        raise HTTPException(status_code=400, detail="total_count must be between 1 and 120.")

    body: Dict[str, Any] = {
        "plan_id": resolved_plan_id,
        "total_count": total_count,
        "customer_notify": 1 if customer_notify else 0,
    }
    safe_notes = _sanitize_notes(notes)
    if safe_notes:
        body["notes"] = safe_notes
    payload = await _call_razorpay(method="POST", path="/subscriptions", json_body=body)
    return {
        "subscription_id": payload.get("id"),
        "plan_id": payload.get("plan_id"),
        "status": payload.get("status"),
        "short_url": payload.get("short_url"),
        "current_start": payload.get("current_start"),
        "current_end": payload.get("current_end"),
        "total_count": payload.get("total_count"),
        "paid_count": payload.get("paid_count"),
        "remaining_count": payload.get("remaining_count"),
    }


async def fetch_subscription(subscription_id: str) -> Dict[str, Any]:
    if not subscription_id or not re.fullmatch(r"sub_[A-Za-z0-9]+", subscription_id):
        raise HTTPException(status_code=400, detail="subscription_id is invalid.")
    payload = await _call_razorpay(method="GET", path=f"/subscriptions/{subscription_id}")
    return payload


async def cancel_subscription(
    subscription_id: str,
    *,
    cancel_at_cycle_end: bool = True,
) -> Dict[str, Any]:
    if not subscription_id or not re.fullmatch(r"sub_[A-Za-z0-9]+", subscription_id):
        raise HTTPException(status_code=400, detail="subscription_id is invalid.")
    body = {"cancel_at_cycle_end": 1 if cancel_at_cycle_end else 0}
    payload = await _call_razorpay(
        method="POST",
        path=f"/subscriptions/{subscription_id}/cancel",
        json_body=body,
    )
    return payload


def split_event_metadata(event_payload: Mapping[str, Any]) -> Tuple[str, Dict[str, Any]]:
    """Extract a safe ``(event, summary)`` tuple from a webhook payload."""

    event = str(event_payload.get("event") or "unknown")[:80]
    payload = event_payload.get("payload") or {}
    summary: Dict[str, Any] = {}
    if isinstance(payload, dict):
        for entity_name in ("payment", "subscription", "order", "refund"):
            entity_wrapper = payload.get(entity_name)
            if not isinstance(entity_wrapper, dict):
                continue
            entity = entity_wrapper.get("entity")
            if isinstance(entity, dict):
                fields: List[Tuple[str, Any]] = []
                for key in ("id", "status", "amount", "currency", "plan_id"):
                    if key in entity:
                        fields.append((key, entity.get(key)))
                if fields:
                    summary[entity_name] = dict(fields)
    return event, summary
