import asyncio
import io
import json
import os
import re
import uuid
from bisect import bisect_right
from datetime import date, datetime
from pathlib import Path
from typing import Dict, List, Literal, Optional, Tuple

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.cas_parser import convert_to_excel, parse_with_casparser
from app.holdings import get_holdings_for_schemes, save_amfi_cache_async
from app.overlap import compute_overlap_matrix
from app.utils import calculate_xirr, fetch_live_nav, fetch_nav_history, save_cache_async

app = FastAPI()

LOG_FILE = "data/backend_debug.log"
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".json"}
ALLOWED_CONTENT_TYPES = {
    ".pdf": {"application/pdf", "application/octet-stream"},
    ".json": {"application/json", "text/json", "application/octet-stream", "text/plain"},
}
PDF_MAGIC_PREFIX = b"%PDF-"


def _redact_pii(text: str) -> str:
    if not text:
        return text
    text = re.sub(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", "[REDACTED_PAN]", text, flags=re.IGNORECASE)
    text = re.sub(r"[\w\.-]+@[\w\.-]+\.\w+", "[REDACTED_EMAIL]", text)
    text = re.sub(r"(\+?\d[\d\-\s]{8,}\d)", "[REDACTED_PHONE]", text)
    return text


def log_debug(msg: str) -> None:
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
    benchmark_gains: float
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

async def map_casparser_to_analysis(cas_data: dict) -> AnalysisResponse:
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
    fi_cashflows: List[Tuple[datetime, float]] = []
    benchmark_units = 0.0
    benchmark_txn_total = 0
    benchmark_txn_exact = 0
    fi_mkt = 0.0
    fi_cost = 0.0
    fi_amc_values: Dict[str, float] = {}
    fi_holdings_objs: List[Holding] = []
    fi_alloc_map: Dict[str, float] = {}
    credit_values = {"AAA": 0.0, "AA": 0.0, "Below AA": 0.0}
    perf_diffs_weighted: List[Tuple[float, float]] = []
    comparable_perf_count = 0
    ambiguous_category_count = 0

    all_amfis = set()
    for folio_data in folios:
        for scheme in folio_data.get("schemes", []):
            amfi = (scheme.get("amfi") or "").strip()
            if amfi:
                all_amfis.add(amfi)

    nav_map: Dict[str, float] = {}
    benchmark_history: Dict[str, float] = {}
    benchmark_sorted_keys: List[str] = []
    benchmark_sorted_dates: List[date] = []
    bench_nav_now = 0.0
    benchmark_code = "120716"

    try:
        tasks = [fetch_nav_history(benchmark_code)] + [fetch_live_nav(code) for code in all_amfis]
        results = await asyncio.wait_for(asyncio.gather(*tasks), timeout=8.0)
        benchmark_history_raw = results[0]
        nav_map = dict(zip(all_amfis, results[1:]))
        benchmark_history, benchmark_sorted_keys, benchmark_sorted_dates, bench_nav_now = _prepare_benchmark_history(benchmark_history_raw)
        await save_cache_async()
    except Exception as e:
        add_warning("LIVE_NAV_FETCH_FAILED", "valuation", "warn", "Live NAV fetch failed for one or more schemes; statement NAV fallback applied where needed.")
        log_debug(f"Pre-fetch error: {type(e).__name__}: {e}")

    nav_missing_schemes = set()
    benchmark_fallback_by_scheme: Dict[str, int] = {}

    for folio_data in folios:
        folio_num = folio_data.get("folio", "N/A")
        amc_name = folio_data.get("amc", "Unknown AMC")
        amcs.add(amc_name)

        for scheme in folio_data.get("schemes", []):
            units = float(scheme.get("close", 0.0) or 0.0)
            if units <= 0.01:
                continue

            name = scheme.get("scheme", "Unknown Scheme")
            amfi = (scheme.get("amfi") or "").strip()
            scheme_type = (scheme.get("type") or "OTHERS").strip()
            schemes_seen.add(name)

            scheme_cost = 0.0
            scheme_cashflows: List[Tuple[datetime, float]] = []
            scheme_tx_dates: List[datetime] = []

            for txn in scheme.get("transactions", []):
                desc = (txn.get("description") or "").upper()
                if "REINVEST" in desc:
                    continue
                date_str = txn.get("date")
                amt = _parse_amount(txn.get("amount"))
                if date_str is None or amt is None or amt == 0:
                    continue
                dt = _parse_iso_date(date_str)
                if not dt:
                    continue

                scheme_cashflows.append((dt, -amt))
                scheme_tx_dates.append(dt)
                if amt > 0:
                    scheme_cost += amt
                portfolio_cashflows.append((dt, -amt))

                benchmark_txn_total += 1
                b_nav, is_exact = _benchmark_nav_for_date(date_str, benchmark_history, benchmark_sorted_keys, benchmark_sorted_dates)
                if b_nav:
                    benchmark_units += amt / b_nav
                    if is_exact:
                        benchmark_txn_exact += 1
                    else:
                        benchmark_fallback_by_scheme[name] = benchmark_fallback_by_scheme.get(name, 0) + 1

            val = scheme.get("valuation", {})
            if "cost" in val:
                try:
                    scheme_cost = float(val["cost"])
                except Exception:
                    pass

            statement_nav = float(val.get("nav", 0.0) or 0.0)
            statement_value_raw = val.get("value")
            if statement_value_raw is None:
                statement_mkt_val = round(units * statement_nav, 2)
            else:
                try:
                    statement_mkt_val = round(float(statement_value_raw), 2)
                except Exception:
                    statement_mkt_val = round(units * statement_nav, 2)

            live_nav = nav_map.get(amfi, 0.0) if amfi else 0.0
            effective_nav = live_nav if live_nav > 0 else statement_nav
            if amfi and live_nav <= 0:
                nav_missing_schemes.add(name)
            mkt_val = round(units * effective_nav, 2)

            sub_cat = get_sub_category(name, scheme_type)
            cat, ambiguous = _infer_category(name, scheme_type, sub_cat)
            if ambiguous:
                ambiguous_category_count += 1

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

            gain = mkt_val - scheme_cost
            ret_pct = round((gain / scheme_cost) * 100, 2) if scheme_cost > 0 else 0.0
            date_of_entry = min(scheme_tx_dates).strftime("%Y-%m-%d") if scheme_tx_dates else None

            if cat == "Fixed Income":
                fi_mkt += mkt_val
                fi_cost += scheme_cost
                fi_amc_values[amc_name] = fi_amc_values.get(amc_name, 0.0) + mkt_val
                fi_alloc_map[sub_cat] = fi_alloc_map.get(sub_cat, 0.0) + mkt_val
                fi_cashflows.extend(scheme_cashflows)
                u_sub = sub_cat.upper()
                if any(x in u_sub for x in ["LIQUID", "GILT", "OVERNIGHT", "MONEY MARKET", "TREASURY"]):
                    credit_values["AAA"] += mkt_val
                elif any(x in u_sub for x in ["CREDIT RISK", "MEDIUM DURATION", "DYNAMIC"]):
                    credit_values["AA"] += mkt_val
                else:
                    credit_values["AAA"] += mkt_val

            s_xirr = None
            s_bm_xirr = None
            if scheme_cashflows:
                now_dt = datetime.now()
                s_flows = scheme_cashflows + [(now_dt, mkt_val)]
                s_xirr = calculate_xirr([x[0] for x in s_flows], [x[1] for x in s_flows])

                s_bm_units = 0.0
                for dt, amt in scheme_cashflows:
                    b_nav, _ = _benchmark_nav_for_date(dt.strftime("%Y-%m-%d"), benchmark_history, benchmark_sorted_keys, benchmark_sorted_dates)
                    if b_nav:
                        s_bm_units += (-amt) / b_nav
                s_bm_val = s_bm_units * bench_nav_now
                if s_bm_val > 0:
                    s_bm_flows = scheme_cashflows + [(now_dt, s_bm_val)]
                    s_bm_xirr = calculate_xirr([x[0] for x in s_bm_flows], [x[1] for x in s_bm_flows])

            if s_xirr is not None and s_bm_xirr is not None and mkt_val > 0:
                comparable_perf_count += 1
                perf_diffs_weighted.append((mkt_val, s_xirr - s_bm_xirr))

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

    now_dt = datetime.now()
    pf_xirr = calculate_xirr(
        [x[0] for x in (portfolio_cashflows + [(now_dt, total_mkt_live)])],
        [x[1] for x in (portfolio_cashflows + [(now_dt, total_mkt_live)])],
    )
    benchmark_val_now = benchmark_units * bench_nav_now
    bm_xirr = calculate_xirr(
        [x[0] for x in (portfolio_cashflows + [(now_dt, benchmark_val_now)])],
        [x[1] for x in (portfolio_cashflows + [(now_dt, benchmark_val_now)])],
    )
    if bm_xirr is None:
        add_warning("BENCHMARK_XIRR_UNAVAILABLE", "benchmark", "warn", "Benchmark XIRR could not be computed reliably for this dataset.")

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

    annual_cost_est = (direct_value * 0.0075 + regular_value * 0.015)
    total_cost_paid_est = annual_cost_est * 5
    total_equity_val = sum(h.market_value for h in holdings if h.category == "Equity")
    total_equity_cost = sum(h.cost_value for h in holdings if h.category == "Equity")
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

    def calc_perf_metric(weighted_diffs: List[Tuple[float, float]]) -> PerfMetric:
        total_weight = sum(w for w, _ in weighted_diffs)
        if total_weight <= 0:
            return PerfMetric(underperforming_pct=0, upto_3_pct=0, more_than_3_pct=0)
        under_w = sum(w for w, d in weighted_diffs if d < 0)
        upto_3_w = sum(w for w, d in weighted_diffs if -3 <= d < 0)
        more_3_w = sum(w for w, d in weighted_diffs if d < -3)
        return PerfMetric(
            underperforming_pct=round((under_w / total_weight) * 100, 1),
            upto_3_pct=round((upto_3_w / total_weight) * 100, 1),
            more_than_3_pct=round((more_3_w / total_weight) * 100, 1),
        )

    perf_summary = PerformanceSummary(
        one_year=calc_perf_metric(perf_diffs_weighted),
        three_year=calc_perf_metric(perf_diffs_weighted),
    )

    if len([h for h in holdings if h.category == "Equity"]) > comparable_perf_count:
        add_warning("PERFORMANCE_PARTIAL_COVERAGE", "performance", "info", "Performance attribution uses only schemes with both fund and benchmark XIRR.")
    add_warning("PERFORMANCE_3Y_ESTIMATED", "performance", "info", "Three-year performance bucket mirrors one-year availability due source limits.")

    equity_pct_actual = round((total_equity_val / total_mkt_live) * 100, 1) if total_mkt_live > 0 else 0.0
    fi_pct_actual = round((fi_mkt / total_mkt_live) * 100, 1) if total_mkt_live > 0 else 0.0
    others_pct_actual = round(max(0, 100 - equity_pct_actual - fi_pct_actual), 1) if total_mkt_live > 0 else 0.0

    tax_stcg_rate = 20.0
    tax_ltcg_rate = 12.0
    tax_ltcg_exemption = 125000.0
    tax_short_term_gains = 0.0
    tax_long_term_gains = 0.0
    tax_free_gains = 0.0
    as_of_date = now_dt.date()

    for h in holdings:
        gain = float(h.gain_loss or 0.0)
        if h.category != "Equity" or gain <= 0:
            continue
        entry_dt = _parse_iso_date(h.date_of_entry) if h.date_of_entry else None
        is_long_term = bool(entry_dt and (as_of_date - entry_dt.date()).days >= 365)
        if is_long_term:
            tax_long_term_gains += gain
        else:
            tax_short_term_gains += gain

    tax_taxable_gains = max(0.0, tax_short_term_gains + tax_long_term_gains - tax_free_gains)
    taxable_ltcg = max(0.0, tax_long_term_gains - tax_ltcg_exemption)
    tax_estimated_liability = (tax_short_term_gains * tax_stcg_rate / 100.0) + (taxable_ltcg * tax_ltcg_rate / 100.0)

    tax_summary = TaxSummary(
        short_term_gains=round(tax_short_term_gains, 2),
        long_term_gains=round(tax_long_term_gains, 2),
        tax_free_gains=round(tax_free_gains, 2),
        taxable_gains=round(tax_taxable_gains, 2),
        estimated_tax_liability=round(tax_estimated_liability, 2),
        equity_stcg_rate_pct=tax_stcg_rate,
        equity_ltcg_rate_pct=tax_ltcg_rate,
        equity_ltcg_exemption=tax_ltcg_exemption,
    )

    add_warning("RISK_ESTIMATED", "risk", "info", "Risk metrics are estimated heuristics and not derived from full return series.")
    add_warning(
        "TAX_ESTIMATED",
        "tax",
        "info",
        "Tax estimates use simplified equity rates and holding-period assumptions; verify with a tax advisor before filing.",
    )
    add_warning("GUIDELINES_TEMPLATE", "guidelines", "info", "Guideline recommendations are template-based and should be reviewed by an advisor.")

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
        benchmark_gains=round(benchmark_val_now - total_cost, 2),
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
            savings_value=round(total_cost_paid_est * 0.6, 2),
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


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze(file: UploadFile = File(...), password: str = Form("")):
    request_id = uuid.uuid4().hex[:10]
    try:
        content = await file.read()
        validation_error = _validate_upload(file, content)
        if validation_error:
            return AnalysisResponse(success=False, error=validation_error)

        filename = (file.filename or "").lower()
        if filename.endswith(".pdf"):
            parse_result = parse_with_casparser(io.BytesIO(content), password=password)
            if not parse_result["success"]:
                return AnalysisResponse(success=False, error=parse_result["error"])
            return await map_casparser_to_analysis(parse_result["data"])

        if filename.endswith(".json"):
            try:
                json_data = json.loads(content)
            except Exception:
                return AnalysisResponse(success=False, error="Invalid JSON file.")
            if isinstance(json_data, dict) and "folios" in json_data:
                return await map_casparser_to_analysis(json_data)
            if isinstance(json_data, list):
                return parse_cas_data(json_data)
            return AnalysisResponse(success=False, error="Unknown JSON format.")

        return AnalysisResponse(success=False, error="Unsupported file type. Please upload a PDF or JSON.")
    except Exception as e:
        log_debug(f"[{request_id}] analyze error: {type(e).__name__}: {e}")
        return AnalysisResponse(success=False, error=f"Internal server error. Request ID: {request_id}")


@app.post("/api/parse_pdf")
async def parse_pdf(file: UploadFile = File(...), password: str = Form(""), output_format: str = Form("json")):
    request_id = uuid.uuid4().hex[:10]
    try:
        content = await file.read()
        validation_error = _validate_upload(file, content)
        if validation_error:
            return JSONResponse(status_code=400, content={"error": validation_error})
        if not (file.filename or "").lower().endswith(".pdf"):
            return JSONResponse(status_code=400, content={"error": "Only PDF files are supported for this endpoint."})

        result = parse_with_casparser(io.BytesIO(content), password=password)
        if not result["success"]:
            return JSONResponse(status_code=400, content={"error": result["error"]})

        if output_format.lower() == "excel":
            excel_buffer = convert_to_excel(result["data"])
            return StreamingResponse(
                excel_buffer,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment; filename=portfolio.xlsx"},
            )
        return JSONResponse(content=result["data"])
    except Exception as e:
        log_debug(f"[{request_id}] parse_pdf error: {type(e).__name__}: {e}")
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


app.mount("/", StaticFiles(directory="static", html=True), name="static")

