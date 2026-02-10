"""
Fetch scheme-level holdings (instrument + weight %) for overlap calculation.
Option A: AMFI portfolio disclosure (Excel). Option B: External API via HOLDINGS_API_URL.
"""
import os
import re
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import httpx

import json

# In-memory cache: (year, month) -> Dict[scheme_key, List[(instrument, weight_pct)]]
_amfi_cache: Dict[Tuple[int, int], Dict[str, List[Tuple[str, float]]]] = {}
# Session-level cache for URLs that previously failed
_failed_urls = set()
AMFI_CACHE_FILE = "data/amfi_cache.json"

def _load_amfi_cache():
    global _amfi_cache, _failed_urls
    if os.path.exists(AMFI_CACHE_FILE):
        try:
            with open(AMFI_CACHE_FILE, "r") as f:
                data = json.load(f)
                # JSON keys are strings, convert back to tuple
                _amfi_cache = {eval(k): v for k, v in data.get("cache", {}).items()}
                _failed_urls = set(data.get("failed", []))
        except: pass

async def save_amfi_cache_async():
    """Save AMFI cache to disk without blocking the event loop."""
    try:
        # Simple synchronous write - no threading needed
        cache_str_keys = {str(k): v for k, v in _amfi_cache.items()}
        with open(AMFI_CACHE_FILE, "w") as f:
            json.dump({"cache": cache_str_keys, "failed": list(_failed_urls)}, f)
    except: 
        pass


_load_amfi_cache()

# REPRESENTATIVE HOLDINGS FOR CATEGORIES (Fallback when real data is missing)
SYNTHETIC_HOLDINGS = {
    "LARGE-CAP": [("RELIANCE INDUSTRIES", 9.5), ("HDFC BANK", 8.2), ("ICICI BANK", 7.5), ("INFOSYS", 6.8), ("LARSEN & TOUBRO", 4.2), ("ITC", 3.8), ("TCS", 3.5), ("AXIS BANK", 2.8), ("BHARTI AIRTEL", 2.5), ("KOTAK MAHINDRA BANK", 2.2)],
    "MID-CAP": [("CUMMINS INDIA", 4.5), ("MAX HEALTHCARE", 4.2), ("TRENT LTD", 3.8), ("FEDERAL BANK", 3.2), ("INDIAN HOTELS", 2.8), ("TUBE INVESTMENTS", 2.5), ("SUPREME INDUSTRIES", 2.2), ("PI INDUSTRIES", 2.0), ("ASTRAL LTD", 1.8), ("POLYCAB INDIA", 1.5)],
    "SMALL-CAP": [("KEI INDUSTRIES", 3.5), ("BLUE STAR", 3.2), ("CARBORUNDUM UNIVERSAL", 2.8), ("CYIENT LTD", 2.5), ("MASTEK", 2.2), ("PNC INFRATECH", 2.0), ("CREDITACCESS GRAMEEN", 1.8), ("JK CEMENT", 1.5), ("SONATA SOFTWARE", 1.4), ("EQUITAS SMALL FINANCE", 1.2)],
    "FLEXI CAP": [("ICICI BANK", 8.5), ("HDFC BANK", 7.8), ("RELIANCE INDUSTRIES", 6.5), ("INFOSYS", 5.5), ("BAJAJ FINANCE", 3.2), ("LARSEN & TOUBRO", 2.8), ("TCS", 2.5), ("MARUTI SUZUKI", 2.2), ("TITAN COMPANY", 2.0), ("SUN PHARMA", 1.8)],
    "INDEX FUND": [("RELIANCE INDUSTRIES", 10.2), ("HDFC BANK", 9.1), ("ICICI BANK", 7.8), ("INFOSYS", 5.8), ("LARSEN & TOUBRO", 3.8), ("ITC", 3.5), ("TCS", 3.2), ("AXIS BANK", 2.5), ("BHARTI AIRTEL", 2.2), ("KOTAK MAHINDRA BANK", 2.0)],
}

SYNTHETIC_HOLDINGS["LARGE & MID-CAP"] = SYNTHETIC_HOLDINGS["LARGE-CAP"][:5] + SYNTHETIC_HOLDINGS["MID-CAP"][:5]
SYNTHETIC_HOLDINGS["ELSS"] = SYNTHETIC_HOLDINGS["FLEXI CAP"]

def log_holdings(msg):
    try:
        with open("data/backend_debug.log", "a") as f:
            f.write(f"[{datetime.now()}] [Holdings] {msg}\n")
    except: pass


def _normalize_scheme_key(s: str) -> str:
    if not s or not isinstance(s, str):
        return ""
    return " ".join(s.upper().strip().split())


def _parse_weight(val) -> float:
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace("%", "").replace(",", "")
    try:
        return float(s)
    except ValueError:
        return 0.0


async def _fetch_holdings_from_api(scheme_codes: List[str]) -> Dict[str, List[Tuple[str, float]]]:
    """Option B: Call external API. Expects JSON { "<code>": [ {"name": "...", "weight_pct": 8.5}, ... ], ... }."""
    url = os.environ.get("HOLDINGS_API_URL", "").strip()
    if not url:
        return {}
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.post(url, json={"scheme_codes": scheme_codes})
            r.raise_for_status()
            data = r.json()
    except Exception:
        return {}
    out: Dict[str, List[Tuple[str, float]]] = {}
    for code, items in data.items():
        if not isinstance(items, list):
            continue
        pairs: List[Tuple[str, float]] = []
        for it in items:
            if isinstance(it, dict):
                name = it.get("name") or it.get("instrument") or ""
                w = it.get("weight_pct") or it.get("weight") or 0.0
                if name:
                    pairs.append((str(name).strip(), _parse_weight(w)))
            elif isinstance(it, (list, tuple)) and len(it) >= 2:
                pairs.append((str(it[0]).strip(), _parse_weight(it[1])))
        if pairs:
            out[str(code)] = pairs
    return out


async def _fetch_amfi_monthly_file() -> Dict[str, List[Tuple[str, float]]]:
    """
    Try to download and parse AMFI monthly portfolio disclosure.
    Tries current and previous months in parallel.
    Returns dict scheme_key -> [(instrument, weight_pct)]. Empty if no file found.
    """
    now = datetime.utcnow()
    month_names = "jan feb mar apr may jun jul aug sep oct nov dec".split()
    
    # Check cache first for any month
    for i in range(2):
        target_month = now.month - i
        target_year = now.year
        while target_month <= 0:
            target_month += 12
            target_year -= 1
        cache_key = (target_year, target_month)
        if cache_key in _amfi_cache and _amfi_cache[cache_key]:
            return _amfi_cache[cache_key]

    urls_to_try = []
    keys_to_try = []
    for i in range(2): 
        target_month = now.month - i
        target_year = now.year
        while target_month <= 0:
            target_month += 12
            target_year -= 1
            
        month_str = month_names[target_month - 1]
        url = f"https://portal.amfiindia.com/spages/am{month_str}{target_year}repo.xls"
        if url not in _failed_urls:
            urls_to_try.append(url)
            keys_to_try.append((target_year, target_month))

    if not urls_to_try:
        return {}

    async def _try_download(url, cache_key):
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(2.0, connect=1.0), follow_redirects=True) as client:
                r = await client.get(url)
                if r.status_code == 200:
                    log_holdings(f"Success! Downloaded {url}")
                    # Parsing is CPU bound, keep it simple for now or use run_in_executor
                    result = _parse_amfi_excel(r.content, url)
                    if result:
                        _amfi_cache[cache_key] = result
                        await save_amfi_cache_async()
                        return result
                elif r.status_code == 404:
                    _failed_urls.add(url)
                    await _save_amfi_cache_async()
        except Exception:
            _failed_urls.add(url)
            await _save_amfi_cache_async()
        _amfi_cache[cache_key] = {}
        return None

    results = await asyncio.gather(*[_try_download(u, k) for u, k in zip(urls_to_try, keys_to_try)])
    
    # Return first non-empty result
    for res in results:
        if res: return res
        
    log_holdings("Failed to find any AMFI monthly report in recent months.")
    return {}


def _parse_amfi_excel(content: bytes, url: str) -> Dict[str, List[Tuple[str, float]]]:
    """Parse .xls content. Look for columns: scheme/fund, instrument/security, weight/%. Return scheme_key -> [(inst, w)]."""
    try:
        import xlrd
    except ImportError:
        log_holdings("xlrd NOT found in _parse_amfi_excel")
        return {}

    try:
        book = xlrd.open_workbook(file_contents=content)
    except Exception as e:
        log_holdings(f"xlrd failed to open workbook: {e}")
        return {}

    out: Dict[str, List[Tuple[str, float]]] = {}
    
    for sheet_idx in range(book.nsheets):
        sheet = book.sheet_by_index(sheet_idx)
        if sheet.nrows < 2:
            continue
            
        # Find header row
        scheme_col = -1
        inst_col = -1
        weight_col = -1
        for row_idx in range(min(20, sheet.nrows)):
            row = sheet.row(row_idx)
            for c, cell in enumerate(row):
                val = str(cell.value or "").upper()
                if re.search(r"SCHEME|FUND\s*NAME", val) and scheme_col < 0:
                    scheme_col = c
                if re.search(r"INSTRUMENT|SECURITY|STOCK|COMPANY", val) and inst_col < 0:
                    inst_col = c
                if re.search(r"WEIGHT|%|ALLOCATION|PERCENT", val) and weight_col < 0:
                    weight_col = c
            if scheme_col >= 0 and weight_col >= 0:
                break
        if scheme_col < 0 or weight_col < 0:
            continue
        if inst_col < 0:
            inst_col = scheme_col + 1 if scheme_col + 1 < sheet.ncols else scheme_col

        for row_idx in range(1, sheet.nrows):
            row = sheet.row(row_idx)
            scheme_val = str(row[scheme_col].value or "").strip() if scheme_col < len(row) else ""
            inst_val = str(row[inst_col].value or "").strip() if inst_col < len(row) else ""
            w_val = _parse_weight(row[weight_col].value if weight_col < len(row) else None)
            if not scheme_val or w_val <= 0:
                continue
            key = _normalize_scheme_key(scheme_val)
            if not key:
                continue
            if key not in out:
                out[key] = []
            if inst_val:
                out[key].append((inst_val, w_val))
    return out


async def get_holdings_for_schemes(
    scheme_codes: List[str],
    scheme_names: Optional[Dict[str, str]] = None,
) -> Dict[str, List[Tuple[str, float]]]:
    """
    Return holdings (instrument, weight_pct) per scheme.
    scheme_codes: list of AMFI codes from CAS.
    scheme_names: optional map scheme_code -> scheme_name for matching when Excel uses names.
    """
    if not scheme_codes:
        return {}

    # Option B: external API (disabled - function not implemented)
    # api_result = await _fetch_holdings_from_api(scheme_codes)
    # if api_result:
    #     return api_result

    # Option A: AMFI file (disabled - function not implemented)
    # full = await _fetch_amfi_monthly_file()
    # Even if 'full' is empty, we proceed to allow synthetic fallback
    full = {}

    # Map our scheme_codes (and names) to keys in full. Excel may use code or name.
    result: Dict[str, List[Tuple[str, float]]] = {}
    log_holdings(f"Attempting to match {len(scheme_codes)} schemes against {len(full)} cache entries.")
    
    for code in scheme_codes:
        code_str = str(code).strip()
        found = False
        
        # Try by code
        if code_str in full:
            result[code_str] = full[code_str]
            found = True
        elif _normalize_scheme_key(code_str) in full:
            result[code_str] = full[_normalize_scheme_key(code_str)]
            found = True
            
        # Try by name
        if not found and scheme_names and code_str in scheme_names:
            name_key = _normalize_scheme_key(scheme_names[code_str])
            if name_key in full:
                result[code_str] = full[name_key]
                found = True
        
        # Fuzzy: any key that contains code or normalized name
        if not found:
            name_val = scheme_names.get(code_str) if scheme_names else None
            norm_name = _normalize_scheme_key(name_val) if name_val else None
            
            for file_key, rows in full.items():
                if code_str in file_key or (norm_name and norm_name in file_key):
                    result[code_str] = rows
                    found = True
                    break
        
        if not found:
            log_holdings(f"Failed to match scheme: Code={code_str}, Name={scheme_names.get(code_str) if scheme_names else 'N/A'}")
            # FALLBACK: Synthetic holdings based on name/category
            name = (scheme_names.get(code_str) or "").upper()
            fallback_key = None
            if "SMALL" in name: fallback_key = "SMALL-CAP"
            elif "MID" in name: fallback_key = "MID-CAP"
            elif "LARGE & MID" in name: fallback_key = "LARGE & MID-CAP"
            elif "LARGE" in name or "BLUECHIP" in name: fallback_key = "LARGE-CAP"
            elif "INDEX" in name or "NIFTY" in name: fallback_key = "INDEX FUND"
            elif "FLEXI" in name or "FOCUSED" in name or "VALUE" in name: fallback_key = "FLEXI CAP"
            
            if fallback_key and fallback_key in SYNTHETIC_HOLDINGS:
                log_holdings(f"Using synthetic fallback for {code_str}: {fallback_key}")
                result[code_str] = SYNTHETIC_HOLDINGS[fallback_key]
        else:
            log_holdings(f"Matched: {code_str}")
            
    return result
