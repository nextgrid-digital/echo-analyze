import re
from datetime import datetime, date
import httpx
import math
from typing import Dict, Optional

import json
import os
import asyncio

# Global caches (In-memory + Disk)
_nav_cache: Dict[str, float] = {}
_history_cache: Dict[str, dict] = {}
_nav_cache_date: Optional[str] = None  # ISO date string (YYYY-MM-DD) when NAVs were cached
NAV_CACHE_FILE = "data/nav_cache.json"
_fetch_locks: Dict[str, asyncio.Lock] = {}
_http_client: Optional[httpx.AsyncClient] = None

async def _get_client():
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=10.0, limits=httpx.Limits(max_connections=100, max_keepalive_connections=20))
    return _http_client

def _load_cache():
    """Load cache from disk; discard stale NAV cache (different day)."""
    global _nav_cache, _history_cache, _nav_cache_date
    if os.path.exists(NAV_CACHE_FILE):
        try:
            with open(NAV_CACHE_FILE, "r") as f:
                data = json.load(f)
                cached_date = data.get("nav_date", "")
                today = date.today().isoformat()
                if cached_date == today:
                    _nav_cache = data.get("nav", {})
                    _nav_cache_date = cached_date
                else:
                    # Stale NAV cache — discard so fresh NAVs are fetched
                    _nav_cache = {}
                    _nav_cache_date = today
                # History cache doesn't expire (historical data doesn't change)
                _history_cache = data.get("history", {})
        except: pass

def _ensure_fresh_cache():
    """Clear in-memory NAV cache if a new day has started."""
    global _nav_cache, _nav_cache_date
    today = date.today().isoformat()
    if _nav_cache_date != today:
        _nav_cache = {}
        _nav_cache_date = today

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
            "nav_date": _nav_cache_date or date.today().isoformat()
        })
        with open(NAV_CACHE_FILE, "w") as f:
            f.write(data_str)
    except: 
        pass


_load_cache()

def clean_currency_to_float(text: str) -> float:
    """Removes currency symbols and commas to return a clean float."""
    if not text:
        return 0.0
    # Extracts numbers including decimals and commas
    match = re.search(r"([\d,]+\.?\d*)", text.replace("₹", ""))
    if match:
        return float(match.group(1).replace(",", ""))
    return 0.0

async def fetch_live_nav(amfi_code: str) -> float:
    """
    Fetches the latest NAV for a given AMFI code from mfapi.in.
    Returns 0.0 if fetch fails or code is invalid.
    NAV cache expires daily so values are always fresh.
    """
    if not amfi_code:
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
            
        url = f"https://api.mfapi.in/mf/{amfi_code}"
        try:
            client = await _get_client()
            response = await client.get(url, timeout=2.0)
            if response.status_code == 200:
                data = response.json()
                if data.get("data") and len(data["data"]) > 0:
                    nav = float(data["data"][0].get("nav") or 0.0)
                    _nav_cache[amfi_code] = nav
                    return nav
        except Exception as e:
            # Silently fail for performance, but we should eventually log
            pass
            
    return 0.0

async def fetch_nav_history(amfi_code: str) -> dict:
    """
    Fetches the full NAV history for a given AMFI code.
    Returns a dict mapping date_string ("DD-MM-YYYY") -> nav_float.
    """
    if not amfi_code:
        return {}
    
    if amfi_code in _history_cache:
        return _history_cache[amfi_code]
        
    # Deduplicate concurrent requests
    if amfi_code not in _fetch_locks:
        _fetch_locks[amfi_code] = asyncio.Lock()
        
    async with _fetch_locks[amfi_code]:
        if amfi_code in _history_cache:
            return _history_cache[amfi_code]
            
        url = f"https://api.mfapi.in/mf/{amfi_code}"
        history_map = {}
        
        try:
            client = await _get_client()
            response = await client.get(url, timeout=3.0)
            if response.status_code == 200:
                data = response.json()
                if data.get("data"):
                    for entry in data["data"]:
                        d = entry.get("date")
                        n = entry.get("nav")
                        if d and n:
                            try:
                                history_map[d] = float(n)
                            except ValueError:
                                pass
                _history_cache[amfi_code] = history_map
        except Exception as e:
            pass
            
    return history_map

def calculate_xirr(dates, amounts) -> Optional[float]:
    """
    Calculates XIRR for irregular cashflows.
    Returns annualized XIRR % when a stable root is found, otherwise None.
    """
    if len(dates) != len(amounts) or not dates:
        return None

    transactions = sorted(zip(dates, amounts), key=lambda x: x[0])
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
