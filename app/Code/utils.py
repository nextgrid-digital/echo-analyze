import re
from datetime import datetime
import httpx

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
    Calculates XIRR for a schedule of transactions (pure Python, no scipy).
    :param dates: List of datetime objects
    :param amounts: List of floats (negative for investment, positive for value)
    :return: XIRR as a percentage (float), or 0.0 if calculation fails.
    """
    if len(dates) != len(amounts) or not dates:
        return 0.0

    transactions = sorted(zip(dates, amounts), key=lambda x: x[0])
    dates, amounts = zip(*transactions)
    
    if amounts[0] >= 0:
        return 0.0

    start_date = dates[0]
    # Time in years from start for each cashflow
    times = [(d - start_date).days / 365.0 for d in dates]

    def xnpv(rate):
        if rate <= -1.0:
            return float("inf")
        return sum(a / ((1 + rate) ** t) for a, t in zip(amounts, times))

    def xnpv_prime(rate):
        if rate <= -1.0:
            return 1.0
        return sum(-a * t / ((1 + rate) ** (t + 1)) for a, t in zip(amounts, times))

    # Newton-Raphson
    rate = 0.1
    for _ in range(50):
        f = xnpv(rate)
        if abs(f) < 1e-9:
            return rate * 100
        fp = xnpv_prime(rate)
        if abs(fp) < 1e-12:
            break
        rate = rate - f / fp
        if rate <= -1.0:
            rate = -0.99
    return rate * 100