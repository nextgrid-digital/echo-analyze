from typing import Optional, Tuple

from app.Code.benchmarks.category_map import normalize_amfi_category, sebi_category_label
from app.Code.benchmarks.index_name_parser import parse_underlying_index_key
from app.Code.benchmarks.sector_map import resolve_sector_index_key


def _has_any(text: str, *needles: str) -> bool:
    return any(needle in text for needle in needles)


def classify_sebi_category_from_name(
    scheme_name: str,
    scheme_type: str = "",
) -> Tuple[str, bool]:
    """
    Fallback classifier when AMFI scheme master has no entry.
    Returns (sebi_category, ambiguous).
    """
    name = (scheme_name or "").upper()
    typ = (scheme_type or "").upper()
    text = f"{name} {typ}"

    if _has_any(text, "GOLD"):
        return "gold_etf", False
    if _has_any(text, "SILVER", "PRECIOUS METAL", "COMMODITY"):
        return "gold_etf", True

    if _has_any(text, "ETF"):
        return "etf", False
    if _has_any(text, "INDEX FUND") or ("INDEX" in name and "FUND" in name):
        return "index_fund", False
    if _has_any(text, "NASDAQ", "S&P 500", "SP500", "HANG SENG"):
        return "index_fund", False
    if _has_any(text, "FOF", "FUND OF FUND"):
        return "fof_domestic", False
    if _has_any(text, "OVERSEAS", "INTERNATIONAL"):
        return "fof_overseas", False

    if _has_any(text, "ELSS", "TAX SAVER"):
        return "elss", False
    if _has_any(text, "FOCUSED", "FOCUS FUND", " FOCUS "):
        return "focused_fund", False
    if _has_any(text, "FLEXI CAP", "FLEXI-CAP", "FLEXICAP"):
        return "flexi_cap", False
    if _has_any(text, "LARGE & MID", "LARGE AND MID", "LARGEMIDCAP", "LARGE MIDCAP 250"):
        return "large_mid_cap", False
    if _has_any(text, "MULTI CAP", "MULTI-CAP", "MULTICAP"):
        return "multi_cap", False
    if _has_any(text, "MIDSMALLCAP", "MID SMALLCAP"):
        return "mid_cap", False
    if _has_any(text, "SMALL CAP", "SMALL-CAP", "SMALLCAP"):
        return "small_cap", False
    if _has_any(text, "MID CAP", "MID-CAP", "MIDCAP"):
        return "mid_cap", False
    if _has_any(text, "LARGE CAP", "LARGE-CAP", "LARGECAP", "BLUECHIP", "TOP 100"):
        return "large_cap", False
    if _has_any(text, "VALUE FUND", " VALUE "):
        return "value_fund", False
    if _has_any(text, "CONTRA"):
        return "contra_fund", False
    if _has_any(text, "DIVIDEND YIELD"):
        return "dividend_yield", False

    sector_key, _ = resolve_sector_index_key(scheme_name)
    if sector_key:
        return "sectoral_thematic", False

    if _has_any(
        text,
        "BALANCED ADVANTAGE",
        "DYNAMIC ASSET ALLOCATION",
        "BALANCED ADVANTAGE",
    ):
        return "balanced_advantage", False
    if _has_any(text, "MULTI ASSET"):
        return "multi_asset", False
    if _has_any(text, "AGGRESSIVE HYBRID", "AGGRESSIVE"):
        return "aggressive_hybrid", False
    if _has_any(text, "CONSERVATIVE HYBRID", "MONTHLY INCOME", "CONSERVATIVE"):
        return "conservative_hybrid", False
    if _has_any(text, "EQUITY SAVINGS"):
        return "equity_savings", False
    if _has_any(text, "ARBITRAGE"):
        return "arbitrage", False
    if _has_any(text, "HYBRID", "BALANCED"):
        return "balanced_hybrid", False

    if _has_any(
        text,
        "LIQUID FUND",
        " OVERNIGHT ",
        "MONEY MARKET",
        "ULTRA SHORT",
        "LOW DURATION",
        "SHORT DURATION",
        "CORPORATE BOND",
        "CREDIT RISK",
        "DYNAMIC BOND",
        "GILT FUND",
        "FLOATER",
    ) or _has_any(text, "DEBT", "FIXED INCOME") or "DEBT" in typ:
        if _has_any(text, "LIQUID", "OVERNIGHT", "MONEY MARKET", "ULTRA SHORT", "LOW DURATION"):
            return "liquid", False
        if _has_any(text, "GILT", "TREASURY", "CONSTANT MATURITY", "SDL"):
            return "gilt", False
        if _has_any(text, "CREDIT RISK", "LOW RATED", "HIGH YIELD"):
            return "credit_risk", False
        if _has_any(text, "BANKING", "PSU"):
            return "banking_psu", False
        return "corporate_bond", False

    if _has_any(text, "EQUITY", "DIVIDEND") or "EQUITY" in typ:
        underlying = parse_underlying_index_key(scheme_name, scheme_type)
        if underlying:
            return "index_fund", False
        return "flexi_cap", True

    if _has_any(text, "GROWTH") and not _has_any(text, "LIQUID", "OVERNIGHT", "DEBT", "GILT", "BOND"):
        return "flexi_cap", True

    if _has_any(text, "LIQUID", "OVERNIGHT", "MONEY MARKET"):
        return "liquid", False

    if _has_any(text, "DEBT", "BOND", "GILT", "INCOME", "DURATION", "FLOATER") or "DEBT" in typ:
        return "liquid", True
    if _has_any(text, "HYBRID", "BALANCED", "ASSET ALLOCATION"):
        return "balanced_hybrid", True

    return "flexi_cap", True


def fallback_sub_category(sebi_category: str, scheme_name: str) -> str:
    if sebi_category == "sectoral_thematic":
        sector_key, _ = resolve_sector_index_key(scheme_name)
        if sector_key:
            return f"Sectoral - {sector_key.replace('_tri', '').replace('_', ' ').title()}"
    if sebi_category in {"index_fund", "etf"}:
        underlying = parse_underlying_index_key(scheme_name)
        if underlying:
            return f"Index - {underlying.replace('_', ' ').title()}"
    return sebi_category_label(sebi_category)
