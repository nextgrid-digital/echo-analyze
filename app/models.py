from pydantic import BaseModel
from typing import List, Optional

class Holding(BaseModel):
    scheme_name: str
    folio: str
    units: float
    avg_cost: float
    total_cost: float
    market_value: float
    absolute_gain: float
    percentage_return: float

class PortfolioSummary(BaseModel):
    total_invested: float
    current_value: float
    overall_gain: float
    holdings: List[Holding]