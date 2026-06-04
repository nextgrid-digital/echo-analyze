import hashlib
import hmac
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx
from fastapi import HTTPException

from app.Code.supabase_auth import SupabaseUser, _auth_headers, _get_supabase_service_key, _get_supabase_url


FREE_REPORT_LIMIT = 1
RAZORPAY_API_BASE = "https://api.razorpay.com/v1"
RAZORPAY_PAYMENT_ID_PATTERN = re.compile(r"^pay_[A-Za-z0-9]+$")
RAZORPAY_PLAN_ID_PATTERN = re.compile(r"^plan_[A-Za-z0-9]+$")
RAZORPAY_SUBSCRIPTION_ID_PATTERN = re.compile(r"^sub_[A-Za-z0-9]+$")
KNOWN_SUBSCRIPTION_STATUSES = {
    "free",
    "created",
    "authenticated",
    "active",
    "pending",
    "halted",
    "cancelled",
    "completed",
    "expired",
    "paused",
}
UNLIMITED_SUBSCRIPTION_STATUSES = {"authenticated", "active"}
REUSABLE_CHECKOUT_STATUSES = {"created"}


@dataclass(frozen=True)
class AccessStatus:
    can_analyze: bool
    has_unlimited_reports: bool
    cas_report_limit: int
    cas_reports_used: int
    remaining_free_reports: int
    subscription_status: str
    razorpay_subscription_id: Optional[str] = None
    current_period_end: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "can_analyze": self.can_analyze,
            "has_unlimited_reports": self.has_unlimited_reports,
            "cas_report_limit": self.cas_report_limit,
            "cas_reports_used": self.cas_reports_used,
            "remaining_free_reports": self.remaining_free_reports,
            "subscription_status": self.subscription_status,
            "razorpay_subscription_id": self.razorpay_subscription_id,
            "current_period_end": self.current_period_end,
        }


@dataclass(frozen=True)
class CreditReservation:
    allowed: bool
    credit_consumed: bool
    access: AccessStatus


def get_razorpay_key_id() -> str:
    return os.environ.get("RAZORPAY_KEY_ID", "").strip()


def _get_razorpay_key_secret() -> str:
    return os.environ.get("RAZORPAY_KEY_SECRET", "").strip()


def _get_razorpay_plan_id() -> str:
    return os.environ.get("RAZORPAY_PLAN_ID", "").strip()


def _get_razorpay_webhook_secret() -> str:
    return os.environ.get("RAZORPAY_WEBHOOK_SECRET", "").strip()


def _get_subscription_total_count() -> int:
    raw_total_count = os.environ.get("RAZORPAY_SUBSCRIPTION_TOTAL_COUNT", "120").strip()
    try:
        total_count = int(raw_total_count)
    except ValueError:
        return 120
    return min(max(total_count, 1), 120)


def _require_supabase_service_config() -> tuple[str, str]:
    supabase_url = _get_supabase_url()
    service_key = _get_supabase_service_key()
    if not supabase_url or not service_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase service role is required for report limits and subscriptions.",
        )
    return supabase_url, service_key


def _require_razorpay_config() -> tuple[str, str, str]:
    key_id = get_razorpay_key_id()
    key_secret = _get_razorpay_key_secret()
    plan_id = _get_razorpay_plan_id()
    if not key_id or not key_secret or not plan_id:
        raise HTTPException(
            status_code=503,
            detail="Razorpay subscription is not configured.",
        )
    return key_id, key_secret, plan_id


def _extract_single_rpc_row(payload: Any) -> Dict[str, Any]:
    if isinstance(payload, list):
        payload = payload[0] if payload else {}
    if not isinstance(payload, dict):
        payload = {}
    return payload


def _parse_access_status(payload: Any) -> AccessStatus:
    payload = _extract_single_rpc_row(payload)

    report_limit = _safe_int(payload.get("cas_report_limit"), 0)
    reports_used = _safe_int(payload.get("cas_reports_used"), 0)
    has_unlimited = payload.get("has_unlimited_reports") is True
    remaining = _safe_int(payload.get("remaining_free_reports"), max(report_limit - reports_used, 0))
    computed_can_analyze = has_unlimited or remaining > 0
    if isinstance(payload.get("can_analyze"), bool):
        can_analyze = payload.get("can_analyze") is True and computed_can_analyze
    else:
        can_analyze = computed_can_analyze
    subscription_status = str(payload.get("subscription_status") or "free")
    subscription_id = payload.get("razorpay_subscription_id")
    period_end = payload.get("current_period_end")

    return AccessStatus(
        can_analyze=can_analyze,
        has_unlimited_reports=has_unlimited,
        cas_report_limit=report_limit,
        cas_reports_used=reports_used,
        remaining_free_reports=remaining,
        subscription_status=subscription_status,
        razorpay_subscription_id=subscription_id if isinstance(subscription_id, str) else None,
        current_period_end=period_end if isinstance(period_end, str) else None,
    )


def _parse_credit_reservation(payload: Any) -> CreditReservation:
    payload = _extract_single_rpc_row(payload)
    access = _parse_access_status(payload)
    allowed = payload.get("allowed") is True
    credit_consumed = payload.get("credit_consumed") is True
    return CreditReservation(allowed=allowed, credit_consumed=credit_consumed, access=access)


def _safe_int(value: Any, default: int) -> int:
    if isinstance(value, bool):
        return default
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return max(parsed, 0)


async def _supabase_rpc(function_name: str, payload: Dict[str, Any]) -> Any:
    supabase_url, service_key = _require_supabase_service_config()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{supabase_url}/rest/v1/rpc/{function_name}",
                headers={
                    **_auth_headers(service_key, service_key),
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                json=payload,
            )
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Unable to reach Supabase billing state.")

    if response.status_code >= 400:
        raise HTTPException(status_code=503, detail="Unable to update Supabase billing state.")
    try:
        return response.json()
    except ValueError:
        return None


async def get_access_status(user_id: str) -> AccessStatus:
    payload = await _supabase_rpc("echo_get_access_status", {"target_user_id": user_id})
    return _parse_access_status(payload)


async def reserve_analysis_credit(user_id: str) -> CreditReservation:
    payload = await _supabase_rpc("echo_consume_report_credit", {"target_user_id": user_id})
    reservation = _parse_credit_reservation(payload)
    if not reservation.allowed:
        raise HTTPException(
            status_code=402,
            detail="You have used your free CAS report. Subscribe for unlimited analysis.",
        )
    return reservation


async def refund_analysis_credit(user_id: str) -> AccessStatus:
    payload = await _supabase_rpc("echo_refund_report_credit", {"target_user_id": user_id})
    return _parse_access_status(payload)


async def apply_subscription_status(
    *,
    user_id: Optional[str],
    subscription_id: str,
    customer_id: Optional[str],
    status: str,
    current_period_end: Any,
) -> AccessStatus:
    normalized_status = normalize_subscription_status(status)
    if not is_valid_razorpay_subscription_id(subscription_id) or normalized_status is None:
        raise HTTPException(status_code=400, detail="Invalid Razorpay subscription state.")
    normalized_period_end = (
        current_period_end
        if isinstance(current_period_end, str) or current_period_end is None
        else _unix_to_iso(current_period_end)
    )
    payload = await _supabase_rpc(
        "echo_apply_razorpay_subscription_event",
        {
            "target_user_id": user_id,
            "new_subscription_id": subscription_id,
            "new_customer_id": customer_id,
            "new_subscription_status": normalized_status,
            "new_current_period_end": normalized_period_end,
        },
    )
    return _parse_access_status(payload)


async def claim_webhook_event(event_id: str, event_name: str) -> bool:
    payload = await _supabase_rpc(
        "echo_claim_razorpay_webhook_event",
        {"event_id": event_id, "event_name": event_name},
    )
    if isinstance(payload, bool):
        return payload
    if isinstance(payload, dict):
        return payload.get("echo_claim_razorpay_webhook_event") is True
    return False


async def create_razorpay_subscription(user: SupabaseUser) -> Dict[str, Any]:
    key_id, key_secret, plan_id = _require_razorpay_config()
    if not is_valid_razorpay_plan_id(plan_id):
        raise HTTPException(status_code=503, detail="Razorpay subscription is not configured.")
    notes = {
        "user_id": user.user_id,
        "username": user.username,
        "source": "echo-analyze",
    }
    notify_info: Dict[str, str] = {}
    if user.email:
        notify_info["notify_email"] = user.email

    body: Dict[str, Any] = {
        "plan_id": plan_id,
        "total_count": _get_subscription_total_count(),
        "quantity": 1,
        "customer_notify": 0,
        "notes": notes,
    }
    if notify_info:
        body["notify_info"] = notify_info

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{RAZORPAY_API_BASE}/subscriptions",
                auth=(key_id, key_secret),
                headers={"Content-Type": "application/json", "Accept": "application/json"},
                json=body,
            )
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Unable to reach Razorpay.")

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Razorpay could not create the subscription.")
    try:
        payload = response.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="Invalid Razorpay subscription response.")

    subscription_id = payload.get("id")
    status = payload.get("status")
    normalized_status = normalize_subscription_status(status)
    if (
        not is_valid_razorpay_subscription_id(subscription_id)
        or normalized_status is None
        or not subscription_matches_configured_plan(payload)
    ):
        raise HTTPException(status_code=502, detail="Invalid Razorpay subscription response.")

    current_period_end = _unix_to_iso(payload.get("current_end"))
    await apply_subscription_status(
        user_id=user.user_id,
        subscription_id=subscription_id,
        customer_id=payload.get("customer_id") if isinstance(payload.get("customer_id"), str) else None,
        status=normalized_status,
        current_period_end=current_period_end,
    )
    return payload


async def fetch_razorpay_subscription(subscription_id: str) -> Dict[str, Any]:
    key_id, key_secret, _plan_id = _require_razorpay_config()
    if not is_valid_razorpay_subscription_id(subscription_id):
        raise HTTPException(status_code=400, detail="Invalid Razorpay subscription id.")
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                f"{RAZORPAY_API_BASE}/subscriptions/{subscription_id}",
                auth=(key_id, key_secret),
                headers={"Accept": "application/json"},
            )
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Unable to reach Razorpay.")

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Unable to verify Razorpay subscription.")
    try:
        payload = response.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="Invalid Razorpay subscription response.")
    if not isinstance(payload, dict):
        raise HTTPException(status_code=502, detail="Invalid Razorpay subscription response.")
    return payload


def normalize_subscription_status(value: Any) -> Optional[str]:
    if not isinstance(value, str):
        return None
    status = value.strip().lower()
    return status if status in KNOWN_SUBSCRIPTION_STATUSES else None


def is_unlimited_subscription_status(value: Any) -> bool:
    return normalize_subscription_status(value) in UNLIMITED_SUBSCRIPTION_STATUSES


def is_reusable_checkout_status(value: Any) -> bool:
    return normalize_subscription_status(value) in REUSABLE_CHECKOUT_STATUSES


def is_valid_razorpay_payment_id(value: str) -> bool:
    return bool(isinstance(value, str) and RAZORPAY_PAYMENT_ID_PATTERN.fullmatch(value.strip()))


def is_valid_razorpay_plan_id(value: str) -> bool:
    return bool(isinstance(value, str) and RAZORPAY_PLAN_ID_PATTERN.fullmatch(value.strip()))


def is_valid_razorpay_subscription_id(value: str) -> bool:
    return bool(isinstance(value, str) and RAZORPAY_SUBSCRIPTION_ID_PATTERN.fullmatch(value.strip()))


def subscription_matches_configured_plan(subscription: Dict[str, Any]) -> bool:
    configured_plan_id = _get_razorpay_plan_id()
    if not configured_plan_id:
        return False
    plan_id = subscription.get("plan_id")
    return isinstance(plan_id, str) and hmac.compare_digest(plan_id, configured_plan_id)


def verify_checkout_signature(*, payment_id: str, subscription_id: str, signature: str) -> None:
    key_secret = _get_razorpay_key_secret()
    if not key_secret:
        raise HTTPException(status_code=503, detail="Razorpay subscription is not configured.")
    payment_id = payment_id.strip()
    subscription_id = subscription_id.strip()
    signature = signature.strip()
    if (
        not is_valid_razorpay_payment_id(payment_id)
        or not is_valid_razorpay_subscription_id(subscription_id)
        or not re.fullmatch(r"[A-Fa-f0-9]{64}", signature)
    ):
        raise HTTPException(status_code=400, detail="Invalid Razorpay payment signature.")
    expected = hmac.new(
        key_secret.encode("utf-8"),
        f"{payment_id}|{subscription_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid Razorpay payment signature.")


def verify_webhook_signature(raw_body: bytes, signature: str) -> None:
    webhook_secret = _get_razorpay_webhook_secret()
    if not webhook_secret:
        raise HTTPException(status_code=503, detail="Razorpay webhook is not configured.")
    signature = signature.strip()
    if not re.fullmatch(r"[A-Fa-f0-9]{64}", signature):
        raise HTTPException(status_code=400, detail="Invalid Razorpay webhook signature.")
    expected = hmac.new(webhook_secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid Razorpay webhook signature.")


def extract_subscription_event(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    subscription = (
        payload.get("payload", {})
        if isinstance(payload.get("payload"), dict)
        else {}
    ).get("subscription", {})
    if not isinstance(subscription, dict):
        return None
    entity = subscription.get("entity")
    if not isinstance(entity, dict):
        return None
    subscription_id = entity.get("id")
    status = entity.get("status")
    normalized_status = normalize_subscription_status(status)
    if not is_valid_razorpay_subscription_id(subscription_id) or normalized_status is None:
        return None
    if not subscription_matches_configured_plan(entity):
        return None

    notes = entity.get("notes") if isinstance(entity.get("notes"), dict) else {}
    user_id = notes.get("user_id")
    customer_id = entity.get("customer_id")
    return {
        "subscription_id": subscription_id,
        "status": normalized_status,
        "user_id": user_id if isinstance(user_id, str) and user_id else None,
        "customer_id": customer_id if isinstance(customer_id, str) else None,
        "current_period_end": _unix_to_iso(entity.get("current_end")),
    }


def _unix_to_iso(value: Any) -> Optional[str]:
    if value is None:
        return None
    try:
        timestamp = int(value)
    except (TypeError, ValueError):
        return None
    if timestamp <= 0:
        return None
    return datetime.fromtimestamp(timestamp, tz=timezone.utc).replace(microsecond=0).isoformat()
