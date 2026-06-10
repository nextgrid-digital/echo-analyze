from typing import Any, Dict, List, Optional, Tuple

from casparser.process.utils import isin_search


def _normalize_amfi(value: Any) -> Optional[str]:
    code = str(value or "").strip()
    if not code or code.lower() in {"none", "null", "na", "n/a"}:
        return None
    return code


def enrich_scheme_amfi(scheme: Dict[str, Any]) -> Tuple[Optional[str], bool]:
    """
    Resolve missing AMFI from ISIN / scheme name via casparser-isin MFISINDb.
    Mutates scheme in place when enrichment succeeds.
    Returns (amfi_code, was_enriched).
    """
    amfi = _normalize_amfi(scheme.get("amfi"))
    if amfi:
        return amfi, False

    scheme_name = str(scheme.get("scheme") or "").strip()
    if not scheme_name:
        return None, False

    rta = str(scheme.get("rta") or "").strip()
    rta_code = str(scheme.get("rta_code") or "").strip()
    isin = scheme.get("isin")
    isin_value = str(isin).strip() if isin else None

    resolved_isin, amfi_code, scheme_type = isin_search(
        scheme_name,
        rta,
        rta_code,
        isin=isin_value,
    )
    if not amfi_code:
        return None, False

    scheme["amfi"] = amfi_code
    if resolved_isin and not isin_value:
        scheme["isin"] = resolved_isin
    if scheme_type and not scheme.get("type"):
        scheme["type"] = scheme_type
    return amfi_code, True


def enrich_cas_amfi_codes(cas_data: Dict[str, Any]) -> List[str]:
    """
    Enrich all schemes in a CAS payload. Returns scheme names that were enriched.
    """
    enriched_names: List[str] = []
    folios = cas_data.get("folios", [])
    if not isinstance(folios, list):
        return enriched_names

    for folio in folios:
        if not isinstance(folio, dict):
            continue
        schemes = folio.get("schemes", [])
        if not isinstance(schemes, list):
            continue
        for scheme in schemes:
            if not isinstance(scheme, dict):
                continue
            _, was_enriched = enrich_scheme_amfi(scheme)
            if was_enriched:
                name = str(scheme.get("scheme") or "").strip()
                if name:
                    enriched_names.append(name)
    return enriched_names
