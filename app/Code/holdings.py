"""
Fetch scheme-level holdings (instrument + weight %) for overlap calculation.
Option A: External API via HOLDINGS_API_URL.
Option B: AMFI portfolio disclosure (Excel, best effort).
Option C: Groww scheme page server-side payload (real constituent holdings).
"""
import os
import re
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any

import httpx

import json

# In-memory cache: (year, month) -> Dict[scheme_key, List[(instrument, weight_pct)]]
_amfi_cache: Dict[Tuple[int, int], Dict[str, List[Tuple[str, float]]]] = {}
# Session-level cache for URLs that previously failed
_failed_urls = set()
_groww_scheme_cache: Dict[str, str] = {}
_groww_holdings_cache: Dict[str, List[Tuple[str, float]]] = {}
_groww_index_by_code: Dict[str, Dict[str, Any]] = {}
_groww_index_entries: List[Dict[str, Any]] = []
_groww_index_loaded = False
AMFI_CACHE_FILE = "data/amfi_cache.json"

def _load_amfi_cache():
    global _amfi_cache, _failed_urls, _groww_scheme_cache, _groww_holdings_cache
    if os.path.exists(AMFI_CACHE_FILE):
        try:
            with open(AMFI_CACHE_FILE, "r") as f:
                data = json.load(f)
                # JSON keys are "YYYY-MM"; parse safely (never use eval on file input).
                parsed_cache: Dict[Tuple[int, int], Dict[str, List[Tuple[str, float]]]] = {}
                for key, value in data.get("cache", {}).items():
                    if not isinstance(key, str):
                        continue
                    parts = key.split("-")
                    if len(parts) != 2:
                        continue
                    try:
                        year = int(parts[0])
                        month = int(parts[1])
                    except ValueError:
                        continue
                    parsed_cache[(year, month)] = value
                _amfi_cache = parsed_cache
                _failed_urls = set(data.get("failed", []))
                raw_scheme_cache = data.get("groww_scheme_cache", {})
                if isinstance(raw_scheme_cache, dict):
                    _groww_scheme_cache = {
                        str(k): str(v)
                        for k, v in raw_scheme_cache.items()
                        if isinstance(k, str) and isinstance(v, str)
                    }
                # Always rebuild holdings from live source in each runtime.
                _groww_holdings_cache = {}
        except: pass

async def save_amfi_cache_async():
    """Save AMFI cache to disk without blocking the event loop."""
    try:
        # Simple synchronous write - no threading needed
        cache_str_keys = {f"{k[0]:04d}-{k[1]:02d}": v for k, v in _amfi_cache.items()}
        with open(AMFI_CACHE_FILE, "w") as f:
            json.dump(
                {
                    "cache": cache_str_keys,
                    "failed": list(_failed_urls),
                    "groww_scheme_cache": _groww_scheme_cache,
                },
                f,
            )
    except: 
        pass


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


_load_amfi_cache()


def _normalize_for_match(text: str) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"[^A-Z0-9]+", " ", str(text).upper()).strip()
    if not cleaned:
        return ""
    stop_words = {
        "DIRECT",
        "REGULAR",
        "PLAN",
        "GROWTH",
        "OPTION",
        "FUND",
        "OPEN",
        "ENDED",
        "SCHEME",
        "IDCW",
        "DIVIDEND",
        "REINVESTMENT",
    }
    tokens = [tok for tok in cleaned.split() if tok and tok not in stop_words]
    return " ".join(tokens)


def _jaccard_score(a: str, b: str) -> float:
    set_a = set(a.split())
    set_b = set(b.split())
    if not set_a or not set_b:
        return 0.0
    inter = len(set_a & set_b)
    union = len(set_a | set_b)
    return inter / union if union else 0.0


async def _get_groww_index(client: httpx.AsyncClient) -> Tuple[Dict[str, Dict[str, Any]], List[Dict[str, Any]]]:
    global _groww_index_loaded, _groww_index_by_code, _groww_index_entries
    if _groww_index_loaded and _groww_index_entries:
        return _groww_index_by_code, _groww_index_entries

    search_url = "https://groww.in/v1/api/search/v1/derived/scheme?query=mf&size=2000"
    try:
        response = await client.get(search_url)
        if response.status_code != 200:
            _groww_index_loaded = True
            return {}, []
        payload = response.json()
        content = payload.get("content") if isinstance(payload, dict) else []
        entries: List[Dict[str, Any]] = []
        by_code: Dict[str, Dict[str, Any]] = {}
        if isinstance(content, list):
            for item in content:
                if not isinstance(item, dict):
                    continue
                slug = str(item.get("id") or "").strip()
                scheme_code = str(item.get("scheme_code") or "").strip()
                scheme_name = str(item.get("scheme_name") or item.get("fund_name") or "").strip()
                if not slug:
                    continue
                normalized = _normalize_for_match(scheme_name)
                record = {
                    "id": slug,
                    "scheme_code": scheme_code,
                    "scheme_name": scheme_name,
                    "normalized_name": normalized,
                }
                entries.append(record)
                if scheme_code:
                    by_code[scheme_code] = record
        _groww_index_by_code = by_code
        _groww_index_entries = entries
        _groww_index_loaded = True
        return by_code, entries
    except Exception:
        _groww_index_loaded = True
        return {}, []


def _pick_best_groww_candidate(
    entries: List[Dict[str, Any]],
    scheme_code: str,
    scheme_name: str,
) -> Optional[Dict[str, Any]]:
    code = str(scheme_code or "").strip()
    target_name = _normalize_for_match(scheme_name)
    best: Optional[Dict[str, Any]] = None
    best_score = 0.0

    target_words = target_name.split()
    target_first = target_words[0] if target_words else ""

    for cand in entries:
        cand_code = str(cand.get("scheme_code") or "").strip()
        if code and cand_code and cand_code == code:
            return cand

        cand_norm = str(cand.get("normalized_name") or "")
        if not cand_norm or not target_name:
            continue

        score = _jaccard_score(target_name, cand_norm)
        if target_name == cand_norm:
            score = 1.0
        elif target_name in cand_norm or cand_norm in target_name:
            score = max(score, 0.8)

        cand_words = cand_norm.split()
        cand_first = cand_words[0] if cand_words else ""
        first_token_match = bool(target_first and cand_first and target_first == cand_first)
        if not first_token_match:
            score -= 0.15

        if score > best_score:
            best_score = score
            best = cand

    if best_score >= 0.7:
        return best
    return None


def _extract_next_data_json(page_html: str) -> Optional[dict]:
    match = re.search(
        r"<script id=\"__NEXT_DATA__\" type=\"application/json\"[^>]*>(.*?)</script>",
        page_html,
        flags=re.DOTALL | re.IGNORECASE,
    )
    if not match:
        return None
    try:
        return json.loads(match.group(1))
    except Exception:
        return None


def _parse_groww_holdings(next_data: dict) -> List[Tuple[str, float]]:
    try:
        raw = (
            next_data.get("props", {})
            .get("pageProps", {})
            .get("mfServerSideData", {})
            .get("holdings", [])
        )
    except Exception:
        return []
    if not isinstance(raw, list):
        return []

    merged: Dict[str, float] = {}
    for item in raw:
        if not isinstance(item, dict):
            continue
        name = str(item.get("company_name") or "").strip()
        weight = _parse_weight(item.get("corpus_per"))
        if not name or weight <= 0:
            continue
        merged[name] = merged.get(name, 0.0) + weight
    if not merged:
        return []
    return sorted(merged.items(), key=lambda x: x[1], reverse=True)


async def _fetch_holdings_from_groww(
    scheme_code: str,
    scheme_name: str,
    client: httpx.AsyncClient,
) -> List[Tuple[str, float]]:
    code = str(scheme_code or "").strip()
    if not code:
        return []
    if code in _groww_holdings_cache:
        return _groww_holdings_cache[code]

    cached_slug = _groww_scheme_cache.get(code)
    slug = ""
    try:
        by_code, entries = await _get_groww_index(client)
    except Exception:
        return []

    direct_match = by_code.get(code) if code else None
    if direct_match:
        slug = str(direct_match.get("id") or "").strip()
        if slug:
            _groww_scheme_cache[code] = slug

    if not slug:
        picked = _pick_best_groww_candidate(entries, code, scheme_name)
        slug = str((picked or {}).get("id") or "").strip()
        if slug:
            _groww_scheme_cache[code] = slug
        elif cached_slug:
            slug = cached_slug
        else:
            return []

    page_url = f"https://groww.in/mutual-funds/{slug}"
    try:
        page_resp = await client.get(page_url)
        if page_resp.status_code != 200:
            return []
        next_data = _extract_next_data_json(page_resp.text)
        if not next_data:
            return []
        rows = _parse_groww_holdings(next_data)
        if rows:
            _groww_holdings_cache[code] = rows
            return rows
    except Exception:
        return []
    return []


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
                    log_holdings(f"Downloaded {url} (bytes={len(r.content)})")
                    # Parsing is CPU bound, keep it simple for now or use run_in_executor
                    result = _parse_amfi_excel(r.content, url)
                    if result:
                        log_holdings(f"Parsed {len(result)} scheme rows from {url}")
                        _amfi_cache[cache_key] = result
                        await save_amfi_cache_async()
                        return result
                    log_holdings(f"Parsed 0 rows from {url}; likely non-holdings workbook format")
                elif r.status_code == 404:
                    _failed_urls.add(url)
                    await save_amfi_cache_async()
        except Exception:
            _failed_urls.add(url)
            await save_amfi_cache_async()
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

    # Option B: external API (highest priority if configured)
    result: Dict[str, List[Tuple[str, float]]] = {}
    api_result = await _fetch_holdings_from_api(scheme_codes)
    if api_result:
        result.update(api_result)

    # Option A: AMFI file (best-effort; format varies by month/report)
    full = await _fetch_amfi_monthly_file()

    # Map our scheme_codes (and names) to keys in full. Excel may use code or name.
    log_holdings(f"Attempting to match {len(scheme_codes)} schemes against {len(full)} cache entries.")
    
    for code in scheme_codes:
        code_str = str(code).strip()
        if code_str in result:
            continue
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
        else:
            log_holdings(f"Matched: {code_str}")

    # Option C: Groww website server-side payload (real constituent holdings).
    pending = [c for c in scheme_codes if str(c).strip() and str(c).strip() not in result]
    if pending:
        headers = {
            "user-agent": "Mozilla/5.0",
            "accept": "application/json,text/html,application/xhtml+xml",
        }
        async with httpx.AsyncClient(timeout=httpx.Timeout(4.0, connect=2.0), follow_redirects=True, headers=headers) as client:
            tasks = []
            for code in pending:
                code_str = str(code).strip()
                name = (scheme_names or {}).get(code_str) or code_str
                tasks.append(_fetch_holdings_from_groww(code_str, name, client))

            fetched = await asyncio.gather(*tasks, return_exceptions=True)
            for code, rows in zip(pending, fetched):
                code_str = str(code).strip()
                if isinstance(rows, Exception):
                    log_holdings(f"Groww fetch exception for {code_str}: {type(rows).__name__}")
                    continue
                if rows:
                    result[code_str] = rows
                    log_holdings(f"Groww matched {code_str}: {len(rows)} holdings")
                else:
                    log_holdings(f"Groww no-match for {code_str}")

    return result
