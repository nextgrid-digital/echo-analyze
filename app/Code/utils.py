import re
import html
from datetime import datetime, date, timedelta
import httpx
import math
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

import json
import os
import asyncio

# Global caches (In-memory + Disk)
_nav_cache: Dict[str, float] = {}
_history_cache: Dict[str, dict] = {}
_history_cache_years: Dict[str, Set[int]] = {}
_history_full_cache: Set[str] = set()
_history_primary_failed_codes: Set[str] = set()
_nav_cache_date: Optional[str] = None  # ISO date string (YYYY-MM-DD) when NAVs were cached
NAV_CACHE_FILE = "data/nav_cache.json"
AMFI_CODE_PATTERN = re.compile(r"^\d{1,12}$")
_fetch_locks: Dict[str, asyncio.Lock] = {}
_http_client: Optional[httpx.AsyncClient] = None
_navall_map: Dict[str, float] = {}
_navall_scheme_amc_map: Dict[str, str] = {}
_navall_history_date_map: Dict[str, str] = {}
_navall_cache_date: Optional[str] = None
_navall_lock = asyncio.Lock()
_amfi_fund_ids: Dict[str, str] = {}
_amfi_fund_ids_lock = asyncio.Lock()
_amfi_history_chunk_cache: Dict[Tuple[str, str, str], Dict[str, Dict[str, float]]] = {}
_amfi_history_chunk_locks: Dict[Tuple[str, str, str], asyncio.Lock] = {}
NAV_ALL_URL = "https://portal.amfiindia.com/spages/NAVAll.txt"
NAV_HISTORY_URL = "https://portal.amfiindia.com/DownloadNAVHistoryReport_Po.aspx"
AMFI_FUND_LIST_URL = "https://www.amfiindia.com/net-asset-value/nav-history"
DEFAULT_NAV_HISTORY_LOOKBACK_YEARS = 5
MAX_NAV_HISTORY_LOOKBACK_YEARS = 25

async def _get_client():
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=10.0, limits=httpx.Limits(max_connections=100, max_keepalive_connections=20))
    return _http_client


def _get_float_env(name: str, default: float, minimum: float, maximum: float) -> float:
    try:
        parsed = float(os.environ.get(name, "").strip())
    except (TypeError, ValueError):
        parsed = default
    return min(max(parsed, minimum), maximum)


def _get_int_env(name: str, default: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(os.environ.get(name, "").strip())
    except (TypeError, ValueError):
        parsed = default
    return min(max(parsed, minimum), maximum)


def _parse_amfi_date_to_history_key(value: Any) -> Optional[str]:
    text = str(value or "").strip()
    if not text:
        return None
    for fmt in ("%d-%b-%Y", "%d-%B-%Y", "%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, fmt).strftime("%d-%m-%Y")
        except ValueError:
            continue
    return None


def _format_amfi_history_date(value: date) -> str:
    return value.strftime("%d-%b-%Y")


def _load_cache():
    """Load cache from disk; discard stale NAV cache (different day)."""
    global _nav_cache, _history_cache, _history_cache_years, _history_full_cache, _nav_cache_date
    if os.path.exists(NAV_CACHE_FILE):
        try:
            with open(NAV_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                cached_date = data.get("nav_date", "")
                today = date.today().isoformat()
                if cached_date == today:
                    _nav_cache = data.get("nav", {})
                    _nav_cache_date = cached_date
                else:
                    # Stale NAV cache - discard so fresh NAVs are fetched
                    _nav_cache = {}
                    _nav_cache_date = today
                # History cache doesn't expire (historical data doesn't change)
                history_cache = data.get("history", {})
                _history_cache = history_cache if isinstance(history_cache, dict) else {}
                history_meta = data.get("history_meta")
                if isinstance(history_meta, dict):
                    years_meta = history_meta.get("years", {})
                    if isinstance(years_meta, dict):
                        _history_cache_years = {
                            str(code): {
                                int(year)
                                for year in years
                                if isinstance(year, int) or (isinstance(year, str) and year.isdigit())
                            }
                            for code, years in years_meta.items()
                            if isinstance(years, list)
                        }
                    full_codes = history_meta.get("full", [])
                    if isinstance(full_codes, list):
                        _history_full_cache = {str(code) for code in full_codes}
                else:
                    # Older cache files came from the full-history source.
                    _history_full_cache = set(_history_cache.keys())
        except Exception:
            return

def _ensure_fresh_cache():
    """Clear in-memory NAV cache if a new day has started."""
    global _nav_cache, _nav_cache_date
    today = date.today().isoformat()
    if _nav_cache_date != today:
        _nav_cache = {}
        _nav_cache_date = today


def _parse_navall_text_with_metadata(text: str) -> Tuple[Dict[str, float], Dict[str, str], Dict[str, str]]:
    nav_map: Dict[str, float] = {}
    scheme_amc_map: Dict[str, str] = {}
    history_date_map: Dict[str, str] = {}
    current_amc = ""
    if not text:
        return nav_map, scheme_amc_map, history_date_map
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if ";" not in line:
            if "mutual fund" in line.lower():
                current_amc = re.sub(r"\s+", " ", line).strip()
            continue
        parts = line.split(";")
        # NAVAll rows: Scheme Code ; ISIN Div ; ISIN Growth ; Scheme Name ; NAV ; Date
        if len(parts) < 6:
            continue
        code = parts[0].strip()
        nav_str = parts[4].strip()
        if not code or not code.isdigit():
            continue
        try:
            nav_val = float(nav_str)
        except (TypeError, ValueError):
            continue
        if math.isfinite(nav_val) and nav_val > 0:
            nav_map[code] = nav_val
            if current_amc:
                scheme_amc_map[code] = current_amc
            history_date = _parse_amfi_date_to_history_key(parts[5].strip())
            if history_date:
                history_date_map[code] = history_date
    return nav_map, scheme_amc_map, history_date_map


def _parse_navall_text(text: str) -> Dict[str, float]:
    nav_map, _, _ = _parse_navall_text_with_metadata(text)
    return nav_map


async def _get_navall_map() -> Dict[str, float]:
    global _navall_map, _navall_scheme_amc_map, _navall_history_date_map, _navall_cache_date
    today = date.today().isoformat()
    if _navall_cache_date == today and _navall_map:
        return _navall_map

    async with _navall_lock:
        if _navall_cache_date == today and _navall_map:
            return _navall_map
        try:
            client = await _get_client()
            response = await client.get(NAV_ALL_URL, timeout=4.0)
            if response.status_code == 200:
                parsed, scheme_amc_map, history_date_map = _parse_navall_text_with_metadata(response.text)
                if parsed:
                    _navall_map = parsed
                    _navall_scheme_amc_map = scheme_amc_map
                    _navall_history_date_map = history_date_map
                    _navall_cache_date = today
        except Exception:
            return _navall_map
    return _navall_map


async def save_cache_async():
    """Save cache to disk without blocking the event loop."""
    try:
        if os.environ.get("VERCEL"):
            return  # Read-only filesystem on Vercel
        nav_snap = dict(_nav_cache)
        hist_snap = dict(_history_cache)
        data_str = json.dumps({
            "nav": nav_snap,
            "history": hist_snap,
            "history_meta": {
                "years": {code: sorted(years) for code, years in _history_cache_years.items()},
                "full": sorted(_history_full_cache),
            },
            "nav_date": _nav_cache_date or date.today().isoformat()
        })
        cache_path = Path(NAV_CACHE_FILE)
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        with open(cache_path, "w", encoding="utf-8") as f:
            f.write(data_str)
    except Exception:
        return


_load_cache()

def clean_currency_to_float(text: str) -> float:
    """Removes currency symbols and commas to return a clean float."""
    if not text:
        return 0.0
    # Strip currency labels and keep only the numeric portion.
    sanitized = re.sub(r"[^0-9,.\-]", "", text)
    match = re.search(r"(-?[\d,]+\.?\d*)", sanitized)
    if match:
        try:
            parsed = float(match.group(1).replace(",", ""))
        except ValueError:
            return 0.0
        return parsed if math.isfinite(parsed) else 0.0
    return 0.0


def _parse_positive_float(value) -> Optional[float]:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed if math.isfinite(parsed) and parsed > 0 else None


def _normalize_amc_name(name: str) -> str:
    text = html.unescape(str(name or "")).lower().replace("&", "and")
    return re.sub(r"[^a-z0-9]+", "", text)


def _parse_amfi_fund_ids_page(text: str) -> Dict[str, str]:
    fund_ids: Dict[str, str] = {}
    normalized_text = html.unescape(text or "").replace('\\"', '"')
    pattern = re.compile(r'"mfId"\s*:\s*"(\d+)".{0,200}?"mfName"\s*:\s*"([^"]+)"', re.DOTALL)
    for match in pattern.finditer(normalized_text):
        fund_id = match.group(1).strip()
        fund_name = match.group(2).strip()
        normalized_name = _normalize_amc_name(fund_name)
        if fund_id and normalized_name:
            fund_ids[normalized_name] = fund_id
    return fund_ids


async def _get_amfi_fund_ids() -> Dict[str, str]:
    global _amfi_fund_ids
    if _amfi_fund_ids:
        return _amfi_fund_ids

    async with _amfi_fund_ids_lock:
        if _amfi_fund_ids:
            return _amfi_fund_ids
        try:
            client = await _get_client()
            response = await client.get(AMFI_FUND_LIST_URL, timeout=6.0)
            if response.status_code == 200:
                parsed = _parse_amfi_fund_ids_page(response.text)
                if parsed:
                    _amfi_fund_ids = parsed
        except Exception:
            return _amfi_fund_ids
    return _amfi_fund_ids


async def _get_scheme_amc_map() -> Dict[str, str]:
    await _get_navall_map()
    return _navall_scheme_amc_map


async def _fund_id_for_scheme_code(amfi_code: str) -> Optional[str]:
    scheme_amc_map = await _get_scheme_amc_map()
    amc_name = scheme_amc_map.get(amfi_code)
    if not amc_name:
        return None
    fund_ids = await _get_amfi_fund_ids()
    return fund_ids.get(_normalize_amc_name(amc_name))


def _coerce_history_date(value: Any) -> Optional[date]:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text:
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d-%b-%Y", "%d-%B-%Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
    except ValueError:
        return None


def _normalize_history_required_dates(required_dates: Optional[Iterable[Any]]) -> Set[date]:
    if required_dates is None:
        return set()
    if isinstance(required_dates, (str, bytes, datetime, date)):
        values: Iterable[Any] = [required_dates]
    else:
        values = required_dates
    normalized: Set[date] = set()
    for value in values:
        parsed = _coerce_history_date(value)
        if parsed is not None:
            normalized.add(parsed)
    return normalized


def _max_history_years() -> int:
    return _get_int_env(
        "NAV_HISTORY_FALLBACK_MAX_YEARS",
        MAX_NAV_HISTORY_LOOKBACK_YEARS,
        1,
        MAX_NAV_HISTORY_LOOKBACK_YEARS,
    )


def _history_years_for_dates(required_dates: Set[date]) -> Set[int]:
    today = date.today()
    oldest_year = today.year - _max_history_years() + 1
    if not required_dates:
        lookback_years = _get_int_env(
            "NAV_HISTORY_LOOKBACK_YEARS",
            DEFAULT_NAV_HISTORY_LOOKBACK_YEARS,
            1,
            _max_history_years(),
        )
        return set(range(today.year - lookback_years + 1, today.year + 1))
    return {
        min(day, today).year
        for day in required_dates
        if min(day, today).year >= oldest_year
    }


def _history_cache_satisfies(amfi_code: str, required_years: Set[int]) -> bool:
    if amfi_code in _history_full_cache:
        return True
    if not required_years:
        return bool(_history_cache.get(amfi_code))
    return required_years.issubset(_history_cache_years.get(amfi_code, set()))


def _years_from_history(history_map: Dict[str, float]) -> Set[int]:
    years: Set[int] = set()
    for history_date in history_map:
        parsed = _coerce_history_date(history_date)
        if parsed:
            years.add(parsed.year)
    return years


def _parse_amfi_nav_history_text(text: str) -> Dict[str, Dict[str, float]]:
    histories: Dict[str, Dict[str, float]] = {}
    if not text or not text.lstrip().startswith("Scheme Code;"):
        return histories

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or ";" not in line:
            continue
        parts = line.split(";")
        if len(parts) < 8:
            continue
        code = parts[0].strip()
        if not AMFI_CODE_PATTERN.fullmatch(code):
            continue
        nav_value = _parse_positive_float(parts[4].strip())
        history_date = _parse_amfi_date_to_history_key(parts[7].strip())
        if nav_value is None or not history_date:
            continue
        histories.setdefault(code, {})[history_date] = nav_value
    return histories


def _parse_amfi_nav_history_text_for_code(text: str, amfi_code: str) -> Dict[str, float]:
    code = str(amfi_code or "").strip()
    if not AMFI_CODE_PATTERN.fullmatch(code):
        return {}
    return _parse_amfi_nav_history_text(text).get(code, {})


def _merge_date_windows(windows: List[Tuple[date, date]]) -> List[Tuple[date, date]]:
    merged: List[Tuple[date, date]] = []
    for start_day, end_day in sorted(windows):
        if end_day < start_day:
            continue
        if not merged or start_day > merged[-1][1] + timedelta(days=1):
            merged.append((start_day, end_day))
            continue
        previous_start, previous_end = merged[-1]
        merged[-1] = (previous_start, max(previous_end, end_day))
    return merged


def _build_amfi_history_windows(
    required_dates: Set[date],
    required_years: Set[int],
    has_fund_filter: bool,
) -> List[Tuple[date, date]]:
    today = date.today()
    if has_fund_filter:
        return [
            (date(year, 1, 1), min(date(year, 12, 31), today))
            for year in sorted(required_years)
            if date(year, 1, 1) <= today
        ]

    target_dates = required_dates or {today}
    oldest_day = date(today.year - _max_history_years() + 1, 1, 1)
    windows = []
    for target_day in sorted(target_dates):
        capped_day = min(target_day, today)
        if capped_day < oldest_day:
            continue
        windows.append((max(capped_day - timedelta(days=10), oldest_day), capped_day))
    return _merge_date_windows(windows)


async def _fetch_amfi_history_chunk(
    fund_id: Optional[str],
    start_day: date,
    end_day: date,
) -> Dict[str, Dict[str, float]]:
    cache_key = (fund_id or "", start_day.isoformat(), end_day.isoformat())
    if cache_key in _amfi_history_chunk_cache:
        return _amfi_history_chunk_cache[cache_key]

    if cache_key not in _amfi_history_chunk_locks:
        _amfi_history_chunk_locks[cache_key] = asyncio.Lock()

    async with _amfi_history_chunk_locks[cache_key]:
        if cache_key in _amfi_history_chunk_cache:
            return _amfi_history_chunk_cache[cache_key]
        parsed: Dict[str, Dict[str, float]] = {}
        params = {
            "tp": "1",
            "frmdt": _format_amfi_history_date(start_day),
            "todt": _format_amfi_history_date(end_day),
        }
        if fund_id:
            params["mf"] = fund_id
        try:
            client = await _get_client()
            timeout_seconds = _get_float_env("NAV_HISTORY_AMFI_TIMEOUT_SECONDS", 10.0, 2.0, 30.0)
            response = await client.get(NAV_HISTORY_URL, params=params, timeout=timeout_seconds)
            if response.status_code == 200:
                parsed = _parse_amfi_nav_history_text(response.text)
        except Exception:
            parsed = {}
        _amfi_history_chunk_cache[cache_key] = parsed
        return parsed


async def _fetch_history_from_mfapi(amfi_code: str) -> Dict[str, float]:
    url = f"https://api.mfapi.in/mf/{amfi_code}"
    history_map: Dict[str, float] = {}
    try:
        client = await _get_client()
        timeout_seconds = _get_float_env("NAV_HISTORY_PRIMARY_TIMEOUT_SECONDS", 3.0, 1.0, 10.0)
        response = await client.get(url, timeout=timeout_seconds)
        if response.status_code != 200:
            return {}
        data = response.json()
        if data.get("data"):
            for entry in data["data"]:
                d = entry.get("date")
                n = entry.get("nav")
                if d and n:
                    nav_value = _parse_positive_float(n)
                    if nav_value is not None:
                        history_map[d] = nav_value
    except Exception:
        return {}
    return history_map


async def _add_latest_nav_to_history(amfi_code: str, history_map: Dict[str, float]) -> None:
    navall_map = await _get_navall_map()
    nav_value = _parse_positive_float(navall_map.get(amfi_code))
    if nav_value is None:
        return
    history_date = _navall_history_date_map.get(amfi_code) or date.today().strftime("%d-%m-%Y")
    history_map[history_date] = nav_value


async def _fetch_history_from_amfi(
    amfi_code: str,
    required_dates: Set[date],
    required_years: Set[int],
) -> Tuple[Dict[str, float], Set[int]]:
    fund_id = await _fund_id_for_scheme_code(amfi_code)
    windows = _build_amfi_history_windows(required_dates, required_years, bool(fund_id))
    history_map: Dict[str, float] = {}

    for start_day, end_day in windows:
        chunk = await _fetch_amfi_history_chunk(fund_id, start_day, end_day)
        history_map.update(chunk.get(amfi_code, {}))

    await _add_latest_nav_to_history(amfi_code, history_map)
    covered_years = _years_from_history(history_map).intersection(required_years) if fund_id else set()
    return history_map, covered_years

async def fetch_live_nav(amfi_code: str) -> float:
    """
    Fetches the latest NAV for a given AMFI code.
    Primary source: AMFI NAVAll (official). Fallback: mfapi.in.
    Returns 0.0 if fetch fails or code is invalid.
    NAV cache expires daily so values are always fresh.
    """
    amfi_code = str(amfi_code or "").strip()
    if not AMFI_CODE_PATTERN.fullmatch(amfi_code):
        return 0.0
    
    _ensure_fresh_cache()
        
    if amfi_code in _nav_cache:
        return _nav_cache[amfi_code]
        
    # Deduplicate concurrent requests for the same code
    if amfi_code not in _fetch_locks:
        _fetch_locks[amfi_code] = asyncio.Lock()
        
    async with _fetch_locks[amfi_code]:
        if amfi_code in _nav_cache:
            return _nav_cache[amfi_code]

        # Official AMFI NAVAll source first.
        navall_map = await _get_navall_map()
        nav_from_amfi = float(navall_map.get(amfi_code) or 0.0)
        if math.isfinite(nav_from_amfi) and nav_from_amfi > 0:
            _nav_cache[amfi_code] = nav_from_amfi
            return nav_from_amfi
            
        url = f"https://api.mfapi.in/mf/{amfi_code}"
        try:
            client = await _get_client()
            response = await client.get(url, timeout=2.0)
            if response.status_code == 200:
                data = response.json()
                if data.get("data") and len(data["data"]) > 0:
                    nav = float(data["data"][0].get("nav") or 0.0)
                    if math.isfinite(nav) and nav > 0:
                        _nav_cache[amfi_code] = nav
                        return nav
        except Exception:
            return 0.0
            
    return 0.0

async def fetch_nav_history(amfi_code: str, required_dates: Optional[Iterable[Any]] = None) -> dict:
    """
    Fetches the full NAV history for a given AMFI code.
    Returns a dict mapping date_string ("DD-MM-YYYY") -> nav_float.
    """
    amfi_code = str(amfi_code or "").strip()
    if not AMFI_CODE_PATTERN.fullmatch(amfi_code):
        return {}

    normalized_required_dates = _normalize_history_required_dates(required_dates)
    required_years = _history_years_for_dates(normalized_required_dates)

    if amfi_code in _history_cache and _history_cache_satisfies(amfi_code, required_years):
        return _history_cache[amfi_code]
        
    # Deduplicate concurrent requests
    if amfi_code not in _fetch_locks:
        _fetch_locks[amfi_code] = asyncio.Lock()
        
    async with _fetch_locks[amfi_code]:
        if amfi_code in _history_cache and _history_cache_satisfies(amfi_code, required_years):
            return _history_cache[amfi_code]

        history_map = dict(_history_cache.get(amfi_code) or {})

        if amfi_code not in _history_primary_failed_codes and amfi_code not in _history_full_cache:
            primary_history = await _fetch_history_from_mfapi(amfi_code)
            if primary_history:
                _history_cache[amfi_code] = primary_history
                _history_cache_years[amfi_code] = _years_from_history(primary_history)
                _history_full_cache.add(amfi_code)
                return primary_history
            _history_primary_failed_codes.add(amfi_code)

        missing_years = required_years - _history_cache_years.get(amfi_code, set())
        fallback_dates = (
            {day for day in normalized_required_dates if min(day, date.today()).year in missing_years}
            if normalized_required_dates and missing_years
            else normalized_required_dates
        )
        fallback_years = missing_years or required_years
        fallback_history, covered_years = await _fetch_history_from_amfi(
            amfi_code,
            fallback_dates,
            fallback_years,
        )
        if fallback_history:
            history_map.update(fallback_history)
            _history_cache[amfi_code] = history_map
            _history_cache_years.setdefault(amfi_code, set()).update(covered_years)
            
    return history_map

def calculate_xirr(dates, amounts) -> Optional[float]:
    """
    Calculates XIRR for irregular cashflows.
    Returns annualized XIRR % when a stable root is found, otherwise None.
    """
    if len(dates) != len(amounts) or not dates:
        return None

    finite_amounts = []
    for amount in amounts:
        try:
            parsed_amount = float(amount)
        except (TypeError, ValueError):
            return None
        if not math.isfinite(parsed_amount):
            return None
        finite_amounts.append(parsed_amount)

    transactions = sorted(zip(dates, finite_amounts), key=lambda x: x[0])
    dates, amounts = zip(*transactions)

    # XIRR is only meaningful when both outflows and inflows exist.
    has_negative = any(a < 0 for a in amounts)
    has_positive = any(a > 0 for a in amounts)
    if not (has_negative and has_positive):
        return None

    start_date = dates[0]
    times = [(d - start_date).days / 365.0 for d in dates]

    # Require at least one non-zero time interval.
    if all(t == 0 for t in times):
        return None

    def xnpv(rate: float) -> float:
        # Domain guard: (1 + rate) must remain positive.
        if rate <= -0.999999:
            return float("inf")
        try:
            return sum(a / ((1 + rate) ** t) for a, t in zip(amounts, times))
        except Exception:
            return float("inf")

    # Step 1: find a sign-change bracket for NPV.
    low = -0.99
    high_candidates = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0]
    f_low = xnpv(low)
    if not math.isfinite(f_low):
        return None

    bracket = None
    prev_r = low
    prev_f = f_low
    for r in high_candidates:
        f_r = xnpv(r)
        if not math.isfinite(f_r):
            prev_r = r
            prev_f = f_r
            continue
        if prev_f == 0:
            bracket = (prev_r, prev_r)
            break
        if f_r == 0:
            bracket = (r, r)
            break
        if prev_f * f_r < 0:
            bracket = (prev_r, r)
            break
        prev_r = r
        prev_f = f_r

    if bracket is None:
        return None

    low_b, high_b = bracket
    if low_b == high_b:
        root = low_b
    else:
        f_low_b = xnpv(low_b)
        f_high_b = xnpv(high_b)
        if not (math.isfinite(f_low_b) and math.isfinite(f_high_b)):
            return None
        if f_low_b * f_high_b > 0:
            return None

        # Step 2: bisection for guaranteed convergence.
        root = None
        for _ in range(120):
            mid = (low_b + high_b) / 2.0
            f_mid = xnpv(mid)
            if not math.isfinite(f_mid):
                return None
            if abs(f_mid) < 1e-7 or abs(high_b - low_b) < 1e-8:
                root = mid
                break
            if f_low_b * f_mid <= 0:
                high_b = mid
                f_high_b = f_mid
            else:
                low_b = mid
                f_low_b = f_mid
        if root is None:
            root = (low_b + high_b) / 2.0

    result_pct = root * 100.0
    if not math.isfinite(result_pct):
        return None
    return result_pct


def fetch_tri_index_history(index_key: str, required_dates: Optional[Iterable[Any]] = None) -> dict:
    """Prefer committed TRI index levels over AMFI index-fund NAV proxies when available."""
    from app.Code.benchmarks.tri_history import fetch_tri_index_history as _fetch_tri

    return _fetch_tri(index_key, required_dates)
