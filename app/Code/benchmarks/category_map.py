from typing import Optional, Tuple

# AMFI "Scheme Category" column -> canonical SEBI category key
AMFI_CATEGORY_TO_SEBI: dict[str, str] = {
    "Equity Scheme - Large Cap Fund": "large_cap",
    "Equity Scheme - Flexi Cap Fund": "flexi_cap",
    "Equity Scheme - Mid Cap Fund": "mid_cap",
    "Equity Scheme - Small Cap Fund": "small_cap",
    "Equity Scheme - Large & Mid Cap Fund": "large_mid_cap",
    "Equity Scheme - Multi Cap Fund": "multi_cap",
    "Equity Scheme - ELSS": "elss",
    "ELSS": "elss",
    "Equity Scheme - Focused Fund": "focused_fund",
    "Equity Scheme - Value Fund": "value_fund",
    "Equity Scheme - Contra Fund": "contra_fund",
    "Equity Scheme - Dividend Yield Fund": "dividend_yield",
    "Equity Scheme - Sectoral/ Thematic": "sectoral_thematic",
    "Debt Scheme - Liquid Fund": "liquid",
    "Debt Scheme - Overnight Fund": "overnight",
    "Debt Scheme - Ultra Short Duration Fund": "ultra_short_duration",
    "Debt Scheme - Low Duration Fund": "low_duration",
    "Debt Scheme - Money Market Fund": "money_market",
    "Debt Scheme - Short Duration Fund": "short_duration",
    "Debt Scheme - Medium Duration Fund": "medium_duration",
    "Debt Scheme - Medium to Long Duration Fund": "medium_long_duration",
    "Debt Scheme - Long Duration Fund": "long_duration",
    "Debt Scheme - Corporate Bond Fund": "corporate_bond",
    "Debt Scheme - Credit Risk Fund": "credit_risk",
    "Debt Scheme - Banking and PSU Fund": "banking_psu",
    "Debt Scheme - Gilt Fund": "gilt",
    "Debt Scheme - Gilt Fund with 10 year constant duration": "gilt_10y",
    "Debt Scheme - Dynamic Bond": "dynamic_bond",
    "Debt Scheme - Floater Fund": "floater",
    "Hybrid Scheme - Aggressive Hybrid Fund": "aggressive_hybrid",
    "Hybrid Scheme - Conservative Hybrid Fund": "conservative_hybrid",
    "Hybrid Scheme - Balanced Hybrid Fund": "balanced_hybrid",
    "Hybrid Scheme - Dynamic Asset Allocation or Balanced Advantage": "balanced_advantage",
    "Hybrid Scheme - Equity Savings": "equity_savings",
    "Hybrid Scheme - Multi Asset Allocation": "multi_asset",
    "Hybrid Scheme - Arbitrage Fund": "arbitrage",
    "Other Scheme - Index Funds": "index_fund",
    "Other Scheme - Other  ETFs": "etf",
    "Other Scheme - Gold ETF": "gold_etf",
    "Other Scheme - FoF Domestic": "fof_domestic",
    "Other Scheme - FoF Overseas": "fof_overseas",
    "Solution Oriented Scheme - Children s Fund": "children_fund",
    "Solution Oriented Scheme - Retirement Fund": "retirement_fund",
    # Legacy / closed-ended labels still seen in AMFI exports
    "Liquid": "liquid",
    "Money Market": "money_market",
    "Gilt": "gilt",
    "Income": "medium_long_duration",
    "Balanced": "balanced_hybrid",
    "Growth": "flexi_cap",
    "Assured Return": "corporate_bond",
}

SEBI_CATEGORY_LABELS: dict[str, str] = {
    "large_cap": "Large Cap",
    "flexi_cap": "Flexi Cap",
    "mid_cap": "Mid Cap",
    "small_cap": "Small Cap",
    "large_mid_cap": "Large & Mid Cap",
    "multi_cap": "Multi Cap",
    "elss": "ELSS (Tax Savings)",
    "focused_fund": "Focused Fund",
    "value_fund": "Value Fund",
    "contra_fund": "Contra Fund",
    "dividend_yield": "Dividend Yield",
    "sectoral_thematic": "Sectoral / Thematic",
    "liquid": "Liquid",
    "overnight": "Overnight",
    "ultra_short_duration": "Ultra Short Duration",
    "low_duration": "Low Duration",
    "money_market": "Money Market",
    "short_duration": "Short Duration",
    "medium_duration": "Medium Duration",
    "medium_long_duration": "Medium to Long Duration",
    "long_duration": "Long Duration",
    "corporate_bond": "Corporate Bond",
    "credit_risk": "Credit Risk",
    "banking_psu": "Banking & PSU",
    "gilt": "Gilt",
    "gilt_10y": "Gilt (10Y Constant)",
    "dynamic_bond": "Dynamic Bond",
    "floater": "Floater",
    "aggressive_hybrid": "Aggressive Hybrid",
    "conservative_hybrid": "Conservative Hybrid",
    "balanced_hybrid": "Balanced Hybrid",
    "balanced_advantage": "Balanced Advantage",
    "equity_savings": "Equity Savings",
    "multi_asset": "Multi Asset Allocation",
    "arbitrage": "Arbitrage",
    "index_fund": "Index Fund",
    "etf": "ETF",
    "gold_etf": "Gold ETF",
    "fof_domestic": "Fund of Funds (Domestic)",
    "fof_overseas": "Fund of Funds (Overseas)",
    "children_fund": "Children's Fund",
    "retirement_fund": "Retirement Fund",
    "unclassified": "Unclassified",
}


def normalize_amfi_category(amfi_category: str) -> Optional[str]:
    cleaned = (amfi_category or "").strip()
    if not cleaned or cleaned == "Scheme Category":
        return None
    return AMFI_CATEGORY_TO_SEBI.get(cleaned)


def scheme_flags_from_amfi_category(amfi_category: str) -> Tuple[bool, bool, bool]:
    cleaned = (amfi_category or "").strip()
    is_index = cleaned == "Other Scheme - Index Funds"
    is_etf = cleaned in {"Other Scheme - Other  ETFs", "Other Scheme - Gold ETF"}
    is_fof = cleaned in {"Other Scheme - FoF Domestic", "Other Scheme - FoF Overseas"}
    return is_index, is_etf, is_fof


def sebi_category_label(sebi_category: str) -> str:
    return SEBI_CATEGORY_LABELS.get(sebi_category, sebi_category.replace("_", " ").title())


EQUITY_SEBI_CATEGORIES = {
    "large_cap",
    "flexi_cap",
    "mid_cap",
    "small_cap",
    "large_mid_cap",
    "multi_cap",
    "elss",
    "focused_fund",
    "value_fund",
    "contra_fund",
    "dividend_yield",
    "sectoral_thematic",
    "index_fund",
    "etf",
    "gold_etf",
}

DEBT_SEBI_CATEGORIES = {
    "liquid",
    "overnight",
    "ultra_short_duration",
    "low_duration",
    "money_market",
    "short_duration",
    "medium_duration",
    "medium_long_duration",
    "long_duration",
    "corporate_bond",
    "credit_risk",
    "banking_psu",
    "gilt",
    "gilt_10y",
    "dynamic_bond",
    "floater",
}


def asset_class_from_sebi(sebi_category: str) -> str:
    if sebi_category in EQUITY_SEBI_CATEGORIES:
        return "Equity"
    if sebi_category in DEBT_SEBI_CATEGORIES:
        return "Fixed Income"
    return "Others"


def is_equity_sebi_category(sebi_category: str) -> bool:
    return sebi_category in EQUITY_SEBI_CATEGORIES
