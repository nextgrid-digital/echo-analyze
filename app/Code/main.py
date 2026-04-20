import asyncio
import io
import json
import os
import re
import uuid
from bisect import bisect_right
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from time import perf_counter
from typing import Any, Dict, List, Literal, Optional, Tuple

from fastapi import Depends, FastAPI, File, Form, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.Code.analytics import get_admin_overview, record_analysis_run, record_audit_log
from app.Code.auth import (
    AuthContext,
    fetch_clerk_user_count,
    require_admin_user,
    require_authenticated_user,
)
from app.cas_parser import convert_to_excel, parse_with_casparser
from app.holdings import get_holdings_for_schemes, save_amfi_cache_async
from app.overlap import compute_overlap_matrix
from app.utils import calculate_xirr, fetch_live_nav, fetch_nav_history, save_cache_async

app = FastAPI()

LOG_FILE = "data/backend_debug.log"
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
UPLOAD_READ_CHUNK_BYTES = 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".json"}
ALLOWED_CONTENT_TYPES = {
    ".pdf": {"application/pdf", "application/octet-stream"},
    ".json": {"application/json", "text/json", "application/octet-stream", "text/plain"},
}
PDF_MAGIC_PREFIX = b"%PDF-"
DEBUG_LOG_ENABLED = os.environ.get("ENABLE_DEBUG_LOGS", "").strip().lower() in {"1", "true", "yes"}


def _redact_pii(text: str) -> str:
    if not text:
        return text
    text = re.sub(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", "[REDACTED_PAN]", text, flags=re.IGNORECASE)
    text = re.sub(r"[\w\.-]+@[\w\.-]+\.\w+", "[REDACTED_EMAIL]", text)
    text = re.sub(r"(?<![\d.])(?:\+?\d[\d\-\s]{8,}\d)(?![\d.])", "[REDACTED_PHONE]", text)
    return text


def log_debug(msg: str) -> None:
    if not DEBUG_LOG_ENABLED:
        return
    safe_msg = _redact_pii(str(msg))
    try:
        print(f"[DEBUG] {safe_msg}", flush=True)
        if not os.environ.get("VERCEL"):
            with open(LOG_FILE, "a") as f:
                f.write(f"[{datetime.now()}] {safe_msg}\n")
    except Exception:
        pass


def _get_allowed_origins() -> List[str]:
    env_val = os.environ.get("CORS_ALLOW_ORIGINS", "")
    if env_val.strip():
        origins = [x.strip() for x in env_val.split(",") if x.strip()]
    else:
        origins = [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ]
    return [o for o in origins if o != "*"]


log_debug("--- Starting MF-CAS Analyzer Backend (Security + Accuracy Remediated) ---")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_sub_category(scheme_name: str, scheme_type: str) -> str:
    name = (scheme_name or "").upper()
    typ = (scheme_type or "").upper()
    if "LIQUID" in name or "OVERNIGHT" in name or "MONEY MARKET" in name:
        return "Diff - Liquidity"
    if "ELSS" in name or "TAX SAVER" in name:
        return "ELSS (Tax Savings)"
    if "ETF" in name or "INDEX" in name or "NIFTY" in name or "SENSEX" in name:
        return "Index Fund"
    if "LARGE & MID" in name:
        return "Large & Mid-Cap"
    if "MID CAP" in name:
        return "Mid-Cap"
    if "SMALL CAP" in name:
        return "Small-Cap"
    if "FLEXI CAP" in name:
        return "Flexi Cap"
    if "LARGE CAP" in name or "BLUECHIP" in name or "TOP 100" in name or "FOCUS" in name:
        return "Large-Cap"
    if "HYBRID" in name or "BALANCED" in name or "AGGRESSIVE" in name:
        return "Equity - Hybrid"
    # Type-based debt mapping must happen before "GROWTH" keyword checks.
    if "DEBT" in typ or "FIXED INCOME" in typ:
        return "Debt - Market"
    if "EQUITY" in typ or "GROWTH" in name or "DIVIDEND" in name:
        return "Equity - Other"
    return "Others"


def _infer_category(scheme_name: str, scheme_type: str, sub_category: str) -> Tuple[str, bool]:
    name = (scheme_name or "").upper()
    typ = (scheme_type or "").upper()
    sub = (sub_category or "").upper()
    equity_forced_hints = ["ETF", "INDEX", "NIFTY", "SENSEX", "NASDAQ", "HANG SENG"]
    debt_forced_hints = ["DEBT", "BOND", "GILT", "LIQUID", "OVERNIGHT", "MONEY MARKET", "CREDIT RISK"]
    equity_hints = [
        "EQUITY", "ELSS", "INDEX", "ETF", "NIFTY", "SENSEX", "LARGE", "MID", "SMALL",
        "FLEXI", "BLUECHIP", "FOCUSED", "VALUE", "CONTRA", "INTERNATIONAL", "OVERSEAS",
        "NASDAQ", "HANG SENG"
    ]
    debt_hints = [
        "DEBT", "LIQUID", "OVERNIGHT", "MONEY MARKET", "GILT", "CORPORATE BOND",
        "SHORT DURATION", "CREDIT RISK", "FIXED INCOME"
    ]
    equity_signal = any(x in name for x in equity_hints) or "EQUITY" in typ
    debt_signal = any(x in name for x in debt_hints) or "DEBT" in typ or "FIXED INCOME" in typ

    # Prevent ETF/Index/FoF equity schemes from being misclassified when source types are noisy.
    if any(x in name for x in equity_forced_hints) and not any(x in name for x in debt_forced_hints):
        return "Equity", False
    if "FUND OF FUND" in typ or "FOF" in typ:
        if any(x in name for x in equity_hints) and not any(x in name for x in debt_forced_hints):
            return "Equity", False

    if "EQUITY" in sub or "INDEX" in sub or "CAP" in sub or "ELSS" in sub:
        return "Equity", False
    if "DEBT" in sub or "LIQUID" in sub:
        return "Fixed Income", False
    if equity_signal and not debt_signal:
        return "Equity", False
    if debt_signal and not equity_signal:
        return "Fixed Income", False
    if equity_signal and debt_signal:
        return "Equity", False
    return "Others", True


def _parse_iso_date(value: str) -> Optional[datetime]:
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except Exception:
        return None


def _parse_amount(value) -> Optional[float]:
    if value is None:
        return None
    try:
        if isinstance(value, str):
            return float(value.replace(",", ""))
        return float(value)
    except Exception:
        return None


async def _read_upload_limited(file: UploadFile) -> Tuple[Optional[bytes], Optional[str]]:
    total_read = 0
    chunks: List[bytes] = []

    while True:
        chunk = await file.read(UPLOAD_READ_CHUNK_BYTES)
        if not chunk:
            break
        total_read += len(chunk)
        if total_read > MAX_UPLOAD_BYTES:
            return None, "File is too large. Maximum supported size is 25 MB."
        chunks.append(chunk)

    return b"".join(chunks), None


def _validate_cas_json_shape(cas_data: dict) -> Optional[str]:
    folios = cas_data.get("folios")
    if not isinstance(folios, list):
        return "Invalid CAS JSON format. 'folios' must be a list."

    for folio_idx, folio in enumerate(folios, start=1):
        if not isinstance(folio, dict):
            return f"Invalid CAS JSON format. Folio #{folio_idx} must be an object."

        schemes = folio.get("schemes", [])
        if schemes is None:
            continue
        if not isinstance(schemes, list):
            return f"Invalid CAS JSON format. Folio #{folio_idx} 'schemes' must be a list."

        for scheme_idx, scheme in enumerate(schemes, start=1):
            if not isinstance(scheme, dict):
                return (
                    "Invalid CAS JSON format. "
                    f"Scheme #{scheme_idx} in folio #{folio_idx} must be an object."
                )

            valuation = scheme.get("valuation")
            if valuation is not None and not isinstance(valuation, dict):
                return (
                    "Invalid CAS JSON format. "
                    f"'valuation' for scheme #{scheme_idx} in folio #{folio_idx} must be an object."
                )

            transactions = scheme.get("transactions", [])
            if transactions is None:
                continue
            if not isinstance(transactions, list):
                return (
                    "Invalid CAS JSON format. "
                    f"'transactions' for scheme #{scheme_idx} in folio #{folio_idx} must be a list."
                )
            for txn_idx, txn in enumerate(transactions, start=1):
                if not isinstance(txn, dict):
                    return (
                        "Invalid CAS JSON format. "
                        f"Transaction #{txn_idx} for scheme #{scheme_idx} in folio #{folio_idx} must be an object."
                    )

    return None


def _prepare_benchmark_history(raw_history: Dict[str, float]) -> Tuple[Dict[str, float], List[str], List[date], float]:
    iso_history: Dict[str, float] = {}
    for d_str, val in raw_history.items():
        try:
            dt_obj = datetime.strptime(d_str, "%d-%m-%Y")
            iso_history[dt_obj.strftime("%Y-%m-%d")] = float(val)
        except Exception:
            continue
    sorted_keys = sorted(iso_history.keys())
    sorted_dates = [datetime.strptime(d, "%Y-%m-%d").date() for d in sorted_keys]
    bench_nav_now = iso_history[sorted_keys[-1]] if sorted_keys else 0.0
    return iso_history, sorted_keys, sorted_dates, bench_nav_now


def _benchmark_nav_for_date(
    date_str: str,
    benchmark_history: Dict[str, float],
    sorted_iso_keys: List[str],
    sorted_date_objs: List[date],
) -> Tuple[Optional[float], bool]:
    if date_str in benchmark_history:
        return benchmark_history[date_str], True
    dt = _parse_iso_date(date_str)
    if not dt:
        return None, False
    idx = bisect_right(sorted_date_objs, dt.date()) - 1
    if idx >= 0:
        return benchmark_history[sorted_iso_keys[idx]], False
    if sorted_iso_keys:
        return benchmark_history[sorted_iso_keys[0]], False
    return None, False


@dataclass(frozen=True)
class BenchmarkComponent:
    code: str
    weight: float
    label: str


@dataclass
class TaxLot:
    acquired_on: datetime
    units: float
    cost_per_unit: float


def _resolve_benchmark_components(
    scheme_name: str,
    scheme_type: str,
    sub_category: str,
    category: str,
) -> List[BenchmarkComponent]:
    name = (scheme_name or "").upper()
    typ = (scheme_type or "").upper()
    sub = (sub_category or "").upper()
    text = f"{name} {typ} {sub}"

    def has_any(*needles: str) -> bool:
        return any(needle in text for needle in needles)

    eq_nifty50 = BenchmarkComponent("120716", 1.0, "Nifty 50 TRI proxy")
    eq_nifty100 = BenchmarkComponent("147666", 1.0, "Nifty 100 TRI proxy")
    eq_next50 = BenchmarkComponent("149466", 1.0, "Nifty Next 50 TRI proxy")
    eq_nifty500 = BenchmarkComponent("152731", 1.0, "Nifty 500 TRI proxy")
    eq_mid150 = BenchmarkComponent("148726", 1.0, "Nifty Midcap 150 TRI proxy")
    eq_small250 = BenchmarkComponent("148519", 1.0, "Nifty Smallcap 250 TRI proxy")
    eq_sensex = BenchmarkComponent("152422", 1.0, "BSE Sensex TRI proxy")
    eq_nasdaq100 = BenchmarkComponent("149219", 1.0, "Nasdaq 100 proxy")
    eq_sp500 = BenchmarkComponent("148381", 1.0, "S&P 500 proxy")
    eq_hang_seng = BenchmarkComponent("140095", 1.0, "Hang Seng proxy")
    alt_gold = BenchmarkComponent("119132", 1.0, "Gold proxy")
    debt_liquid = BenchmarkComponent("120197", 1.0, "Liquid debt proxy")
    debt_corp = BenchmarkComponent("120692", 1.0, "Corporate bond proxy")
    debt_gilt = BenchmarkComponent("120590", 1.0, "Gilt proxy")
    debt_credit = BenchmarkComponent("120711", 1.0, "Credit risk proxy")

    if "GOLD" in text:
        return [alt_gold]
    if has_any("SILVER", "PRECIOUS METAL", "COMMODITY"):
        return []

    if has_any("NASDAQ"):
        return [eq_nasdaq100]
    if has_any("S&P 500", "SP500"):
        return [eq_sp500]
    if has_any("HANG SENG"):
        return [eq_hang_seng]
    if has_any("SENSEX"):
        return [eq_sensex]
    if has_any("NIFTY NEXT 50", "NEXT 50", "JUNIOR BEES"):
        return [eq_next50]
    if has_any("NIFTY 500"):
        return [eq_nifty500]
    if has_any("NIFTY 100"):
        return [eq_nifty100]
    if has_any("NIFTY MIDCAP 150", "MIDCAP 150"):
        return [eq_mid150]
    if has_any("NIFTY SMALLCAP 250", "SMALLCAP 250"):
        return [eq_small250]
    if has_any("NIFTY 50"):
        return [eq_nifty50]
    if has_any("NIFTY BEES", "NIFTYBEES"):
        return [eq_nifty50]

    if has_any("HYBRID", "BALANCED", "AGGRESSIVE", "BALANCED ADVANTAGE", "DYNAMIC ASSET ALLOCATION", "MULTI ASSET") or "EQUITY - HYBRID" in sub:
        if has_any("CONSERVATIVE", "MONTHLY INCOME"):
            return [
                BenchmarkComponent(eq_nifty500.code, 0.25, eq_nifty500.label),
                BenchmarkComponent(debt_corp.code, 0.75, debt_corp.label),
            ]
        if has_any("BALANCED ADVANTAGE", "DYNAMIC ASSET ALLOCATION"):
            return [
                BenchmarkComponent(eq_nifty500.code, 0.5, eq_nifty500.label),
                BenchmarkComponent(debt_corp.code, 0.5, debt_corp.label),
            ]
        if has_any("MULTI ASSET"):
            return [
                BenchmarkComponent(eq_nifty500.code, 0.5, eq_nifty500.label),
                BenchmarkComponent(debt_corp.code, 0.3, debt_corp.label),
                BenchmarkComponent(alt_gold.code, 0.2, alt_gold.label),
            ]
        return [
            BenchmarkComponent(eq_nifty500.code, 0.65, eq_nifty500.label),
            BenchmarkComponent(debt_corp.code, 0.35, debt_corp.label),
        ]

    if category == "Fixed Income" or "DEBT" in typ or "FIXED INCOME" in typ:
        if has_any("LIQUID", "OVERNIGHT", "MONEY MARKET", "ULTRA SHORT", "LOW DURATION"):
            return [debt_liquid]
        if has_any("GILT", "TREASURY", "CONSTANT MATURITY", "SDL"):
            return [debt_gilt]
        if has_any("CREDIT RISK", "LOW RATED", "HIGH YIELD"):
            return [debt_credit]
        return [debt_corp]

    if category == "Equity":
        if has_any("BANKING", "FINANCIAL SERVICES", "PHARMA", "HEALTHCARE", "INFRA", "INFRASTRUCTURE", "CONSUMPTION", "MNC", "MANUFACTURING", "DIGITAL", "TECHNOLOGY", "BUSINESS CYCLE", "PSU"):
            return []
        if has_any("LARGE & MID", "LARGE AND MID", "LARGEMIDCAP", "LARGE MIDCAP 250", "LARGEMIDCAP 250"):
            return [
                BenchmarkComponent(eq_nifty100.code, 0.5, eq_nifty100.label),
                BenchmarkComponent(eq_mid150.code, 0.5, eq_mid150.label),
            ]
        if has_any("MIDSMALLCAP", "MID SMALLCAP"):
            return [
                BenchmarkComponent(eq_mid150.code, 0.5, eq_mid150.label),
                BenchmarkComponent(eq_small250.code, 0.5, eq_small250.label),
            ]
        if has_any("SMALL CAP", "SMALL-CAP", "SMALLCAP"):
            return [eq_small250]
        if has_any("MID CAP", "MID-CAP", "MIDCAP"):
            return [eq_mid150]
        if has_any("MULTI CAP", "MULTI-CAP", "MULTICAP"):
            return [
                BenchmarkComponent(eq_nifty100.code, 1 / 3, eq_nifty100.label),
                BenchmarkComponent(eq_mid150.code, 1 / 3, eq_mid150.label),
                BenchmarkComponent(eq_small250.code, 1 / 3, eq_small250.label),
            ]
        if has_any("FLEXI CAP", "FLEXI-CAP", "FLEXICAP", "ELSS", "TAX SAVER", "FOCUS", "FOCUSED", "VALUE", "CONTRA", "DIVIDEND YIELD"):
            return [eq_nifty500]
        if has_any("LARGE CAP", "LARGE-CAP", "LARGECAP", "BLUECHIP", "TOP 100"):
            return [eq_nifty100]
        if "INDEX FUND" in sub or has_any("ETF"):
            return []
        return [eq_nifty500]

    if has_any("LIQUID", "OVERNIGHT", "MONEY MARKET"):
        return [debt_liquid]
    return []


def _normalize_benchmark_components(
    components: List[BenchmarkComponent],
    prepared_histories: Dict[str, Tuple[Dict[str, float], List[str], List[date], float]],
) -> List[BenchmarkComponent]:
    active = [c for c in components if c.code in prepared_histories and prepared_histories[c.code][3] > 0]
    total_w = sum(c.weight for c in active)
    if total_w <= 0:
        return []
    return [BenchmarkComponent(code=c.code, weight=(c.weight / total_w), label=c.label) for c in active]


def _format_benchmark_name(components: List[BenchmarkComponent]) -> Optional[str]:
    if not components:
        return None
    if len(components) == 1:
        return components[0].label
    pieces = [f"{round(c.weight * 100)}% {c.label}" for c in components]
    return " + ".join(pieces)


def _nav_from_prepared_history(
    date_str: str,
    prepared_history: Tuple[Dict[str, float], List[str], List[date], float],
) -> Tuple[Optional[float], bool]:
    hist, keys, days, _ = prepared_history
    return _benchmark_nav_for_date(date_str, hist, keys, days)


def _units_at_cutoff(
    units_now: float,
    unit_events: List[Tuple[datetime, float]],
    cutoff_dt: datetime,
) -> float:
    units_after_cutoff = sum(delta for dt, delta in unit_events if dt > cutoff_dt)
    return max(0.0, units_now - units_after_cutoff)


def _current_holding_entry_date(
    units_now: float,
    lot_events: List[Tuple[datetime, float, float]],
    fallback_dt: Optional[datetime],
) -> Optional[datetime]:
    if units_now <= 0:
        return fallback_dt

    remaining_lots: List[List[Any]] = []
    for lot_dt, units_delta, _ in sorted(lot_events, key=lambda x: x[0]):
        if units_delta > 0:
            remaining_lots.append([lot_dt, units_delta])
            continue
        if units_delta >= 0:
            continue

        units_to_sell = abs(units_delta)
        while units_to_sell > 1e-9 and remaining_lots:
            lot = remaining_lots[0]
            consumed = min(lot[1], units_to_sell)
            lot[1] -= consumed
            units_to_sell -= consumed
            if lot[1] <= 1e-9:
                remaining_lots.pop(0)

    remaining_units = sum(float(lot[1]) for lot in remaining_lots)
    if remaining_units > 1e-9:
        unit_scale = units_now / remaining_units
        if abs(unit_scale - 1.0) > 0.02:
            for lot in remaining_lots:
                lot[1] *= unit_scale

    for lot_dt, lot_units in remaining_lots:
        if lot_units > 1e-9:
            return lot_dt
    return fallback_dt


def _rebuild_remaining_tax_lots(
    units_now: float,
    lot_events: List[Tuple[datetime, float, float]],
    statement_cost: Optional[float] = None,
    fallback_dt: Optional[datetime] = None,
) -> List[TaxLot]:
    if units_now <= 0:
        return []

    lots: List[TaxLot] = []
    for lot_dt, units_delta, amt_val in sorted(lot_events, key=lambda x: x[0]):
        if units_delta > 0:
            cpu = amt_val / units_delta if units_delta else 0.0
            if cpu > 0:
                lots.append(TaxLot(acquired_on=lot_dt, units=units_delta, cost_per_unit=cpu))
            continue

        if units_delta >= 0:
            continue

        units_to_sell = abs(units_delta)
        while units_to_sell > 1e-9 and lots:
            lot = lots[0]
            consumed = min(lot.units, units_to_sell)
            lot.units -= consumed
            units_to_sell -= consumed
            if lot.units <= 1e-9:
                lots.pop(0)

    remaining_units = sum(lot.units for lot in lots)
    if remaining_units <= 1e-9:
        if statement_cost and statement_cost > 0 and fallback_dt:
            return [TaxLot(acquired_on=fallback_dt, units=units_now, cost_per_unit=statement_cost / units_now)]
        return []

    unit_scale = units_now / remaining_units
    if abs(unit_scale - 1.0) > 0.02:
        for lot in lots:
            lot.units *= unit_scale

    if statement_cost and statement_cost > 0:
        lot_cost_total = sum(lot.units * lot.cost_per_unit for lot in lots)
        if lot_cost_total > 0:
            cost_scale = statement_cost / lot_cost_total
            for lot in lots:
                lot.cost_per_unit *= cost_scale

    return [lot for lot in lots if lot.units > 1e-9]


def _compute_period_xirr(
    cashflows: List[Tuple[datetime, float]],
    start_value: float,
    end_value: float,
    cutoff_dt: datetime,
    as_of_dt: datetime,
) -> Optional[float]:
    if start_value <= 0 or end_value <= 0 or cutoff_dt >= as_of_dt:
        return None
    period_flows = [(cutoff_dt, -start_value)]
    period_flows.extend((dt, amt) for dt, amt in cashflows if dt > cutoff_dt)
    period_flows.append((as_of_dt, end_value))
    return calculate_xirr([x[0] for x in period_flows], [x[1] for x in period_flows])


def _parse_percentage(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        if isinstance(value, str):
            cleaned = value.replace("%", "").replace(",", "").strip()
            if not cleaned:
                return None
            return float(cleaned)
        return float(value)
    except Exception:
        return None


def _extract_scheme_ter_pct(scheme: Dict[str, Any]) -> Optional[float]:
    keys = [
        "ter",
        "expense_ratio",
        "expenseRatio",
        "total_expense_ratio",
        "totalExpenseRatio",
    ]
    for key in keys:
        v = _parse_percentage(scheme.get(key))
        if v is not None and 0 < v < 10:
            return v
    valuation = scheme.get("valuation")
    if isinstance(valuation, dict):
        for key in keys:
            v = _parse_percentage(valuation.get(key))
            if v is not None and 0 < v < 10:
                return v
    return None


def _default_ter_pct(category: str, sub_category: str, scheme_name: str, is_direct: bool) -> float:
    cat = (category or "").upper()
    sub = (sub_category or "").upper()
    name = (scheme_name or "").upper()

    if any(x in name for x in ["INDEX", "ETF", "NIFTY", "SENSEX"]):
        return 0.25 if is_direct else 0.60
    if cat == "FIXED INCOME":
        if any(x in sub or x in name for x in ["LIQUID", "OVERNIGHT", "MONEY MARKET"]):
            return 0.20 if is_direct else 0.40
        if "CREDIT RISK" in sub or "CREDIT RISK" in name:
            return 0.80 if is_direct else 1.40
        if any(x in sub or x in name for x in ["GILT", "DYNAMIC", "MEDIUM"]):
            return 0.60 if is_direct else 1.10
        return 0.45 if is_direct else 0.90
    if "HYBRID" in sub or "HYBRID" in name or "BALANCED" in name:
        return 0.90 if is_direct else 1.50
    if cat == "EQUITY":
        if any(x in sub or x in name for x in ["SMALL", "MID"]):
            return 1.00 if is_direct else 1.80
        return 0.75 if is_direct else 1.40
    return 0.60 if is_direct else 1.10


def _years_between(start_dt: Optional[datetime], end_dt: datetime) -> float:
    if not start_dt or start_dt > end_dt:
        return 0.0
    return max(0.0, (end_dt - start_dt).days / 365.25)


def _credit_quality_bucket(scheme_name: str, sub_category: str) -> str:
    text = f"{scheme_name or ''} {sub_category or ''}".upper()
    if any(x in text for x in ["CREDIT RISK", "LOW RATED", "HIGH YIELD", "BELOW AA"]):
        return "Below AA"
    if any(
        x in text
        for x in [
            "LIQUID",
            "OVERNIGHT",
            "MONEY MARKET",
            "TREASURY",
            "T-BILL",
            "GILT",
            "SDL",
            "BANKING",
            "PSU",
            "CORPORATE BOND",
            "AAA",
        ]
    ):
        return "AAA"
    if any(x in text for x in ["DYNAMIC", "MEDIUM", "SHORT", "FLOATER", "DURATION", "BOND"]):
        return "AA"
    return "AA"


def _validate_upload(file: UploadFile, content: bytes) -> Optional[str]:
    filename = (file.filename or "").strip()
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        return "Unsupported file type. Please upload a PDF or JSON."
    if not content:
        return "Uploaded file is empty."
    if len(content) > MAX_UPLOAD_BYTES:
        return "File is too large. Maximum supported size is 25 MB."
    content_type = (file.content_type or "").lower()
    if content_type and content_type not in ALLOWED_CONTENT_TYPES[suffix]:
        return "Unsupported content type for uploaded file."
    stripped = content.lstrip()
    if suffix == ".pdf" and not stripped.startswith(PDF_MAGIC_PREFIX):
        return "Uploaded PDF appears invalid or corrupted."
    if suffix == ".json":
        stripped_json = stripped[3:] if stripped.startswith(b"\xef\xbb\xbf") else stripped
        if not (stripped_json.startswith(b"{") or stripped_json.startswith(b"[")):
            return "Uploaded JSON appears invalid."
    return None


class Holding(BaseModel):
    fund_family: str
    folio: str
    scheme_name: str
    amfi: Optional[str] = None
    units: float
    nav: float
    market_value: float
    cost_value: float
    category: str
    sub_category: str
    gain_loss: float = 0.0
    return_pct: float = 0.0
    xirr: Optional[float] = None
    benchmark_xirr: Optional[float] = None
    benchmark_name: Optional[str] = None
    missed_gains: Optional[float] = None
    date_of_entry: Optional[str] = None
    style_category: Optional[str] = None


class TopItem(BaseModel):
    name: str
    value: float
    allocation_pct: float


class ConcentrationData(BaseModel):
    fund_count: int
    recommended_funds: str = "7-10"
    fund_status: str
    amc_count: int
    recommended_amcs: str = "5-7"
    amc_status: str
    top_funds: List[TopItem]
    top_amcs: List[TopItem]


class CostData(BaseModel):
    direct_pct: float
    regular_pct: float
    portfolio_cost_pct: float
    annual_cost: float
    total_cost_paid: float
    savings_value: float


class MarketCapAllocation(BaseModel):
    large_cap: float
    mid_cap: float
    small_cap: float


class AssetAllocation(BaseModel):
    category: str
    value: float
    allocation_pct: float


class CreditQuality(BaseModel):
    aaa_pct: float
    aa_pct: float
    below_aa_pct: float


class FixedIncomeData(BaseModel):
    invested_value: float
    current_value: float
    irr: Optional[float] = None
    ytm: Optional[float] = None
    credit_quality: CreditQuality
    top_funds: List[TopItem]
    top_amcs: List[TopItem]
    category_allocation: List[AssetAllocation]


class TaxSummary(BaseModel):
    short_term_gains: float
    long_term_gains: float
    tax_free_gains: float
    taxable_gains: float
    estimated_tax_liability: float
    equity_stcg_rate_pct: float
    equity_ltcg_rate_pct: float
    equity_ltcg_exemption: float


class PerfMetric(BaseModel):
    comparable_pct: float = 0.0
    underperforming_pct: float
    upto_3_pct: float
    more_than_3_pct: float


class PerformanceSummary(BaseModel):
    one_year: PerfMetric
    three_year: PerfMetric


class GuidelineItem(BaseModel):
    label: str
    current: float
    recommended: float


class RecommendedPortfolio(BaseModel):
    asset_allocation: List[GuidelineItem]
    equity_mc: List[GuidelineItem]
    fi_metrics: List[GuidelineItem]


class EquityIndicative(BaseModel):
    category: str
    allocation: float


class FixedIncomeIndicative(BaseModel):
    issuer: str
    pqrs: Optional[float] = None
    ytm: float
    tenure: float
    allocation: float


class GuidelinesData(BaseModel):
    investment_guidelines: RecommendedPortfolio
    equity_indicative: List[EquityIndicative]
    fi_indicative: List[FixedIncomeIndicative]


class OverlapData(BaseModel):
    fund_codes: List[str]
    fund_names: List[str]
    matrix: List[List[float]]


class InvestorInfo(BaseModel):
    name: Optional[str] = None
    pan: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None


class AnalysisWarning(BaseModel):
    code: str
    section: str
    severity: Literal["info", "warn", "error"]
    message: str
    affected_schemes: List[str] = Field(default_factory=list)


class DataCoverage(BaseModel):
    benchmark_date_match_pct: float
    overlap_source: Literal["real", "none"]
    overlap_available_funds: int


class AnalysisSummary(BaseModel):
    total_market_value: float
    total_cost_value: float
    total_gain_loss: float
    portfolio_return: float
    portfolio_xirr: Optional[float]
    benchmark_xirr: Optional[float]
    equity_xirr: Optional[float] = None
    equity_benchmark_xirr: Optional[float] = None
    benchmark_gains: float
    equity_benchmark_gains: float = 0.0


    holdings_count: int
    statement_date: Optional[str]
    asset_allocation: List[AssetAllocation] = Field(default_factory=list)
    concentration: ConcentrationData
    cost: CostData
    market_cap: MarketCapAllocation
    equity_value: float
    equity_pct: float
    fixed_income: Optional[FixedIncomeData] = None
    performance_summary: Optional[PerformanceSummary] = None
    guidelines: Optional[GuidelinesData] = None
    overlap: Optional[OverlapData] = None
    investor_info: Optional[InvestorInfo] = None
    valuation_mode: Literal["live_nav"] = "live_nav"
    statement_market_value: float
    live_nav_delta_value: float
    equity_cost_value: float
    equity_gain_loss: float
    fixed_income_cost_value: float
    fixed_income_gain_loss: float
    tax: TaxSummary
    warnings: List[AnalysisWarning] = Field(default_factory=list)
    data_coverage: DataCoverage


class AnalysisResponse(BaseModel):
    success: bool
    holdings: List[Holding] = Field(default_factory=list)
    summary: Optional[AnalysisSummary] = None
    error: Optional[str] = None


class AuthSessionResponse(BaseModel):
    user_id: str
    session_id: Optional[str] = None
    is_admin: bool


class AdminAnalyticsMetrics(BaseModel):
    registered_users: Optional[int] = None
    tracked_users: int
    active_users_7d: int
    total_analyses: int
    successful_analyses: int
    failed_analyses: int
    success_rate: float
    average_duration_ms: float
    fastest_duration_ms: Optional[int] = None
    slowest_duration_ms: Optional[int] = None
    last_analysis_at: Optional[str] = None


class AdminAnalysisRun(BaseModel):
    request_id: str
    user_id: str
    session_id: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    status: str
    duration_ms: Optional[int] = None
    holdings_count: Optional[int] = None
    total_market_value: Optional[float] = None
    error_message: Optional[str] = None
    created_at: str


class AdminLogEntry(BaseModel):
    user_id: Optional[str] = None
    route: str
    action: str
    status: str
    message: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str


class AdminOverviewResponse(BaseModel):
    metrics: AdminAnalyticsMetrics
    recent_analyses: List[AdminAnalysisRun] = Field(default_factory=list)
    recent_logs: List[AdminLogEntry] = Field(default_factory=list)

async def map_casparser_to_analysis(cas_data: dict) -> AnalysisResponse:
    if not isinstance(cas_data, dict):
        return AnalysisResponse(success=False, error="Invalid CAS JSON format. Root object must be a JSON object.")

    warnings: List[AnalysisWarning] = []
    warning_codes = set()

    def add_warning(
        code: str,
        section: str,
        severity: Literal["info", "warn", "error"],
        message: str,
        affected_schemes: Optional[List[str]] = None,
    ) -> None:
        if code in warning_codes:
            return
        warning_codes.add(code)
        cleaned_schemes: List[str] = []
        seen_scheme_names = set()
        for scheme in affected_schemes or []:
            scheme_name = (scheme or "").strip()
            if not scheme_name or scheme_name in seen_scheme_names:
                continue
            seen_scheme_names.add(scheme_name)
            cleaned_schemes.append(scheme_name)
        warnings.append(
            AnalysisWarning(
                code=code,
                section=section,
                severity=severity,
                message=message,
                affected_schemes=cleaned_schemes,
            )
        )

    holdings: List[Holding] = []
    folios = cas_data.get("folios", [])
    if not isinstance(folios, list):
        return AnalysisResponse(success=False, error="Invalid CAS JSON format. 'folios' must be a list.")
    analysis_now_dt = datetime.now()
    one_year_cutoff_dt = analysis_now_dt - timedelta(days=365)
    three_year_cutoff_dt = analysis_now_dt - timedelta(days=365 * 3)

    total_cost = 0.0
    total_mkt_live = 0.0
    total_mkt_statement = 0.0
    amcs = set()
    schemes_seen = set()
    amc_values: Dict[str, float] = {}
    direct_value = 0.0
    regular_value = 0.0
    mc_values = {"Large-Cap": 0.0, "Mid-Cap": 0.0, "Small-Cap": 0.0}
    allocation_map: Dict[str, float] = {}
    portfolio_cashflows: List[Tuple[datetime, float]] = []
    equity_cashflows: List[Tuple[datetime, float]] = []
    fi_cashflows: List[Tuple[datetime, float]] = []
    benchmark_cashflows: List[Tuple[datetime, float]] = []
    equity_benchmark_cashflows: List[Tuple[datetime, float]] = []
    benchmark_terminal_value = 0.0
    equity_benchmark_terminal_value = 0.0
    benchmark_cost_total = 0.0
    equity_benchmark_cost_total = 0.0

    benchmark_txn_total = 0
    benchmark_txn_exact = 0
    fi_mkt = 0.0
    fi_cost = 0.0
    fi_amc_values: Dict[str, float] = {}
    fi_holdings_objs: List[Holding] = []
    fi_alloc_map: Dict[str, float] = {}
    credit_values = {"AAA": 0.0, "AA": 0.0, "Below AA": 0.0}
    perf_diffs_weighted_1y: List[Tuple[float, float]] = []
    perf_diffs_weighted_3y: List[Tuple[float, float]] = []
    comparable_perf_count_1y = 0
    comparable_perf_count_3y = 0
    ambiguous_category_count = 0
    annual_cost_est = 0.0
    total_cost_paid_est = 0.0
    savings_value_est = 0.0
    inferred_ter_scheme_count = 0
    tax_short_term_gains = 0.0
    tax_short_term_losses = 0.0
    tax_long_term_gains = 0.0
    tax_long_term_losses = 0.0

    all_amfis = set()
    benchmark_codes_needed = set()
    for folio_data in folios:
        if not isinstance(folio_data, dict):
            continue
        schemes = folio_data.get("schemes", [])
        if not isinstance(schemes, list):
            continue
        for scheme in schemes:
            if not isinstance(scheme, dict):
                continue
            amfi = str(scheme.get("amfi") or "").strip()
            if amfi:
                all_amfis.add(amfi)
            name = str(scheme.get("scheme") or "Unknown Scheme")
            scheme_type = str(scheme.get("type") or "OTHERS").strip()
            sub_cat = get_sub_category(name, scheme_type)
            cat, _ = _infer_category(name, scheme_type, sub_cat)
            comps = _resolve_benchmark_components(name, scheme_type, sub_cat, cat)
            for comp in comps:
                benchmark_codes_needed.add(comp.code)

    nav_map: Dict[str, float] = {}
    benchmark_histories_prepared: Dict[str, Tuple[Dict[str, float], List[str], List[date], float]] = {}
    scheme_histories_prepared: Dict[str, Tuple[Dict[str, float], List[str], List[date], float]] = {}

    try:
        amfi_codes = sorted(all_amfis)
        benchmark_codes = sorted(benchmark_codes_needed)

        live_nav_results, benchmark_history_results, scheme_history_results = await asyncio.gather(
            asyncio.gather(*[fetch_live_nav(code) for code in amfi_codes], return_exceptions=True),
            asyncio.gather(*[fetch_nav_history(code) for code in benchmark_codes], return_exceptions=True),
            asyncio.gather(*[fetch_nav_history(code) for code in amfi_codes], return_exceptions=True),
        )

        for code, result in zip(amfi_codes, live_nav_results):
            if isinstance(result, Exception):
                nav_map[code] = 0.0
            else:
                nav_map[code] = float(result or 0.0)

        for code, result in zip(benchmark_codes, benchmark_history_results):
            if isinstance(result, Exception) or not isinstance(result, dict) or not result:
                continue
            prepared = _prepare_benchmark_history(result)
            if prepared[3] > 0:
                benchmark_histories_prepared[code] = prepared

        for code, result in zip(amfi_codes, scheme_history_results):
            if isinstance(result, Exception) or not isinstance(result, dict) or not result:
                continue
            prepared = _prepare_benchmark_history(result)
            if prepared[3] > 0:
                scheme_histories_prepared[code] = prepared

        log_debug(
            "Benchmark/NAV prefetch OK: "
            f"live_nav={len([v for v in nav_map.values() if v > 0])}/{len(nav_map)}, "
            f"benchmark_histories={len(benchmark_histories_prepared)}, "
            f"scheme_histories={len(scheme_histories_prepared)}"
        )
        await save_cache_async()
    except Exception as e:
        add_warning("LIVE_NAV_FETCH_FAILED", "valuation", "warn", "Live NAV fetch failed or timed out; benchmark metrics may be missing.")
        log_debug(f"Pre-fetch error or timeout: {type(e).__name__}: {e}")

    nav_missing_schemes = set()
    benchmark_fallback_by_scheme: Dict[str, int] = {}

    for folio_data in folios:
        if not isinstance(folio_data, dict):
            continue

        folio_num = str(folio_data.get("folio") or "N/A")
        amc_name = str(folio_data.get("amc") or "Unknown AMC")
        amcs.add(amc_name)

        schemes = folio_data.get("schemes", [])
        if not isinstance(schemes, list):
            continue

        for scheme in schemes:
            if not isinstance(scheme, dict):
                continue

            units = _parse_amount(scheme.get("close")) or 0.0
            if units <= 0.01:
                continue

            name = str(scheme.get("scheme") or "Unknown Scheme")
            amfi = str(scheme.get("amfi") or "").strip()
            scheme_type = str(scheme.get("type") or "OTHERS").strip()
            sub_cat = get_sub_category(name, scheme_type)
            cat, ambiguous = _infer_category(name, scheme_type, sub_cat)
            benchmark_components_raw = _resolve_benchmark_components(name, scheme_type, sub_cat, cat)
            benchmark_components = _normalize_benchmark_components(benchmark_components_raw, benchmark_histories_prepared)
            benchmark_name = _format_benchmark_name(benchmark_components)
            if ambiguous:
                ambiguous_category_count += 1
            schemes_seen.add(name)


            scheme_cost = 0.0
            purchase_cost_total = 0.0
            scheme_cashflows: List[Tuple[datetime, float]] = []
            scheme_tx_dates: List[datetime] = []
            scheme_unit_events: List[Tuple[datetime, float]] = []
            lot_events: List[Tuple[datetime, float, float]] = []
            scheme_benchmark_units: Dict[str, float] = {comp.code: 0.0 for comp in benchmark_components}
            scheme_benchmark_unit_events: Dict[str, List[Tuple[datetime, float]]] = {comp.code: [] for comp in benchmark_components}

            transactions = scheme.get("transactions", [])
            if not isinstance(transactions, list):
                transactions = []

            for txn in transactions:
                if not isinstance(txn, dict):
                    continue
                desc = (txn.get("description") or "").upper()
                txn_type = (txn.get("type") or "").upper()
                date_str = txn.get("date")
                if date_str is None:
                    continue
                dt = _parse_iso_date(date_str)
                if not dt:
                    continue
                raw_units = _parse_amount(txn.get("units")) or 0.0
                if abs(raw_units) > 0:
                    scheme_unit_events.append((dt, raw_units))
                    scheme_tx_dates.append(dt)

                raw_amt = _parse_amount(txn.get("amount"))
                if raw_amt is None or raw_amt == 0:
                    continue

                # Use absolute amount as base; signs are dictated by transaction units/type.
                amt = abs(raw_amt)

                # Build lot events for tax attribution; bonus/split lots are excluded due zero/uncertain cost basis.
                if abs(raw_units) > 0 and not any(ik in desc or ik in txn_type for ik in ["BONUS", "SPLIT"]):
                    lot_events.append((dt, raw_units, amt))

                # XIRR convention: Outflow (investment) is negative, Inflow (withdrawal/redemption) is positive.
                if raw_units > 0:
                    # Positive units = Buy/Investment
                    is_withdrawal = False
                elif raw_units < 0:
                    # Negative units = Sell/Redemption
                    is_withdrawal = True
                else:
                    # Units == 0 (typically a payout or internal correction)
                    # For payouts, amount is positive money back to user.
                    withdrawal_keywords = [
                        "PAYOUT", "DIVIDEND PAYOUT", "INTEREST PAYOUT",
                        "IDCW PAYOUT", "DIVIDEND PAID", "INTEREST PAID"
                    ]
                    # We check keywords for 0-unit transactions
                    is_withdrawal = any(kw in desc for kw in withdrawal_keywords) or any(kw in txn_type for kw in withdrawal_keywords)
                    if not is_withdrawal:
                        # Fallback for broad terms: only if they are clearly payouts and amount > 0
                        if ("IDCW" in desc or "DIVIDEND" in desc) and ("PAYOUT" in desc or "PAID" in desc):
                            is_withdrawal = True
                
                # Exclude internal reinvestments and bonus units from cashflow for XIRR calculation.
                ignore_keywords = ["REINVEST", "RE-INVEST", "BONUS", "SPLIT"]
                is_ignored = any(ik in desc for ik in ignore_keywords) or any(ik in txn_type for ik in ignore_keywords)

                if is_ignored:
                    log_debug("TXN_IGNORE: skipped non-cashflow transaction")
                    continue

                cashflow = amt if is_withdrawal else -amt
                log_debug("TXN_DEBUG: recorded scheme cashflow")

                scheme_cashflows.append((dt, cashflow))
                if dt not in scheme_tx_dates:
                    scheme_tx_dates.append(dt)
                if not is_withdrawal:
                    purchase_cost_total += amt

                portfolio_cashflows.append((dt, cashflow))

                if benchmark_components:
                    benchmark_cashflows.append((dt, cashflow))
                    if cat == "Equity":
                        equity_benchmark_cashflows.append((dt, cashflow))
                    for comp in benchmark_components:
                        history_bundle = benchmark_histories_prepared.get(comp.code)
                        if not history_bundle:
                            continue
                        benchmark_txn_total += 1
                        b_nav, is_exact = _nav_from_prepared_history(date_str, history_bundle)
                        if not b_nav:
                            continue
                        txn_bm_units = ((-cashflow) * comp.weight) / b_nav
                        scheme_benchmark_units[comp.code] = max(0.0, scheme_benchmark_units.get(comp.code, 0.0) + txn_bm_units)
                        scheme_benchmark_unit_events.setdefault(comp.code, []).append((dt, txn_bm_units))
                        if is_exact:
                            benchmark_txn_exact += 1
                        else:
                            benchmark_fallback_by_scheme[name] = benchmark_fallback_by_scheme.get(name, 0) + 1

            val = scheme.get("valuation", {})
            if not isinstance(val, dict):
                val = {}

            scheme_entry_dt = min(scheme_tx_dates) if scheme_tx_dates else None
            parsed_cost = _parse_amount(val.get("cost")) if "cost" in val else None
            remaining_lots = _rebuild_remaining_tax_lots(
                units,
                lot_events,
                statement_cost=parsed_cost,
                fallback_dt=scheme_entry_dt or analysis_now_dt,
            )

            if parsed_cost is not None:
                scheme_cost = parsed_cost
            elif remaining_lots:
                scheme_cost = sum(lot.units * lot.cost_per_unit for lot in remaining_lots)
            else:
                scheme_cost = purchase_cost_total

            statement_nav = _parse_amount(val.get("nav")) or 0.0
            statement_value_raw = val.get("value")
            statement_value = _parse_amount(statement_value_raw)
            if statement_value is None:
                statement_mkt_val = round(units * statement_nav, 2)
            else:
                statement_mkt_val = round(statement_value, 2)

            live_nav = nav_map.get(amfi, 0.0) if amfi else 0.0
            effective_nav = live_nav if live_nav > 0 else statement_nav
            if amfi and live_nav <= 0:
                nav_missing_schemes.add(name)
            mkt_val = round(units * effective_nav, 2)

            # cat, sub_cat and ambiguous_category_count were handled earlier in the loop


            if sub_cat in mc_values:
                mc_values[sub_cat] += mkt_val
            elif "ELSS" in sub_cat or "Index" in sub_cat or "Flexi" in sub_cat:
                mc_values["Large-Cap"] += mkt_val
            elif "Large & Mid" in sub_cat:
                mc_values["Large-Cap"] += mkt_val * 0.5
                mc_values["Mid-Cap"] += mkt_val * 0.5
            elif cat == "Equity":
                mc_values["Large-Cap"] += mkt_val

            is_direct = "DIRECT" in name.upper()
            if is_direct:
                direct_value += mkt_val
            else:
                regular_value += mkt_val

            amc_values[amc_name] = amc_values.get(amc_name, 0.0) + mkt_val
            allocation_map[sub_cat] = allocation_map.get(sub_cat, 0.0) + mkt_val

            current_holding_entry_dt = _current_holding_entry_date(units, lot_events, scheme_entry_dt)
            gain = mkt_val - scheme_cost
            ret_pct = round((gain / scheme_cost * 100), 2) if scheme_cost > 0 else 0.0
            date_of_entry = current_holding_entry_dt.strftime("%Y-%m-%d") if current_holding_entry_dt else None

            if cat == "Equity":
                equity_cashflows.extend(scheme_cashflows)

            if cat == "Fixed Income":
                fi_mkt += mkt_val
                fi_cost += scheme_cost
                fi_amc_values[amc_name] = fi_amc_values.get(amc_name, 0.0) + mkt_val
                fi_alloc_map[sub_cat] = fi_alloc_map.get(sub_cat, 0.0) + mkt_val
                fi_cashflows.extend(scheme_cashflows)
                credit_bucket = _credit_quality_bucket(name, sub_cat)
                credit_values[credit_bucket] += mkt_val

            holding_years = _years_between(current_holding_entry_dt or scheme_entry_dt, analysis_now_dt)
            scheme_ter = _extract_scheme_ter_pct(scheme)
            if scheme_ter is None:
                scheme_ter = _default_ter_pct(cat, sub_cat, name, is_direct)
                inferred_ter_scheme_count += 1
            avg_value_for_cost = max(0.0, (max(scheme_cost, 0.0) + max(mkt_val, 0.0)) / 2.0)
            annual_cost_est += avg_value_for_cost * (scheme_ter / 100.0)
            total_cost_paid_est += avg_value_for_cost * (scheme_ter / 100.0) * holding_years
            if not is_direct:
                direct_ter_proxy = _default_ter_pct(cat, sub_cat, name, True)
                ter_gap = max(0.0, scheme_ter - direct_ter_proxy)
                savings_value_est += avg_value_for_cost * (ter_gap / 100.0) * holding_years

            if cat == "Equity" and units > 0 and effective_nav > 0:
                lots = list(remaining_lots)
                for lot in lots:
                    if lot.units <= 0:
                        continue
                    lot_cost = lot.units * lot.cost_per_unit
                    lot_mkt = lot.units * effective_nav
                    lot_gain = lot_mkt - lot_cost
                    is_long_term_lot = (analysis_now_dt.date() - lot.acquired_on.date()).days >= 365
                    if is_long_term_lot:
                        if lot_gain >= 0:
                            tax_long_term_gains += lot_gain
                        else:
                            tax_long_term_losses += abs(lot_gain)
                    else:
                        if lot_gain >= 0:
                            tax_short_term_gains += lot_gain
                        else:
                            tax_short_term_losses += abs(lot_gain)

            s_xirr = None
            s_bm_xirr = None
            s_bm_val = 0.0
            s_missed_gains = None
            for comp in benchmark_components:
                history_bundle = benchmark_histories_prepared.get(comp.code)
                if not history_bundle:
                    continue
                s_bm_val += scheme_benchmark_units.get(comp.code, 0.0) * history_bundle[3]

            fund_history_bundle = scheme_histories_prepared.get(amfi) if amfi else None
            position_cutoff_dt = current_holding_entry_dt or scheme_entry_dt

            if scheme_cashflows:
                s_flows = scheme_cashflows + [(analysis_now_dt, mkt_val)]
                s_xirr = calculate_xirr([x[0] for x in s_flows], [x[1] for x in s_flows])
                if s_bm_val > 0:
                    s_flows_bm = [(dt, amt_val) for dt, amt_val in scheme_cashflows] + [(analysis_now_dt, s_bm_val)]
                    s_bm_xirr = calculate_xirr([x[0] for x in s_flows_bm], [x[1] for x in s_flows_bm])
                    s_missed_gains = s_bm_val - mkt_val

                if position_cutoff_dt and position_cutoff_dt < analysis_now_dt:
                    cutoff_str = position_cutoff_dt.strftime("%Y-%m-%d")

                    # Prefer a current-position IRR so the table aligns with the holding's displayed entry date.
                    if mkt_val > 0 and fund_history_bundle:
                        fund_units_start = _units_at_cutoff(units, scheme_unit_events, position_cutoff_dt)
                        fund_nav_start, _ = _nav_from_prepared_history(cutoff_str, fund_history_bundle)
                        if fund_nav_start:
                            fund_start_val = fund_units_start * fund_nav_start
                            period_s_xirr = _compute_period_xirr(
                                scheme_cashflows,
                                fund_start_val,
                                mkt_val,
                                position_cutoff_dt,
                                analysis_now_dt,
                            )
                            if period_s_xirr is not None:
                                s_xirr = period_s_xirr

                    if s_bm_val > 0:
                        bm_start_val = 0.0
                        for comp in benchmark_components:
                            history_bundle = benchmark_histories_prepared.get(comp.code)
                            if not history_bundle:
                                continue
                            comp_units_start = _units_at_cutoff(
                                scheme_benchmark_units.get(comp.code, 0.0),
                                scheme_benchmark_unit_events.get(comp.code, []),
                                position_cutoff_dt,
                            )
                            comp_nav_start, _ = _nav_from_prepared_history(cutoff_str, history_bundle)
                            if comp_nav_start:
                                bm_start_val += comp_units_start * comp_nav_start

                        if bm_start_val > 0:
                            period_s_bm_xirr = _compute_period_xirr(
                                scheme_cashflows,
                                bm_start_val,
                                s_bm_val,
                                position_cutoff_dt,
                                analysis_now_dt,
                            )
                            if period_s_bm_xirr is not None:
                                s_bm_xirr = period_s_bm_xirr

                if s_bm_val > 0 and s_bm_xirr is None:
                    log_debug("BM_XIRR_FAIL: benchmark XIRR unavailable for a holding")

            if s_bm_val > 0:
                benchmark_terminal_value += s_bm_val
                benchmark_cost_total += scheme_cost
                if cat == "Equity":
                    equity_benchmark_terminal_value += s_bm_val
                    equity_benchmark_cost_total += scheme_cost

            if scheme_cashflows and s_bm_val > 0 and mkt_val > 0 and fund_history_bundle:
                def period_diff_for_cutoff(cutoff_dt: datetime) -> Optional[float]:
                    cutoff_str = cutoff_dt.strftime("%Y-%m-%d")
                    fund_units_start = _units_at_cutoff(units, scheme_unit_events, cutoff_dt)
                    fund_nav_start, _ = _nav_from_prepared_history(cutoff_str, fund_history_bundle)
                    if not fund_nav_start:
                        return None
                    fund_start_val = fund_units_start * fund_nav_start

                    bm_start_val = 0.0
                    for comp in benchmark_components:
                        history_bundle = benchmark_histories_prepared.get(comp.code)
                        if not history_bundle:
                            continue
                        comp_units_start = _units_at_cutoff(
                            scheme_benchmark_units.get(comp.code, 0.0),
                            scheme_benchmark_unit_events.get(comp.code, []),
                            cutoff_dt,
                        )
                        comp_nav_start, _ = _nav_from_prepared_history(cutoff_str, history_bundle)
                        if comp_nav_start:
                            bm_start_val += comp_units_start * comp_nav_start

                    fund_period_xirr = _compute_period_xirr(scheme_cashflows, fund_start_val, mkt_val, cutoff_dt, analysis_now_dt)
                    bm_period_xirr = _compute_period_xirr(scheme_cashflows, bm_start_val, s_bm_val, cutoff_dt, analysis_now_dt)
                    if fund_period_xirr is None or bm_period_xirr is None:
                        return None
                    return fund_period_xirr - bm_period_xirr

                diff_1y = period_diff_for_cutoff(one_year_cutoff_dt)
                if diff_1y is not None:
                    comparable_perf_count_1y += 1
                    perf_diffs_weighted_1y.append((mkt_val, diff_1y))

                diff_3y = period_diff_for_cutoff(three_year_cutoff_dt)
                if diff_3y is not None:
                    comparable_perf_count_3y += 1
                    perf_diffs_weighted_3y.append((mkt_val, diff_3y))

            h_obj = Holding(
                fund_family=amc_name,
                folio=folio_num,
                scheme_name=name,
                amfi=amfi,
                units=units,
                nav=effective_nav,
                market_value=mkt_val,
                cost_value=scheme_cost,
                category=cat,
                sub_category=sub_cat,
                gain_loss=round(gain, 2),
                return_pct=ret_pct,
                xirr=round(s_xirr, 2) if s_xirr is not None else None,
                benchmark_xirr=round(s_bm_xirr, 2) if s_bm_xirr is not None else None,
                benchmark_name=benchmark_name,
                missed_gains=round(s_missed_gains, 2) if s_missed_gains is not None else None,
                date_of_entry=date_of_entry,
                style_category="Direct" if is_direct else "Regular",
            )
            holdings.append(h_obj)
            if cat == "Fixed Income":
                fi_holdings_objs.append(h_obj)

            total_cost += scheme_cost
            total_mkt_live += mkt_val
            total_mkt_statement += statement_mkt_val

    if nav_missing_schemes:
        add_warning(
            "LIVE_NAV_PARTIAL_FALLBACK",
            "valuation",
            "warn",
            f"Live NAV unavailable for {len(nav_missing_schemes)} scheme(s); statement NAV used for those schemes.",
            affected_schemes=sorted(nav_missing_schemes),
        )
    if ambiguous_category_count > 0:
        add_warning("CATEGORY_AMBIGUOUS", "classification", "warn", f"{ambiguous_category_count} scheme(s) had ambiguous classification and were mapped conservatively.")

    now_dt = analysis_now_dt
    pf_xirr = calculate_xirr(
        [x[0] for x in (portfolio_cashflows + [(now_dt, total_mkt_live)])],
        [x[1] for x in (portfolio_cashflows + [(now_dt, total_mkt_live)])],
    )
    benchmark_val_now = benchmark_terminal_value
    log_debug("Summary BM XIRR inputs prepared")
    bm_xirr = None
    if benchmark_cashflows and benchmark_val_now > 0:
        bm_xirr = calculate_xirr(
            [x[0] for x in (benchmark_cashflows + [(now_dt, benchmark_val_now)])],
            [x[1] for x in (benchmark_cashflows + [(now_dt, benchmark_val_now)])],
        )
    log_debug("XIRR_RESULT_DEBUG: summary XIRR calculated")

    total_equity_val = sum(h.market_value for h in holdings if h.category == "Equity")
    total_equity_cost = sum(h.cost_value for h in holdings if h.category == "Equity")

    eq_xirr = calculate_xirr(
        [x[0] for x in (equity_cashflows + [(now_dt, total_equity_val)])],
        [x[1] for x in (equity_cashflows + [(now_dt, total_equity_val)])],
    )
    eq_benchmark_val_now = equity_benchmark_terminal_value
    eq_bm_xirr = None
    if equity_benchmark_cashflows and eq_benchmark_val_now > 0:
        eq_bm_xirr = calculate_xirr(
            [x[0] for x in (equity_benchmark_cashflows + [(now_dt, eq_benchmark_val_now)])],
            [x[1] for x in (equity_benchmark_cashflows + [(now_dt, eq_benchmark_val_now)])],
        )
    log_debug("EQ_XIRR_DEBUG: equity XIRR calculated")
    total_equity_bm_gain = eq_benchmark_val_now - equity_benchmark_cost_total if eq_benchmark_val_now > 0 else 0.0



    if bm_xirr is None:

        add_warning("BENCHMARK_XIRR_UNAVAILABLE", "benchmark", "warn", "Benchmark XIRR could not be computed reliably for this dataset.")
    if benchmark_cashflows and len(benchmark_cashflows) < len(portfolio_cashflows):
        add_warning(
            "BENCHMARK_PARTIAL_COVERAGE",
            "benchmark",
            "info",
            "Benchmark calculation excludes some scheme cashflows where benchmark proxies were unavailable.",
        )

    benchmark_date_match_pct = round((benchmark_txn_exact / benchmark_txn_total) * 100, 2) if benchmark_txn_total > 0 else 100.0
    if benchmark_date_match_pct < 99.5:
        benchmark_fallback_schemes = sorted(
            benchmark_fallback_by_scheme.keys(),
            key=lambda scheme_name: (-benchmark_fallback_by_scheme[scheme_name], scheme_name.lower()),
        )
        add_warning(
            "BENCHMARK_DATE_COVERAGE_LOW",
            "benchmark",
            "warn",
            f"Benchmark date coverage below threshold; nearest previous NAV fallback used for {benchmark_txn_total - benchmark_txn_exact} transaction date(s).",
            affected_schemes=benchmark_fallback_schemes,
        )

    alloc_list = [
        AssetAllocation(category=k, value=round(v, 2), allocation_pct=round((v / total_mkt_live) * 100, 1))
        for k, v in allocation_map.items()
        if total_mkt_live > 0
    ]
    alloc_list.sort(key=lambda x: x.value, reverse=True)

    top_5_schemes = sorted(holdings, key=lambda x: x.market_value, reverse=True)[:5]
    top_funds = [
        TopItem(name=s.scheme_name, value=round(s.market_value, 2), allocation_pct=round(s.market_value / total_mkt_live * 100, 1))
        for s in top_5_schemes
    ] if total_mkt_live > 0 else []
    sorted_amcs = sorted(amc_values.items(), key=lambda x: x[1], reverse=True)[:5]
    top_amcs = [
        TopItem(name=k, value=round(v, 2), allocation_pct=round(v / total_mkt_live * 100, 1))
        for k, v in sorted_amcs
    ] if total_mkt_live > 0 else []

    total_equity_gain = sum(h.gain_loss for h in holdings if h.category == "Equity")
    total_fi_cost = sum(h.cost_value for h in holdings if h.category == "Fixed Income")
    total_fi_gain = sum(h.gain_loss for h in holdings if h.category == "Fixed Income")


    mc_total = sum(mc_values.values())
    if mc_total > 0:
        mc_alloc = MarketCapAllocation(
            large_cap=round(mc_values["Large-Cap"] / mc_total * 100, 1),
            mid_cap=round(mc_values["Mid-Cap"] / mc_total * 100, 1),
            small_cap=round(mc_values["Small-Cap"] / mc_total * 100, 1),
        )
    else:
        mc_alloc = MarketCapAllocation(large_cap=0.0, mid_cap=0.0, small_cap=0.0)

    fi_top_funds = sorted(fi_holdings_objs, key=lambda x: x.market_value, reverse=True)[:5]
    fi_top_amcs_sorted = sorted(fi_amc_values.items(), key=lambda x: x[1], reverse=True)[:5]
    fi_alloc_list = [
        AssetAllocation(category=k, value=round(v, 2), allocation_pct=round((v / fi_mkt) * 100, 1))
        for k, v in fi_alloc_map.items()
        if fi_mkt > 0
    ]

    fi_irr = None
    if fi_mkt > 0 and fi_cashflows:
        fi_irr = calculate_xirr(
            [x[0] for x in (fi_cashflows + [(now_dt, fi_mkt)])],
            [x[1] for x in (fi_cashflows + [(now_dt, fi_mkt)])],
        )

    fi_data = None
    if fi_mkt > 0:
        add_warning("FI_YTM_ESTIMATED", "fixed_income", "info", "Fixed-income YTM is unavailable from source data and is shown as N/A.")
        fi_data = FixedIncomeData(
            invested_value=round(fi_cost, 2),
            current_value=round(fi_mkt, 2),
            irr=round(fi_irr, 2) if fi_irr is not None else None,
            ytm=None,
            credit_quality=CreditQuality(
                aaa_pct=round(credit_values["AAA"] / fi_mkt * 100, 1),
                aa_pct=round(credit_values["AA"] / fi_mkt * 100, 1),
                below_aa_pct=round(credit_values["Below AA"] / fi_mkt * 100, 1),
            ),
            top_funds=[TopItem(name=s.scheme_name, value=round(s.market_value, 2), allocation_pct=round(s.market_value / fi_mkt * 100, 1)) for s in fi_top_funds],
            top_amcs=[TopItem(name=k, value=round(v, 2), allocation_pct=round(v / fi_mkt * 100, 1)) for k, v in fi_top_amcs_sorted],
            category_allocation=fi_alloc_list,
        )

    def calc_perf_metric(weighted_diffs: List[Tuple[float, float]], denominator_weight: float) -> PerfMetric:
        if denominator_weight <= 0:
            return PerfMetric(comparable_pct=0, underperforming_pct=0, upto_3_pct=0, more_than_3_pct=0)
        comparable_w = sum(w for w, _ in weighted_diffs)
        under_w = sum(w for w, d in weighted_diffs if d < 0)
        upto_3_w = sum(w for w, d in weighted_diffs if -3 <= d < 0)
        more_3_w = sum(w for w, d in weighted_diffs if d < -3)
        return PerfMetric(
            comparable_pct=round((comparable_w / denominator_weight) * 100, 1),
            underperforming_pct=round((under_w / denominator_weight) * 100, 1),
            upto_3_pct=round((upto_3_w / denominator_weight) * 100, 1),
            more_than_3_pct=round((more_3_w / denominator_weight) * 100, 1),
        )

    comparable_1y_weight = sum(w for w, _ in perf_diffs_weighted_1y)
    comparable_3y_weight = sum(w for w, _ in perf_diffs_weighted_3y)
    perf_summary = PerformanceSummary(
        one_year=calc_perf_metric(perf_diffs_weighted_1y, total_mkt_live),
        three_year=calc_perf_metric(perf_diffs_weighted_3y, total_mkt_live),
    )

    if total_mkt_live > 0 and (comparable_1y_weight < total_mkt_live or comparable_3y_weight < total_mkt_live):
        cov_1y = round((comparable_1y_weight / total_mkt_live) * 100, 1)
        cov_3y = round((comparable_3y_weight / total_mkt_live) * 100, 1)
        add_warning(
            "PERFORMANCE_PARTIAL_COVERAGE",
            "performance",
            "info",
            f"Performance attribution coverage: 1Y={cov_1y}% and 3Y={cov_3y}% of portfolio value had comparable fund/benchmark data.",
        )

    equity_pct_actual = round((total_equity_val / total_mkt_live) * 100, 1) if total_mkt_live > 0 else 0.0
    fi_pct_actual = round((fi_mkt / total_mkt_live) * 100, 1) if total_mkt_live > 0 else 0.0
    others_pct_actual = round(max(0, 100 - equity_pct_actual - fi_pct_actual), 1) if total_mkt_live > 0 else 0.0

    tax_stcg_rate = 20.0
    tax_ltcg_rate = 12.5
    tax_ltcg_exemption = 125000.0
    net_short_term = tax_short_term_gains - tax_short_term_losses
    net_long_term = tax_long_term_gains - tax_long_term_losses

    taxable_stcg = max(0.0, net_short_term)
    taxable_ltcg_before_exemption = max(0.0, net_long_term)

    # STCL can be set off against LTCG after exhausting STCG.
    st_loss_remaining = max(0.0, -net_short_term)
    if st_loss_remaining > 0 and taxable_ltcg_before_exemption > 0:
        lt_offset = min(st_loss_remaining, taxable_ltcg_before_exemption)
        taxable_ltcg_before_exemption -= lt_offset

    tax_free_gains = min(tax_ltcg_exemption, taxable_ltcg_before_exemption)
    taxable_ltcg = max(0.0, taxable_ltcg_before_exemption - tax_ltcg_exemption)
    tax_taxable_gains = max(0.0, taxable_stcg + taxable_ltcg)
    tax_estimated_liability = (taxable_stcg * tax_stcg_rate / 100.0) + (taxable_ltcg * tax_ltcg_rate / 100.0)

    tax_summary = TaxSummary(
        short_term_gains=round(net_short_term, 2),
        long_term_gains=round(net_long_term, 2),
        tax_free_gains=round(tax_free_gains, 2),
        taxable_gains=round(tax_taxable_gains, 2),
        estimated_tax_liability=round(tax_estimated_liability, 2),
        equity_stcg_rate_pct=tax_stcg_rate,
        equity_ltcg_rate_pct=tax_ltcg_rate,
        equity_ltcg_exemption=tax_ltcg_exemption,
    )

    if inferred_ter_scheme_count > 0:
        add_warning(
            "COST_TER_ESTIMATED",
            "cost",
            "info",
            f"TER was unavailable for {inferred_ter_scheme_count} scheme(s); category/plan TER proxies were used for cost estimates.",
        )
    add_warning("RISK_ESTIMATED", "risk", "info", "Risk metrics are estimated heuristics and not derived from full return series.")
    add_warning(
        "TAX_ESTIMATED",
        "tax",
        "info",
        "Tax estimates are indicative, based on lot-level holding periods and unrealized gains/loss set-off; verify with a tax advisor before filing.",
    )
    add_warning(
        "GUIDELINES_TEMPLATE",
        "guidelines",
        "info",
        "Template guidance: target allocations are model recommendations and should be treated as advisory, not prescriptive.",
    )

    guidelines = GuidelinesData(
        investment_guidelines=RecommendedPortfolio(
            asset_allocation=[
                GuidelineItem(label="Equity", current=equity_pct_actual, recommended=80.0),
                GuidelineItem(label="Fixed Income", current=fi_pct_actual, recommended=20.0),
                GuidelineItem(label="Others", current=others_pct_actual, recommended=0.0),
            ],
            equity_mc=[
                GuidelineItem(label="Large Cap", current=mc_alloc.large_cap, recommended=67.0),
                GuidelineItem(label="Mid Cap", current=mc_alloc.mid_cap, recommended=20.0),
                GuidelineItem(label="Small Cap", current=mc_alloc.small_cap, recommended=13.0),
            ],
            fi_metrics=[
                GuidelineItem(label="Net YTM", current=0.0, recommended=11.06),
                GuidelineItem(label="Average Maturity (Years)", current=0.0, recommended=2.27),
            ],
        ),
        equity_indicative=[
            EquityIndicative(category="Large Cap - Index", allocation=25.0),
            EquityIndicative(category="Focused", allocation=20.0),
            EquityIndicative(category="Contra", allocation=17.0),
            EquityIndicative(category="Flexi Cap", allocation=15.0),
            EquityIndicative(category="Mid Cap", allocation=12.5),
            EquityIndicative(category="Small Cap", allocation=10.0),
            EquityIndicative(category="Liquid", allocation=0.5),
        ],
        fi_indicative=[
            FixedIncomeIndicative(issuer="Diversified Book", pqrs=4.51, ytm=10.85, tenure=3.70, allocation=20.0),
            FixedIncomeIndicative(issuer="Micro Finance/PTC", pqrs=4.09, ytm=11.9, tenure=1.4, allocation=20.0),
            FixedIncomeIndicative(issuer="MSME/Personal", pqrs=3.80, ytm=11.2, tenure=1.65, allocation=15.0),
            FixedIncomeIndicative(issuer="SME Finance/Education", pqrs=4.13, ytm=10.7, tenure=1.65, allocation=15.0),
            FixedIncomeIndicative(issuer="Education Finance", pqrs=3.80, ytm=10.5, tenure=2.48, allocation=10.0),
            FixedIncomeIndicative(issuer="Enterprise Book/Supply Chain", pqrs=4.13, ytm=10.5, tenure=1.1, allocation=5.0),
            FixedIncomeIndicative(issuer="Invits", ytm=11.0, tenure=3.0, allocation=15.0),
        ],
    )

    overlap_data = None
    overlap_source: Literal["real", "none"] = "none"
    overlap_available_funds = 0
    equity_holdings = [h for h in holdings if h.category == "Equity"]
    if len(equity_holdings) >= 2:
        seen = set()
        scheme_order = []
        scheme_names_map = {}
        for h in equity_holdings:
            key = (h.amfi or "").strip() or h.scheme_name
            if not key or key in seen:
                continue
            seen.add(key)
            scheme_order.append(key)
            scheme_names_map[key] = h.scheme_name

        try:
            holdings_by_scheme = await get_holdings_for_schemes(scheme_order, scheme_names=scheme_names_map)
            await save_amfi_cache_async()
        except Exception as e:
            holdings_by_scheme = {}
            log_debug(f"Holdings fetch error: {type(e).__name__}: {e}")

        schemes_with_holdings = [s for s in scheme_order if holdings_by_scheme.get(s)]
        overlap_available_funds = len(schemes_with_holdings)
        if len(schemes_with_holdings) >= 2:
            _, matrix = compute_overlap_matrix(holdings_by_scheme, schemes_with_holdings)
            overlap_data = OverlapData(
                fund_codes=schemes_with_holdings,
                fund_names=[scheme_names_map.get(c, c) for c in schemes_with_holdings],
                matrix=matrix,
            )
            overlap_source = "real"
        else:
            add_warning("OVERLAP_UNAVAILABLE", "overlap", "warn", "Overlap matrix is unavailable because real holdings data could not be sourced for enough schemes.")
    else:
        add_warning("OVERLAP_NOT_ENOUGH_FUNDS", "overlap", "info", "At least two equity schemes are required to compute overlap.")

    investor_info = None
    investor_obj = cas_data.get("investor_info") or cas_data.get("investor") or {}
    investor_data: Dict[str, str] = {}
    if isinstance(investor_obj, dict):
        investor_data = {
            "name": investor_obj.get("name") or investor_obj.get("investor_name") or investor_obj.get("full_name"),
            "email": investor_obj.get("email") or investor_obj.get("email_id") or investor_obj.get("email_address"),
            "address": investor_obj.get("address") or investor_obj.get("investor_address") or investor_obj.get("full_address"),
            "phone": investor_obj.get("mobile") or investor_obj.get("phone") or investor_obj.get("phone_number") or investor_obj.get("mobile_number"),
        }
    investor_data["pan"] = cas_data.get("pan") or cas_data.get("pan_number") or cas_data.get("pan_no") or cas_data.get("PAN")
    if not investor_data.get("pan"):
        for folio in cas_data.get("folios") or []:
            if not isinstance(folio, dict):
                continue
            pan = folio.get("PAN") or folio.get("pan") or folio.get("pan_number") or folio.get("pan_no")
            if pan:
                investor_data["pan"] = pan
                break
    if any(v for v in investor_data.values() if v):
        investor_info = InvestorInfo(**{k: v for k, v in investor_data.items() if v})
        log_debug(f"Investor metadata extracted; fields={[k for k, v in investor_data.items() if v]}")

    stmt_period = cas_data.get("statement_period", {})
    statement_date = stmt_period.get("to") or datetime.now().strftime("%d-%b-%Y")

    summary = AnalysisSummary(
        total_market_value=round(total_mkt_live, 2),
        total_cost_value=round(total_cost, 2),
        total_gain_loss=round(total_mkt_live - total_cost, 2),
        portfolio_return=round(((total_mkt_live - total_cost) / total_cost) * 100, 2) if total_cost > 0 else 0.0,
        portfolio_xirr=round(pf_xirr, 2) if pf_xirr is not None else None,
        benchmark_xirr=round(bm_xirr, 2) if bm_xirr is not None else None,
        equity_xirr=round(eq_xirr, 2) if eq_xirr is not None else None,
        equity_benchmark_xirr=round(eq_bm_xirr, 2) if eq_bm_xirr is not None else None,
        benchmark_gains=round(benchmark_val_now - benchmark_cost_total, 2),
        equity_benchmark_gains=round(total_equity_bm_gain, 2),

        holdings_count=len(holdings),
        statement_date=statement_date,
        asset_allocation=alloc_list,
        concentration=ConcentrationData(
            fund_count=len(schemes_seen),
            fund_status="Over-diversified" if len(schemes_seen) > 15 else "Healthy",
            amc_count=len(amcs),
            amc_status="Over-diversified" if len(amcs) > 10 else "Healthy",
            top_funds=top_funds,
            top_amcs=top_amcs,
        ),
        cost=CostData(
            direct_pct=round(direct_value / total_mkt_live * 100, 1) if total_mkt_live > 0 else 0.0,
            regular_pct=round(regular_value / total_mkt_live * 100, 1) if total_mkt_live > 0 else 0.0,
            portfolio_cost_pct=round((annual_cost_est / total_mkt_live * 100), 2) if total_mkt_live > 0 else 0.0,
            annual_cost=round(annual_cost_est, 2),
            total_cost_paid=round(total_cost_paid_est, 2),
            savings_value=round(savings_value_est, 2),
        ),
        market_cap=mc_alloc,
        equity_value=round(total_equity_val, 2),
        equity_pct=equity_pct_actual,
        fixed_income=fi_data,
        performance_summary=perf_summary,
        guidelines=guidelines,
        overlap=overlap_data,
        investor_info=investor_info,
        valuation_mode="live_nav",
        statement_market_value=round(total_mkt_statement, 2),
        live_nav_delta_value=round(total_mkt_live - total_mkt_statement, 2),
        equity_cost_value=round(total_equity_cost, 2),
        equity_gain_loss=round(total_equity_gain, 2),
        fixed_income_cost_value=round(total_fi_cost, 2),
        fixed_income_gain_loss=round(total_fi_gain, 2),
        tax=tax_summary,
        warnings=warnings,
        data_coverage=DataCoverage(
            benchmark_date_match_pct=benchmark_date_match_pct,
            overlap_source=overlap_source,
            overlap_available_funds=overlap_available_funds,
        ),
    )
    return AnalysisResponse(success=True, holdings=holdings, summary=summary)


def parse_cas_data(_data):
    return AnalysisResponse(success=False, error="Legacy list format not supported in new analyzer")


@app.get("/api/auth/me", response_model=AuthSessionResponse)
async def auth_me(auth: AuthContext = Depends(require_authenticated_user)):
    return AuthSessionResponse(
        user_id=auth.user_id,
        session_id=auth.session_id,
        is_admin=auth.is_admin,
    )


@app.get("/api/admin/overview", response_model=AdminOverviewResponse)
async def admin_overview(auth: AuthContext = Depends(require_admin_user)):
    record_audit_log(
        user_id=auth.user_id,
        route="/api/admin/overview",
        action="admin_overview_viewed",
        status="success",
        message="Admin overview fetched.",
    )
    overview = get_admin_overview(registered_users=await fetch_clerk_user_count())
    return AdminOverviewResponse(
        metrics=AdminAnalyticsMetrics(**overview["metrics"]),
        recent_analyses=[AdminAnalysisRun(**item) for item in overview["recent_analyses"]],
        recent_logs=[AdminLogEntry(**item) for item in overview["recent_logs"]],
    )


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze(
    request: Request,
    auth: AuthContext = Depends(require_authenticated_user),
    file: UploadFile = File(...),
    password: str = Form(""),
):
    request_id = uuid.uuid4().hex[:10]
    started_at = perf_counter()
    raw_filename = (file.filename or "").strip()
    filename_lower = raw_filename.lower()
    file_type = Path(raw_filename).suffix.lower().lstrip(".") or None

    def record_outcome(response: Optional[AnalysisResponse], status: str, error_message: Optional[str] = None) -> None:
        holdings_count = response.summary.holdings_count if response and response.summary else None
        total_market_value = response.summary.total_market_value if response and response.summary else None
        record_analysis_run(
            request_id=request_id,
            user_id=auth.user_id,
            session_id=auth.session_id,
            file_name=raw_filename or None,
            file_type=file_type,
            status=status,
            duration_ms=int((perf_counter() - started_at) * 1000),
            holdings_count=holdings_count,
            total_market_value=total_market_value,
            error_message=error_message,
        )

    try:
        content, read_error = await _read_upload_limited(file)
        if read_error:
            response = AnalysisResponse(success=False, error=read_error)
            record_outcome(response, "validation_error", read_error)
            return response
        assert content is not None

        validation_error = _validate_upload(file, content)
        if validation_error:
            response = AnalysisResponse(success=False, error=validation_error)
            record_outcome(response, "validation_error", validation_error)
            return response

        if filename_lower.endswith(".pdf"):
            parse_result = parse_with_casparser(io.BytesIO(content), password=password)
            if not parse_result["success"]:
                response = AnalysisResponse(success=False, error=parse_result["error"])
                record_outcome(response, "parse_error", parse_result["error"])
                return response
            response = await map_casparser_to_analysis(parse_result["data"])
            record_outcome(response, "success" if response.success else "analysis_error", response.error)
            return response

        if filename_lower.endswith(".json"):
            try:
                json_data = json.loads(content)
            except Exception:
                response = AnalysisResponse(success=False, error="Invalid JSON file.")
                record_outcome(response, "validation_error", response.error)
                return response
            if isinstance(json_data, dict) and "folios" in json_data:
                shape_error = _validate_cas_json_shape(json_data)
                if shape_error:
                    response = AnalysisResponse(success=False, error=shape_error)
                    record_outcome(response, "validation_error", shape_error)
                    return response
                response = await map_casparser_to_analysis(json_data)
                record_outcome(response, "success" if response.success else "analysis_error", response.error)
                return response
            if isinstance(json_data, list):
                response = parse_cas_data(json_data)
                record_outcome(response, "validation_error", response.error)
                return response
            response = AnalysisResponse(success=False, error="Unknown JSON format.")
            record_outcome(response, "validation_error", response.error)
            return response

        response = AnalysisResponse(success=False, error="Unsupported file type. Please upload a PDF or JSON.")
        record_outcome(response, "validation_error", response.error)
        return response
    except Exception as e:
        log_debug(f"[{request_id}] analyze error: {type(e).__name__}: {e}")
        error_message = f"Internal server error. Request ID: {request_id}"
        response = AnalysisResponse(success=False, error=error_message)
        record_outcome(response, "internal_error", error_message)
        return response


@app.post("/api/parse_pdf")
async def parse_pdf(
    request: Request,
    auth: AuthContext = Depends(require_authenticated_user),
    file: UploadFile = File(...),
    password: str = Form(""),
    output_format: str = Form("json"),
):
    request_id = uuid.uuid4().hex[:10]
    try:
        content, read_error = await _read_upload_limited(file)
        if read_error:
            record_audit_log(
                user_id=auth.user_id,
                route=request.url.path,
                action="parse_pdf_failed",
                status="validation_error",
                message=read_error,
            )
            return JSONResponse(status_code=400, content={"error": read_error})
        assert content is not None

        validation_error = _validate_upload(file, content)
        if validation_error:
            record_audit_log(
                user_id=auth.user_id,
                route=request.url.path,
                action="parse_pdf_failed",
                status="validation_error",
                message=validation_error,
            )
            return JSONResponse(status_code=400, content={"error": validation_error})
        if not (file.filename or "").lower().endswith(".pdf"):
            record_audit_log(
                user_id=auth.user_id,
                route=request.url.path,
                action="parse_pdf_failed",
                status="validation_error",
                message="Only PDF files are supported for this endpoint.",
            )
            return JSONResponse(status_code=400, content={"error": "Only PDF files are supported for this endpoint."})

        result = parse_with_casparser(io.BytesIO(content), password=password)
        if not result["success"]:
            record_audit_log(
                user_id=auth.user_id,
                route=request.url.path,
                action="parse_pdf_failed",
                status="parse_error",
                message=result["error"],
            )
            return JSONResponse(status_code=400, content={"error": result["error"]})

        if output_format.lower() == "excel":
            record_audit_log(
                user_id=auth.user_id,
                route=request.url.path,
                action="parse_pdf_succeeded",
                status="success",
                message="Parsed CAS PDF to Excel.",
                metadata={"output_format": "excel"},
            )
            excel_buffer = convert_to_excel(result["data"])
            return StreamingResponse(
                excel_buffer,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment; filename=portfolio.xlsx"},
            )
        record_audit_log(
            user_id=auth.user_id,
            route=request.url.path,
            action="parse_pdf_succeeded",
            status="success",
            message="Parsed CAS PDF to JSON.",
            metadata={"output_format": "json"},
        )
        return JSONResponse(content=result["data"])
    except Exception as e:
        log_debug(f"[{request_id}] parse_pdf error: {type(e).__name__}: {e}")
        record_audit_log(
            user_id=auth.user_id,
            route=request.url.path,
            action="parse_pdf_failed",
            status="internal_error",
            message=f"Internal server error. Request ID: {request_id}",
        )
        return JSONResponse(status_code=500, content={"error": f"Internal server error. Request ID: {request_id}"})


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/test")
async def test_api():
    return {"message": "API is alive"}


@app.get("/")
async def home():
    return FileResponse("static/index.html")


def _serve_spa() -> FileResponse:
    return FileResponse("static/index.html")


@app.get("/dashboard")
async def dashboard_page():
    return _serve_spa()


@app.get("/dashboard/{path:path}")
async def dashboard_page_nested(path: str):
    return _serve_spa()


@app.get("/admin")
async def admin_page():
    return _serve_spa()


@app.get("/admin/{path:path}")
async def admin_page_nested(path: str):
    return _serve_spa()


app.mount("/", StaticFiles(directory="static", html=True), name="static")

