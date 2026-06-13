import secrets
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException

from app.Code.ai.review_ai import (
    build_client_review_payload,
    generate_client_summary,
    generate_meeting_brief,
)
from app.Code.investment_events import InvestmentEvent, extract_investment_events
from app.Code.supabase_auth import SupabaseUser, _auth_headers, _get_supabase_service_key, _get_supabase_url

REVIEW_LINK_TTL_DAYS = 90


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


async def _rest_get(path: str, params: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(path, headers=_service_headers(), params=params or {})
    if response.status_code >= 400:
        raise HTTPException(status_code=503, detail="Unable to read review data.")
    payload = response.json()
    return payload if isinstance(payload, list) else []


async def _rest_post(path: str, body: Dict[str, Any], *, prefer: str = "return=representation") -> List[Dict[str, Any]]:
    headers = _service_headers()
    headers["Content-Type"] = "application/json"
    headers["Prefer"] = prefer
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(path, headers=headers, json=body)
    if response.status_code >= 400:
        raise HTTPException(status_code=503, detail="Unable to save review data.")
    payload = response.json()
    return payload if isinstance(payload, list) else []


async def _rest_patch(path: str, body: Dict[str, Any], params: Dict[str, str]) -> None:
    headers = _service_headers()
    headers["Content-Type"] = "application/json"
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.patch(path, headers=headers, params=params, json=body)
    if response.status_code >= 400:
        raise HTTPException(status_code=503, detail="Unable to update review data.")


async def fetch_advisor_client(user_id: str, client_pan: str) -> Dict[str, Any]:
    normalized = client_pan.strip().upper()
    rows = await _rest_get(
        _rest_url("advisor_clients"),
        {
            "select": "client_pan,client_name,analysis_json,notes,next_review_date",
            "user_id": f"eq.{user_id}",
        },
    )
    match = next(
        (row for row in rows if str(row.get("client_pan", "")).strip().upper() == normalized),
        None,
    )
    if not match:
        raise HTTPException(status_code=404, detail="Client not found.")
    return match


def _analysis_metrics(analysis: Dict[str, Any], investment_events: List[InvestmentEvent]) -> Dict[str, Any]:
    summary = analysis.get("summary") or {}
    performance = summary.get("performance_summary") or {}
    one_year = performance.get("one_year") or {}
    concentration = summary.get("concentration") or {}
    portfolio_xirr = summary.get("portfolio_xirr")
    benchmark_xirr = summary.get("benchmark_xirr")
    xirr_delta = None
    if isinstance(portfolio_xirr, (int, float)) and isinstance(benchmark_xirr, (int, float)):
        xirr_delta = round(portfolio_xirr - benchmark_xirr, 2)
    return {
        "current_value": summary.get("total_market_value"),
        "invested_value": summary.get("total_cost_value"),
        "gain_loss": summary.get("total_gain_loss"),
        "portfolio_xirr": portfolio_xirr,
        "benchmark_xirr": benchmark_xirr,
        "xirr_delta": xirr_delta,
        "underperforming_pct": one_year.get("underperforming_pct"),
        "fund_count": concentration.get("fund_count"),
        "equity_pct": summary.get("equity_pct"),
        "sip_count": len([event for event in investment_events if event.type == "sip"]),
        "client_name": (summary.get("investor_info") or {}).get("name"),
    }


async def create_review_snapshot(
    user: SupabaseUser,
    client_pan: str,
    *,
    source: str,
    analysis: Dict[str, Any],
    investment_events: List[InvestmentEvent],
    client_payload: Dict[str, Any],
) -> Dict[str, Any]:
    rows = await _rest_post(
        _rest_url("review_snapshots"),
        {
            "advisor_id": user.user_id,
            "client_pan": client_pan.strip().upper(),
            "analysis_json": analysis,
            "client_payload_json": client_payload,
            "investment_events_json": [event.model_dump() for event in investment_events],
            "source": source,
        },
    )
    if not rows:
        raise HTTPException(status_code=503, detail="Could not create review snapshot.")
    return rows[0]


async def prepare_review(user: SupabaseUser, client_pan: str, notes: str = "") -> Dict[str, Any]:
    client_row = await fetch_advisor_client(user.user_id, client_pan)
    analysis = client_row.get("analysis_json") or {}
    if not analysis.get("success"):
        raise HTTPException(status_code=400, detail="Client has no successful analysis.")

    investment_events = [
        InvestmentEvent.model_validate(item)
        for item in (analysis.get("investment_events") or [])
        if isinstance(item, dict)
    ]
    metrics = _analysis_metrics(analysis, investment_events)
    client_name = str((analysis.get("summary") or {}).get("investor_info", {}).get("name") or client_row.get("client_name") or "Client")
    advisor_notes = notes or str(client_row.get("notes") or "")
    brief = await generate_meeting_brief(metrics, client_name, advisor_notes)

    next_review = (date.today() + timedelta(days=180)).isoformat()
    ai_summary = await generate_client_summary({**metrics, "health_status": "good"})
    client_payload = build_client_review_payload(
        analysis,
        investment_events,
        user.username,
        ai_summary=ai_summary,
        next_review_date=client_row.get("next_review_date") or next_review,
    )

    snapshot = await create_review_snapshot(
        user,
        client_pan,
        source="prepare_review",
        analysis=analysis,
        investment_events=investment_events,
        client_payload=client_payload,
    )

    brief_rows = await _rest_post(
        _rest_url("meeting_briefs"),
        {
            "advisor_id": user.user_id,
            "client_pan": client_pan.strip().upper(),
            "snapshot_id": snapshot["id"],
            "brief_json": brief.model_dump(),
            "whatsapp_draft": brief.whatsapp_draft,
            "email_draft": brief.email_draft,
        },
    )
    brief_row = brief_rows[0] if brief_rows else {}

    event_rows = await _rest_post(
        _rest_url("client_review_events"),
        {
            "advisor_id": user.user_id,
            "client_pan": client_pan.strip().upper(),
            "notes": advisor_notes,
            "meeting_brief_id": brief_row.get("id"),
            "snapshot_id": snapshot["id"],
            "next_review_date": next_review,
        },
    )

    await _rest_patch(
        _rest_url("advisor_clients"),
        {
            "last_review_at": datetime.now(timezone.utc).isoformat(),
            "next_review_date": next_review,
        },
        {
            "user_id": f"eq.{user.user_id}",
            "client_pan": f"eq.{client_pan.strip().upper()}",
        },
    )

    return {
        "snapshot_id": snapshot["id"],
        "brief": brief.model_dump(),
        "event_id": event_rows[0]["id"] if event_rows else None,
        "next_review_date": next_review,
    }


async def share_review(user: SupabaseUser, client_pan: str) -> Dict[str, Any]:
    client_row = await fetch_advisor_client(user.user_id, client_pan)
    analysis = client_row.get("analysis_json") or {}
    if not analysis.get("success"):
        raise HTTPException(status_code=400, detail="Client has no successful analysis.")

    investment_events = [
        InvestmentEvent.model_validate(item)
        for item in (analysis.get("investment_events") or [])
        if isinstance(item, dict)
    ]
    metrics = _analysis_metrics(analysis, investment_events)
    ai_summary = await generate_client_summary(metrics)
    next_review = client_row.get("next_review_date") or (date.today() + timedelta(days=180)).isoformat()
    client_payload = build_client_review_payload(
        analysis,
        investment_events,
        user.username,
        ai_summary=ai_summary,
        next_review_date=next_review,
    )

    snapshot = await create_review_snapshot(
        user,
        client_pan,
        source="share_review",
        analysis=analysis,
        investment_events=investment_events,
        client_payload=client_payload,
    )

    share_id = secrets.token_urlsafe(16)
    expires_at = (datetime.now(timezone.utc) + timedelta(days=REVIEW_LINK_TTL_DAYS)).isoformat()
    link_rows = await _rest_post(
        _rest_url("review_links"),
        {
            "advisor_id": user.user_id,
            "client_pan": client_pan.strip().upper(),
            "share_id": share_id,
            "snapshot_id": snapshot["id"],
            "expires_at": expires_at,
            "is_active": True,
        },
    )
    link_row = link_rows[0] if link_rows else {}

    event_rows = await _rest_post(
        _rest_url("client_review_events"),
        {
            "advisor_id": user.user_id,
            "client_pan": client_pan.strip().upper(),
            "review_link_id": link_row.get("id"),
            "snapshot_id": snapshot["id"],
            "next_review_date": next_review,
        },
    )

    return {
        "share_id": share_id,
        "link_id": link_row.get("id"),
        "expires_at": expires_at,
        "review_url_path": f"/review/{share_id}",
        "event_id": event_rows[0]["id"] if event_rows else None,
    }


async def get_public_review(share_id: str) -> Dict[str, Any]:
    links = await _rest_get(
        _rest_url("review_links"),
        {
            "select": "id,is_active,expires_at,snapshot_id",
            "share_id": f"eq.{share_id}",
            "limit": "1",
        },
    )
    if not links:
        raise HTTPException(status_code=404, detail="Review link not found.")
    link = links[0]
    if not link.get("is_active"):
        raise HTTPException(status_code=410, detail="This review link has been disabled.")
    expires_at = link.get("expires_at")
    if expires_at:
        expiry = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
        if expiry < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="This review link has expired.")

    snapshots = await _rest_get(
        _rest_url("review_snapshots"),
        {
            "select": "client_payload_json",
            "id": f"eq.{link['snapshot_id']}",
            "limit": "1",
        },
    )
    if not snapshots:
        raise HTTPException(status_code=404, detail="Review snapshot not found.")
    payload = snapshots[0].get("client_payload_json") or {}
    if not isinstance(payload, dict):
        raise HTTPException(status_code=404, detail="Review snapshot invalid.")
    return payload


async def disable_review_link(user: SupabaseUser, link_id: str) -> None:
    await _rest_patch(
        _rest_url("review_links"),
        {"is_active": False},
        {
            "id": f"eq.{link_id}",
            "advisor_id": f"eq.{user.user_id}",
        },
    )


async def list_review_history(user: SupabaseUser, client_pan: str) -> List[Dict[str, Any]]:
    return await _rest_get(
        _rest_url("client_review_events"),
        {
            "select": "id,review_date,notes,next_review_date,snapshot_id,meeting_brief_id,review_link_id",
            "advisor_id": f"eq.{user.user_id}",
            "client_pan": f"eq.{client_pan.strip().upper()}",
            "order": "review_date.desc",
        },
    )


async def list_review_links(user: SupabaseUser, client_pan: str) -> List[Dict[str, Any]]:
    return await _rest_get(
        _rest_url("review_links"),
        {
            "select": "id,share_id,created_at,expires_at,is_active,snapshot_id",
            "advisor_id": f"eq.{user.user_id}",
            "client_pan": f"eq.{client_pan.strip().upper()}",
            "order": "created_at.desc",
        },
    )


async def compare_review_snapshots(user: SupabaseUser, left_id: str, right_id: str) -> Dict[str, Any]:
    rows = await _rest_get(
        _rest_url("review_snapshots"),
        {
            "select": "id,client_payload_json,created_at",
            "advisor_id": f"eq.{user.user_id}",
            "id": f"in.({left_id},{right_id})",
        },
    )
    if len(rows) != 2:
        raise HTTPException(status_code=404, detail="Snapshots not found.")

    by_id = {row["id"]: row for row in rows}
    left = by_id[left_id]["client_payload_json"] or {}
    right = by_id[right_id]["client_payload_json"] or {}
    left_overview = left.get("overview") or {}
    right_overview = right.get("overview") or {}

    def delta(key: str) -> Optional[float]:
        left_val = left_overview.get(key)
        right_val = right_overview.get(key)
        if isinstance(left_val, (int, float)) and isinstance(right_val, (int, float)):
            return round(right_val - left_val, 2)
        return None

    return {
        "left_snapshot_id": left_id,
        "right_snapshot_id": right_id,
        "left_created_at": by_id[left_id].get("created_at"),
        "right_created_at": by_id[right_id].get("created_at"),
        "deltas": {
            "current_value": delta("current_value"),
            "invested_value": delta("invested_value"),
            "gain_loss": delta("gain_loss"),
            "portfolio_xirr": delta("portfolio_xirr"),
            "benchmark_xirr": delta("benchmark_xirr"),
        },
        "left_health_status": left.get("health_status"),
        "right_health_status": right.get("health_status"),
    }


async def create_cas_upload_snapshot(user_id: str, client_pan: str, analysis: Dict[str, Any], advisor_name: str) -> None:
    if not analysis.get("success"):
        return
    investment_events = [
        InvestmentEvent.model_validate(item)
        for item in (analysis.get("investment_events") or [])
        if isinstance(item, dict)
    ]
    client_payload = build_client_review_payload(analysis, investment_events, advisor_name)
    await _rest_post(
        _rest_url("review_snapshots"),
        {
            "advisor_id": user_id,
            "client_pan": client_pan.strip().upper(),
            "analysis_json": analysis,
            "client_payload_json": client_payload,
            "investment_events_json": [event.model_dump() for event in investment_events],
            "source": "cas_upload",
        },
        prefer="return=minimal",
    )
