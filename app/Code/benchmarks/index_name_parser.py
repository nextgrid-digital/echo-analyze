from typing import Optional

# Ordered patterns: first match wins (more specific before broader)
INDEX_NAME_PATTERNS: list[tuple[tuple[str, ...], str]] = [
    (("NASDAQ 100", "NASDAQ100"), "nasdaq_100"),
    (("S&P 500", "SP 500", "SP500"), "sp_500"),
    (("HANG SENG",), "hang_seng"),
    (("NIFTY NEXT 50", "NEXT 50", "JUNIOR BEES"), "nifty_next_50_tri"),
    (("NIFTY 500 MULTICAP", "MULTICAP 50", "50-25-25", "50 25 25"), "nifty_500_multicap_502525_tri"),
    (("LARGE MIDCAP 250", "LARGEMIDCAP 250", "LARGE & MIDCAP 250"), "nifty_largemidcap_250_tri"),
    (("NIFTY 500", "NIFTY500"), "nifty_500_tri"),
    (("NIFTY 100", "NIFTY100"), "nifty_100_tri"),
    (("NIFTY MIDCAP 150", "MIDCAP 150"), "nifty_midcap_150_tri"),
    (("NIFTY SMALLCAP 250", "SMALLCAP 250"), "nifty_smallcap_250_tri"),
    (("NIFTY BANK",), "nifty_bank_tri"),
    (("NIFTY IT", "NIFTY TECH"), "nifty_it_tri"),
    (("NIFTY PHARMA",), "nifty_pharma_tri"),
    (("NIFTY INFRA",), "nifty_infra_tri"),
    (("NIFTY AUTO",), "nifty_auto_tri"),
    (("NIFTY FMCG",), "nifty_fmcg_tri"),
    (("NIFTY METAL",), "nifty_metal_tri"),
    (("NIFTY REALTY",), "nifty_realty_tri"),
    (("NIFTY ENERGY",), "nifty_energy_tri"),
    (("NIFTY CONSUMPTION",), "nifty_consumption_tri"),
    (("NIFTY MNC",), "nifty_mnc_tri"),
    (("NIFTY INDIA DEFENCE", "NIFTY DEFENCE", "DEFENCE INDEX"), "nifty_defence_tri"),
    (("NIFTY HEALTHCARE",), "nifty_healthcare_tri"),
    (("NIFTY COMMODITIES",), "nifty_commodities_tri"),
    (("NIFTY CHEMICAL",), "nifty_chemicals_tri"),
    (("NIFTY DIGITAL",), "nifty_digital_tri"),
    (("NIFTY HOUSING",), "nifty_housing_tri"),
    (("NIFTY PSU BANK",), "nifty_psu_bank_tri"),
    (("NIFTY PRIVATE BANK",), "nifty_private_bank_tri"),
    (("NIFTY FINANCIAL SERVICES",), "nifty_financial_services_tri"),
    (("NIFTY CAPITAL MARKET",), "nifty_capital_markets_tri"),
    (("NIFTY OIL", "OIL & GAS"), "nifty_oil_gas_tri"),
    (("NIFTY ESG",), "nifty_esg_tri"),
    (("BSE SENSEX", "SENSEX"), "bse_sensex_tri"),
    (("BSE 500",), "bse_500_tri"),
    (("NIFTY 50", "NIFTY50", "NIFTYBEES", "NIFTY BEES"), "nifty_50_tri"),
    (("GOLD",), "gold"),
    (("SILVER",), "silver"),
]


def parse_underlying_index_key(scheme_name: str, scheme_type: str = "") -> Optional[str]:
    text = f"{scheme_name or ''} {scheme_type or ''}".upper()
    for keywords, index_key in INDEX_NAME_PATTERNS:
        if any(keyword in text for keyword in keywords):
            return index_key
    return None
