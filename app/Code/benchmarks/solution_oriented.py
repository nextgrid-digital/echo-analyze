from typing import Optional

# Nine SEBI/AMFI solution-oriented Tier 1 benchmark options (allocation-based selection).
SOLUTION_ORIENTED_RULES: list[tuple[tuple[str, ...], str]] = [
    (("AGGRESSIVE", "EQUITY ORIENTED", "EQUITY HEAVY", "GROWTH", "YOUNG"), "nifty_500_tri"),
    (("CONSERVATIVE", "DEBT ORIENTED", "DEBT HEAVY", "INCOME", "PENSION DEBT"), "crisil_hybrid_85_15_conservative"),
    (("BALANCED", "MODERATE", "HYBRID"), "crisil_hybrid_50_50_moderate"),
    (("LIQUID", "ULTRA SHORT", "SHORT TERM DEBT"), "crisil_liquid"),
    (("ARBITRAGE",), "nifty_arbitrage"),
    (("SENSEX",), "bse_sensex_tri"),
    (("NIFTY 50", "NIFTY50"), "nifty_50_tri"),
]


def resolve_solution_oriented_index_key(scheme_name: str) -> Optional[str]:
    text = (scheme_name or "").upper()
    for keywords, index_key in SOLUTION_ORIENTED_RULES:
        if any(keyword in text for keyword in keywords):
            return index_key
    return "bse_500_tri"
