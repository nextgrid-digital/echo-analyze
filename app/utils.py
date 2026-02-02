import re
from datetime import datetime
import httpx
import numpy as np
from scipy import optimize

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
        
    url = f"https://api.mfapi.in/mf/{amfi_code}"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                # mfapi returns data sorted by date descending, so index 0 is latest
                if data.get("data") and len(data["data"]) > 0:
                    nav = data["data"][0].get("nav")
                    return float(nav) if nav else 0.0
    except Exception as e:
        print(f"Error fetching NAV for {amfi_code}: {e}")
        
    return 0.0

async def fetch_nav_history(amfi_code: str) -> dict:
    """
    Fetches the full NAV history for a given AMFI code.
    Returns a dict mapping date_string ("DD-MM-YYYY") -> nav_float.
    """
    if not amfi_code:
        return {}
    
    url = f"https://api.mfapi.in/mf/{amfi_code}"
    history_map = {}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                # Format: "data": [{"date": "dd-mm-yyyy", "nav": "123.45"}, ...]
                if data.get("data"):
                    for entry in data["data"]:
                        d = entry.get("date")
                        n = entry.get("nav")
                        if d and n:
                            try:
                                history_map[d] = float(n)
                            except ValueError:
                                pass
    except Exception as e:
        print(f"Error fetching history for {amfi_code}: {e}")
        
    return history_map

def calculate_xirr(dates, amounts):
    """
    Calculates XIRR for a schedule of transactions.
    :param dates: List of datetime objects
    :param amounts: List of floats (negative for investment, positive for value)
    :return: XIRR as a percentage (float), or 0.0 if calculation fails.
    """
    if len(dates) != len(amounts) or not dates:
        return 0.0

    # Ensure amounts and dates are paired and sorted by date
    transactions = sorted(zip(dates, amounts), key=lambda x: x[0])
    dates, amounts = zip(*transactions)
    
    if amounts[0] >= 0:
        # First transaction must be an investment (negative)
        return 0.0

    # Normalization: XIRR equation
    # 0 = sum( amount_i / (1 + rate) ^ ((date_i - date_0) / 365) )
    
    start_date = dates[0]
    
    def xnpv(rate):
        # Prevent division by zero or negative base issues if rate is too low
        if rate <= -1.0:
            return float('inf')
        
        val = 0.0
        for d, a in zip(dates, amounts):
            days_diff = (d - start_date).days
            val += a / ((1 + rate) ** (days_diff / 365.0))
        return val

    try:
        # Newton-Raphson method
        # Guess 0.1 (10%)
        result = optimize.newton(xnpv, 0.1, maxiter=50)
        return result * 100
    except (RuntimeError, ValueError) as e:
        # Fallback or failure
        # print("XIRR convergene failed:", e)
        return 0.0