"""
Fetch scheme-level holdings (instrument + weight %) for overlap calculation.
Option A: AMFI portfolio disclosure (Excel). Option B: External API via HOLDINGS_API_URL.
"""
import os
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import httpx

# In-memory cache: (year, month) -> Dict[scheme_key, List[(instrument, weight_pct)]]
_amfi_cache: Dict[Tuple[int, int], Dict[str, List[Tuple[str, float]]]] = {}


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


def _fetch_holdings_from_api(scheme_codes: List[str]) -> Dict[str, List[Tuple[str, float]]]:
    """Option B: Call external API. Expects JSON { "<code>": [ {"name": "...", "weight_pct": 8.5}, ... ], ... }."""
    url = os.environ.get("HOLDINGS_API_URL", "").strip()
    if not url:
        return {}
    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.post(url, json={"scheme_codes": scheme_codes})
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


def _fetch_amfi_monthly_file() -> Dict[str, List[Tuple[str, float]]]:
    """
    Try to download and parse AMFI monthly portfolio disclosure.
    Returns dict scheme_key -> [(instrument, weight_pct)]. Empty if URL/structure not available.
    """
    now = datetime.utcnow()
    cache_key = (now.year, now.month)
    if cache_key in _amfi_cache:
        return _amfi_cache[cache_key]

    month_names = "jan feb mar apr may jun jul aug sep oct nov dec".split()
    month_str = month_names[now.month - 1]
    url = f"https://portal.amfiindia.com/spages/am{month_str}{now.year}repo.xls"
    try:
        with httpx.Client(timeout=60.0, follow_redirects=True) as client:
            r = client.get(url)
            if r.status_code != 200:
                _amfi_cache[cache_key] = {}
                return {}
            content = r.content
    except Exception:
        _amfi_cache[cache_key] = {}
        return {}

    result = _parse_amfi_excel(content, url)
    _amfi_cache[cache_key] = result
    return result


def _parse_amfi_excel(content: bytes, url: str) -> Dict[str, List[Tuple[str, float]]]:
    """Parse .xls content. Look for columns: scheme/fund, instrument/security, weight/%. Return scheme_key -> [(inst, w)]."""
    try:
        import xlrd
    except ImportError:
        return {}

    try:
        book = xlrd.open_workbook(file_contents=content)
    except Exception:
        return {}

    out: Dict[str, List[Tuple[str, float]]] = {}
    for sheet_idx in range(book.nsheets):
        sheet = book.sheet_by_index(sheet_idx)
        if sheet.nrows < 2:
            continue
        # Find header row (first row containing scheme/fund and weight-like column)
        scheme_col = -1
        inst_col = -1
        weight_col = -1
        for row_idx in range(min(5, sheet.nrows)):
            row = sheet.row(row_idx)
            for c, cell in enumerate(row):
                val = str(cell.value or "").upper()
                if re.search(r"SCHEME|FUND\s*NAME", val) and scheme_col < 0:
                    scheme_col = c
                if re.search(r"INSTRUMENT|SECURITY|STOCK|COMPANY", val) and inst_col < 0:
                    inst_col = c
                if re.search(r"WEIGHT|%|ALLOCATION|PERCENT", val) and weight_col < 0:
                    weight_col = c
            if scheme_col >= 0 and (inst_col >= 0 or weight_col >= 0):
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


def get_holdings_for_schemes(
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

    # Option B: external API
    api_result = _fetch_holdings_from_api(scheme_codes)
    if api_result:
        return api_result

    # Option A: AMFI file
    full = _fetch_amfi_monthly_file()
    if not full:
        return {}

    # Map our scheme_codes (and names) to keys in full. Excel may use code or name.
    result: Dict[str, List[Tuple[str, float]]] = {}
    for code in scheme_codes:
        code_str = str(code).strip()
        # Try by code
        if code_str in full:
            result[code_str] = full[code_str]
            continue
        if _normalize_scheme_key(code_str) in full:
            result[code_str] = full[_normalize_scheme_key(code_str)]
            continue
        # Try by name
        if scheme_names and code_str in scheme_names:
            name_key = _normalize_scheme_key(scheme_names[code_str])
            if name_key in full:
                result[code_str] = full[name_key]
                continue
        # Fuzzy: any key that contains code or normalized name
        for file_key, rows in full.items():
            if code_str in file_key or (scheme_names and scheme_names.get(code_str) and _normalize_scheme_key(scheme_names[code_str]) in file_key):
                result[code_str] = rows
                break
    return result
