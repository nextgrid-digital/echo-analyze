from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from app.Code.ai.prompts import RECOMMENDATION_PATTERNS, SYSTEM_PROMPT
from app.Code.ai.provider import LLMProvider, get_llm_provider
from app.Code.investment_events import InvestmentEvent

PortfolioHealthStatus = Literal["excellent", "good", "needs_attention"]


class ClientSummaryAI(BaseModel):
    whats_working_well: List[str] = Field(default_factory=list)
    areas_to_discuss: List[str] = Field(default_factory=list)


class MeetingBriefAI(BaseModel):
    client_summary: str = ""
    key_strengths: List[str] = Field(default_factory=list)
    key_concerns: List[str] = Field(default_factory=list)
    discussion_topics: List[str] = Field(default_factory=list)
    questions_to_ask: List[str] = Field(default_factory=list)
    follow_up_actions: List[str] = Field(default_factory=list)
    whatsapp_draft: str = ""
    email_draft: str = ""


def _contains_recommendation(text: str) -> bool:
    lowered = text.lower()
    return any(pattern in lowered for pattern in RECOMMENDATION_PATTERNS)


def _sanitize_text_list(items: List[str]) -> List[str]:
    cleaned: List[str] = []
    for item in items:
        value = str(item).strip()
        if not value or _contains_recommendation(value):
            continue
        cleaned.append(value)
    return cleaned


def _format_inr(value: float) -> str:
    if value >= 10_000_000:
        return f"₹{(value / 10_000_000):.2f} Cr"
    if value >= 100_000:
        return f"₹{(value / 100_000):.2f} L"
    return f"₹{value:,.0f}"


def compute_portfolio_health_status(metrics: Dict[str, Any]) -> PortfolioHealthStatus:
    underperforming_pct = float(metrics.get("underperforming_pct") or 0)
    fund_count = int(metrics.get("fund_count") or 0)
    equity_gap = abs(float(metrics.get("equity_gap") or 0))
    xirr_delta = metrics.get("xirr_delta")

    score = 0
    if underperforming_pct > 25:
        score += 2
    elif underperforming_pct > 10:
        score += 1
    if fund_count > 20:
        score += 2
    elif fund_count > 15:
        score += 1
    if equity_gap > 15:
        score += 2
    elif equity_gap > 8:
        score += 1
    if isinstance(xirr_delta, (int, float)) and xirr_delta < -3:
        score += 2
    elif isinstance(xirr_delta, (int, float)) and xirr_delta < 0:
        score += 1

    if score >= 4:
        return "needs_attention"
    if score >= 2:
        return "good"
    return "excellent"


def build_wealth_journey(
    events: List[InvestmentEvent],
    current_value: float,
    statement_date: Optional[str],
) -> Dict[str, Any]:
    if not events:
        return {
            "mode": "limited",
            "points": [],
            "milestones": [],
        }

    cumulative_invested = 0.0
    points: List[Dict[str, Any]] = []
    milestones: List[Dict[str, Any]] = []

    for event in events:
        if event.type in {"purchase", "sip"}:
            cumulative_invested += event.amount
        elif event.type == "redemption":
            cumulative_invested = max(0.0, cumulative_invested - event.amount)
        points.append(
            {
                "date": event.date,
                "invested": round(cumulative_invested, 2),
                "event_type": event.type,
                "amount": event.amount,
            }
        )

    if statement_date:
        points.append(
            {
                "date": statement_date,
                "invested": round(cumulative_invested, 2),
                "portfolio_value": round(current_value, 2),
                "event_type": "current",
                "amount": current_value,
            }
        )

    thresholds = [
        (1_000_000, "₹10 L invested"),
        (5_000_000, "₹50 L portfolio milestone"),
        (10_000_000, "₹1 Cr portfolio milestone"),
    ]
    for threshold, label in thresholds:
        if current_value >= threshold:
            milestones.append({"label": label, "value": threshold})

    first_sip = next((event for event in events if event.type == "sip"), None)
    if first_sip:
        milestones.insert(0, {"label": "First SIP recorded", "date": first_sip.date})

    return {
        "mode": "transactions",
        "points": points[-120:],
        "milestones": milestones,
    }


def build_client_review_payload(
    analysis: Dict[str, Any],
    investment_events: List[InvestmentEvent],
    advisor_name: str,
    ai_summary: Optional[ClientSummaryAI] = None,
    next_review_date: Optional[str] = None,
) -> Dict[str, Any]:
    summary = analysis.get("summary") or {}
    investor = summary.get("investor_info") or {}
    client_name = str(investor.get("name") or "Client").strip()
    performance = summary.get("performance_summary") or {}
    one_year = performance.get("one_year") or {}
    guidelines = summary.get("guidelines") or {}
    investment_guidelines = guidelines.get("investment_guidelines") or {}
    asset_targets = investment_guidelines.get("asset_allocation") or []
    target_equity = 80.0
    for item in asset_targets:
        if isinstance(item, dict) and item.get("label") == "Equity":
            target_equity = float(item.get("recommended") or 80)
            break

    equity_pct = float(summary.get("equity_pct") or 0)
    concentration = summary.get("concentration") or {}
    portfolio_xirr = summary.get("portfolio_xirr")
    benchmark_xirr = summary.get("benchmark_xirr")
    xirr_delta = None
    if isinstance(portfolio_xirr, (int, float)) and isinstance(benchmark_xirr, (int, float)):
        xirr_delta = round(portfolio_xirr - benchmark_xirr, 2)

    health_metrics = {
        "underperforming_pct": float(one_year.get("underperforming_pct") or 0),
        "fund_count": int(concentration.get("fund_count") or 0),
        "equity_gap": abs(equity_pct - target_equity),
        "xirr_delta": xirr_delta,
    }
    health_status = compute_portfolio_health_status(health_metrics)

    if not next_review_date:
        next_review_date = (date.today() + timedelta(days=180)).isoformat()

    allocation = []
    for item in summary.get("asset_allocation") or []:
        if not isinstance(item, dict):
            continue
        allocation.append(
            {
                "category": item.get("category"),
                "allocation_pct": item.get("allocation_pct"),
            }
        )

    whats_working = ai_summary.whats_working_well if ai_summary else []
    areas_to_discuss = ai_summary.areas_to_discuss if ai_summary else []

    return {
        "client_name": client_name,
        "advisor_name": advisor_name,
        "statement_date": summary.get("statement_date"),
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "overview": {
            "current_value": summary.get("total_market_value"),
            "invested_value": summary.get("total_cost_value"),
            "gain_loss": summary.get("total_gain_loss"),
            "portfolio_return": summary.get("portfolio_return"),
            "portfolio_xirr": portfolio_xirr,
            "benchmark_xirr": benchmark_xirr,
            "benchmark_label": "Benchmark",
        },
        "health_status": health_status,
        "wealth_journey": build_wealth_journey(
            investment_events,
            float(summary.get("total_market_value") or 0),
            summary.get("statement_date"),
        ),
        "asset_allocation": allocation,
        "whats_working_well": whats_working,
        "areas_to_discuss": areas_to_discuss,
        "next_review_date": next_review_date,
    }


def _fallback_client_summary(metrics: Dict[str, Any]) -> ClientSummaryAI:
    current_value = metrics.get("current_value")
    xirr_delta = metrics.get("xirr_delta")
    health = metrics.get("health_status", "good")
    items_working = []
    items_discuss = []

    if isinstance(current_value, (int, float)):
        items_working.append(f"Portfolio value stands at {_format_inr(float(current_value))}.")
    if isinstance(xirr_delta, (int, float)) and xirr_delta >= 0:
        items_working.append(f"Portfolio return is ahead of benchmark by {xirr_delta:.1f}%.")
    elif health == "excellent":
        items_working.append("Overall portfolio health indicators are in a healthy range.")

    if health == "needs_attention":
        items_discuss.append("Review areas where performance or allocation may need attention.")
    if isinstance(xirr_delta, (int, float)) and xirr_delta < 0:
        items_discuss.append(f"Discuss benchmark comparison — portfolio trails by {abs(xirr_delta):.1f}%.")
    items_discuss.append("Confirm goals, liquidity needs, and upcoming life events.")
    if not items_working:
        items_working.append("Portfolio review completed with current holdings snapshot.")
    return ClientSummaryAI(whats_working_well=items_working, areas_to_discuss=items_discuss)


def _fallback_meeting_brief(metrics: Dict[str, Any], client_name: str) -> MeetingBriefAI:
    current_value = metrics.get("current_value")
    xirr_delta = metrics.get("xirr_delta")
    summary_line = f"{client_name}'s portfolio review is ready."
    if isinstance(current_value, (int, float)):
        summary_line += f" Current value is {_format_inr(float(current_value))}."
    if isinstance(xirr_delta, (int, float)):
        if xirr_delta >= 0:
            summary_line += f" Benchmark outperformance is {xirr_delta:.1f}%."
        else:
            summary_line += f" Benchmark gap is {abs(xirr_delta):.1f}%."

    whatsapp = (
        f"Hi {client_name.split()[0] if client_name else 'there'},\n\n"
        "I've prepared your portfolio review. "
        "Let me know a convenient time to walk through the highlights together."
    )
    email = (
        f"Dear {client_name},\n\n"
        "Your portfolio review is ready. I'd like to schedule time to discuss "
        "what's working well and topics worth exploring together.\n\n"
        "Best regards"
    )
    return MeetingBriefAI(
        client_summary=summary_line,
        key_strengths=["Consistent review cadence maintained", "Portfolio snapshot is up to date"],
        key_concerns=["Validate goal alignment during the meeting"],
        discussion_topics=["Performance vs benchmark", "Asset allocation fit", "Upcoming cash flow needs"],
        questions_to_ask=["Any major expenses or goals in the next 12 months?", "Comfort level with current equity allocation?"],
        follow_up_actions=["Share review summary", "Schedule next review"],
        whatsapp_draft=whatsapp,
        email_draft=email,
    )


async def generate_client_summary(metrics: Dict[str, Any], provider: Optional[LLMProvider] = None) -> ClientSummaryAI:
    llm = provider or get_llm_provider()
    if llm is None:
        return _fallback_client_summary(metrics)

    prompt = f"Generate client-facing review narrative from these metrics:\n{metrics}"
    try:
        result = await llm.complete_json(SYSTEM_PROMPT, prompt, ClientSummaryAI)
        return ClientSummaryAI(
            whats_working_well=_sanitize_text_list(result.whats_working_well),
            areas_to_discuss=_sanitize_text_list(result.areas_to_discuss),
        )
    except Exception:
        return _fallback_client_summary(metrics)


async def generate_meeting_brief(
    metrics: Dict[str, Any],
    client_name: str,
    advisor_notes: str = "",
    provider: Optional[LLMProvider] = None,
) -> MeetingBriefAI:
    llm = provider or get_llm_provider()
    if llm is None:
        return _fallback_meeting_brief(metrics, client_name)

    notes_line = f"\nAdvisor notes (context only, do not quote verbatim):\n{advisor_notes}" if advisor_notes else ""
    prompt = f"Prepare an advisor meeting brief for {client_name}.\nMetrics:\n{metrics}{notes_line}"
    try:
        result = await llm.complete_json(SYSTEM_PROMPT, prompt, MeetingBriefAI)
        return MeetingBriefAI(
            client_summary=result.client_summary.strip(),
            key_strengths=_sanitize_text_list(result.key_strengths),
            key_concerns=_sanitize_text_list(result.key_concerns),
            discussion_topics=_sanitize_text_list(result.discussion_topics),
            questions_to_ask=_sanitize_text_list(result.questions_to_ask),
            follow_up_actions=_sanitize_text_list(result.follow_up_actions),
            whatsapp_draft=result.whatsapp_draft.strip(),
            email_draft=result.email_draft.strip(),
        )
    except Exception:
        return _fallback_meeting_brief(metrics, client_name)
