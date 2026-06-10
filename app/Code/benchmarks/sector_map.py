from typing import Optional

from app.Code.benchmarks.registry import load_amfi_sector_benchmarks


def _normalize_scheme_text(scheme_name: str) -> str:
    return f" {(scheme_name or '').upper()} "


def resolve_sector_index_key(scheme_name: str) -> tuple[Optional[str], bool]:
    """
    Match scheme name against official AMFI sector benchmark table.
    Returns (index_key, used_keyword_fallback).
    """
    text = _normalize_scheme_text(scheme_name)
    sectors = load_amfi_sector_benchmarks()
    matches: list[tuple[int, str]] = []

    for entry in sectors:
        index_key = str(entry.get("index_key", "")).strip()
        priority = int(entry.get("priority") or 0)
        patterns = entry.get("match_patterns") or []
        for pattern in patterns:
            token = f" {str(pattern).upper().strip()} "
            if token in text:
                matches.append((priority, len(token), index_key))
                break

    if matches:
        matches.sort(key=lambda item: (item[0], item[1]), reverse=True)
        return matches[0][2], False

    return _keyword_fallback(scheme_name), True


def _keyword_fallback(scheme_name: str) -> Optional[str]:
    """Last-resort keyword match when official sector table has no hit."""
    text = (scheme_name or "").upper()
    legacy_patterns: list[tuple[tuple[str, ...], str]] = [
        (("BANKING", "FINANCIAL SERVICES", "BANK"), "nifty_bank_tri"),
        (("PHARMA",), "nifty_pharma_tri"),
        (("TECHNOLOGY", " IT "), "nifty_it_tri"),
        (("INFRASTRUCTURE", "INFRA "), "nifty_infra_tri"),
        (("CONSUMPTION", "CONSUMER"), "nifty_consumption_tri"),
        (("MNC",), "nifty_mnc_tri"),
        (("MANUFACTURING",), "nifty_india_manufacturing_tri"),
        (("PSU BANK",), "nifty_psu_bank_tri"),
        (("AUTO",), "nifty_auto_tri"),
        (("FMCG",), "nifty_fmcg_tri"),
        (("METAL",), "nifty_metal_tri"),
        (("REALTY",), "nifty_realty_tri"),
        (("ENERGY",), "nifty_energy_tri"),
        (("MEDIA",), "nifty_media_tri"),
        (("DEFENCE", "DEFENSE"), "nifty_defence_tri"),
        (("CHEMICAL",), "nifty_chemicals_tri"),
        (("ESG",), "nifty_esg_tri"),
        (("HOUSING",), "nifty_housing_tri"),
        (("COMMODIT",), "nifty_commodities_tri"),
    ]
    for keywords, index_key in legacy_patterns:
        if any(keyword in text for keyword in keywords):
            return index_key
    return None
