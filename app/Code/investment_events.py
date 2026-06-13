import re
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel

MAX_INVESTMENT_EVENTS = 2_000

InvestmentEventType = Literal["purchase", "sip", "redemption", "dividend", "other"]


class InvestmentEvent(BaseModel):
    date: str
    type: InvestmentEventType
    amount: float
    scheme_name: Optional[str] = None


_SIP_KEYWORDS = ("SIP", "SYSTEMATIC")
_DIVIDEND_KEYWORDS = ("DIVIDEND", "IDCW", "INTEREST PAYOUT", "INTEREST PAID", "DIVIDEND PAID")
_REDEMPTION_KEYWORDS = ("REDEMPTION", "WITHDRAWAL", "SWITCH OUT", "SELL")
_PURCHASE_KEYWORDS = ("PURCHASE", "SWITCH IN", "BUY", "INITIAL", "LUMPSUM", "LUMP SUM")
_IGNORE_KEYWORDS = ("REINVEST", "RE-INVEST", "BONUS", "SPLIT")


def _safe_text(value: Any, default: str = "") -> str:
    if value is None:
        return default
    return str(value).strip() or default


def _parse_amount(value: Any) -> Optional[float]:
    if value is None or isinstance(value, bool):
        return None
    try:
        if isinstance(value, str):
            cleaned = value.strip()
            if not cleaned:
                return None
            if cleaned.startswith("(") and cleaned.endswith(")"):
                cleaned = cleaned[1:-1].strip()
            cleaned = re.sub(r"[₹$€£,\s]", "", cleaned)
            if not cleaned:
                return None
            return float(cleaned)
        return float(value)
    except (TypeError, ValueError):
        return None


def _classify_event_type(desc: str, txn_type: str, raw_units: float) -> InvestmentEventType:
    combined = f"{desc} {txn_type}".upper()
    if any(keyword in combined for keyword in _IGNORE_KEYWORDS):
        return "other"
    if any(keyword in combined for keyword in _DIVIDEND_KEYWORDS):
        return "dividend"
    if raw_units < 0 or any(keyword in combined for keyword in _REDEMPTION_KEYWORDS):
        return "redemption"
    if any(keyword in combined for keyword in _SIP_KEYWORDS):
        return "sip"
    if raw_units > 0 or any(keyword in combined for keyword in _PURCHASE_KEYWORDS):
        return "purchase"
    return "other"


def extract_investment_events(cas_data: dict) -> List[InvestmentEvent]:
    folios = cas_data.get("folios", [])
    if not isinstance(folios, list):
        return []

    events: List[InvestmentEvent] = []
    for folio in folios:
        if not isinstance(folio, dict):
            continue
        schemes = folio.get("schemes", [])
        if not isinstance(schemes, list):
            continue
        for scheme in schemes:
            if not isinstance(scheme, dict):
                continue
            scheme_name = _safe_text(scheme.get("scheme"), None) or _safe_text(scheme.get("name"), None)
            transactions = scheme.get("transactions", [])
            if not isinstance(transactions, list):
                continue
            for txn in transactions:
                if len(events) >= MAX_INVESTMENT_EVENTS:
                    return sorted(events, key=lambda item: item.date)
                if not isinstance(txn, dict):
                    continue
                date_str = _safe_text(txn.get("date"))
                if not date_str:
                    continue
                desc = _safe_text(txn.get("description"))
                txn_type = _safe_text(txn.get("type"))
                raw_units = _parse_amount(txn.get("units")) or 0.0
                raw_amt = _parse_amount(txn.get("amount"))
                if raw_amt is None or raw_amt == 0:
                    continue
                event_type = _classify_event_type(desc, txn_type, raw_units)
                if event_type == "other":
                    continue
                events.append(
                    InvestmentEvent(
                        date=date_str[:10] if len(date_str) >= 10 else date_str,
                        type=event_type,
                        amount=round(abs(raw_amt), 2),
                        scheme_name=scheme_name,
                    )
                )

    return sorted(events, key=lambda item: item.date)
