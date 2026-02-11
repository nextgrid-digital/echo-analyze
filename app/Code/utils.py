import re
from datetime import datetime
import httpx
from typing import Dict, Optional

import json
import os
import asyncio

# Global caches (In-memory + Disk)
_nav_cache: Dict[str, float] = {}
_history_cache: Dict[str, dict] = {}
NAV_CACHE_FILE = "data/nav_cache.json"
_fetch_locks: Dict[str, asyncio.Lock] = {}
_http_client: Optional[httpx.AsyncClient] = None

async def _get_client():
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=10.0, limits=httpx.Limits(max_connections=100, max_keepalive_connections=20))
    return _http_client

def _load_cache():
    global _nav_cache, _history_cache
    if os.path.exists(NAV_CACHE_FILE):
        try:
            with open(NAV_CACHE_FILE, "r") as f:
                data = json.load(f)
                _nav_cache = data.get("nav", {})
                _history_cache = data.get("history", {})
        except: pass

async def save_cache_async():
    """Save cache to disk without blocking the event loop."""
    try:
        # Simple synchronous write - no threading needed
        nav_snap = dict(_nav_cache)
        hist_snap = dict(_history_cache)
        data_str = json.dumps({"nav": nav_snap, "history": hist_snap})
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
    """
    if not amfi_code:
        return 0.0
        
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

def calculate_xirr(dates, amounts):
    """
    Calculates XIRR for a schedule of transactions (pure Python, no scipy).
    :param dates: List of datetime objects
    :param amounts: List of floats (negative for investment, positive for value)
    :return: XIRR as a percentage (float), or 0.0 if calculation fails.
    """
    if len(dates) != len(amounts) or not dates:
        return 0.0

    transactions = sorted(zip(dates, amounts), key=lambda x: x[0])
    dates, amounts = zip(*transactions)
    
    if amounts[0] >= 0:
        return 0.0

    start_date = dates[0]
    # Time in years from start for each cashflow
    times = [(d - start_date).days / 365.0 for d in dates]

    def xnpv(rate):
        if rate <= -1.0:
            return float("inf")
        return sum(a / ((1 + rate) ** t) for a, t in zip(amounts, times))

    def xnpv_prime(rate):
        if rate <= -1.0:
            return 1.0
        return sum(-a * t / ((1 + rate) ** (t + 1)) for a, t in zip(amounts, times))

    # Newton-Raphson
    rate = 0.1
    for _ in range(50):
        try:
            f = xnpv(rate)
            if abs(f) < 1e-9:
                return rate * 100
            fp = xnpv_prime(rate)
            if abs(fp) < 1e-12:
                break
            rate = rate - f / fp
            if rate <= -1.0:
                rate = -0.99
        except:
            break
            
    import math
    final_rate = rate * 100
    if not math.isfinite(final_rate):
        return 0.0
    return final_rate
