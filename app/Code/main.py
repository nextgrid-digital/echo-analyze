import json # Version: 1.0.1 (Robust XIRR + Vercel Logs)
import re
import io
import os
import asyncio
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, List, Optional
from fastapi.middleware.cors import CORSMiddleware
from app.utils import fetch_live_nav, fetch_nav_history, calculate_xirr
from app.overlap import compute_overlap_matrix
from app.holdings import get_holdings_for_schemes
from datetime import datetime

app = FastAPI()

# Setup logging to file
LOG_FILE = "data/backend_debug.log"
def log_debug(msg):
    try:
        print(f"[DEBUG] {msg}", flush=True) # Ensure it's flushed to stdout
        # Skip file logging on Vercel to avoid read-only filesystem errors
        if not os.environ.get("VERCEL"):
            with open(LOG_FILE, "a") as f:
                f.write(f"[{datetime.now()}] {msg}\n")
    except: pass

log_debug("--- Starting MF-CAS Analyzer Backend (Optimized) ---")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helpers ---

def get_sub_category(scheme_name: str, scheme_type: str) -> str:
    name = scheme_name.upper()
    if "LIQUID" in name or "OVERNIGHT" in name or "MONEY MARKET" in name: return "Diff - Liquidity"
    if "ELSS" in name or "TAX SAVER" in name: return "ELSS (Tax Savings)"
    if "INDEX" in name or "NIFTY" in name: return "Index Fund"
    if "LARGE & MID" in name: return "Large & Mid-Cap"
    if "MID CAP" in name: return "Mid-Cap"
    if "SMALL CAP" in name: return "Small-Cap"
    if "FLEXI CAP" in name: return "Flexi Cap"
    if "LARGE CAP" in name or "BLUECHIP" in name or "TOP 100" in name or "FOCUS" in name: return "Large-Cap"
    if "EQUITY" in scheme_type.upper() or "GROWTH" in name or "DIVIDEND" in name: return "Equity - Other"
    if "HYBRID" in name or "BALANCED" in name or "AGGRESSIVE" in name: return "Equity - Hybrid"
    if "DEBT" in scheme_type.upper() or "FIXED INCOME" in scheme_type.upper(): return "Debt - Market"
    return "Others"

# --- Models ---

class Holding(BaseModel):
    fund_family: str
    folio: str
    scheme_name: str
    amfi: Optional[str] = None
    units: float
    nav: float
    market_value: float
    cost_value: float
    category: str
    sub_category: str
    gain_loss: float = 0.0
    return_pct: float = 0.0
    xirr: float = 0.0  # [NEW]
    benchmark_xirr: float = 0.0 # [NEW]
    date_of_entry: Optional[str] = None # [NEW]
    style_category: Optional[str] = None

class TopItem(BaseModel):
    name: str
    value: float
    allocation_pct: float

class ConcentrationData(BaseModel):
    fund_count: int
    recommended_funds: str = "7-10"
    fund_status: str
    amc_count: int
    recommended_amcs: str = "5-7"
    amc_status: str
    top_funds: List[TopItem]
    top_amcs: List[TopItem]

class CostData(BaseModel):
    direct_pct: float
    regular_pct: float
    portfolio_cost_pct: float
    annual_cost: float
    total_cost_paid: float
    savings_value: float

class MarketCapAllocation(BaseModel):
    large_cap: float
    mid_cap: float
    small_cap: float

class AssetAllocation(BaseModel):
    category: str
    value: float
    allocation_pct: float

class CreditQuality(BaseModel):
    aaa_pct: float
    aa_pct: float
    below_aa_pct: float

class FixedIncomeData(BaseModel):
    invested_value: float
    current_value: float
    irr: float
    ytm: float
    credit_quality: CreditQuality
    top_funds: List[TopItem]
    top_amcs: List[TopItem]
    category_allocation: List[AssetAllocation]

class PerfMetric(BaseModel):
    underperforming_pct: float
    upto_3_pct: float
    more_than_3_pct: float

class PerformanceSummary(BaseModel):
    one_year: PerfMetric
    three_year: PerfMetric

class GuidelineItem(BaseModel):
    label: str
    current: float
    recommended: float

class RecommendedPortfolio(BaseModel):
    asset_allocation: List[GuidelineItem]
    equity_mc: List[GuidelineItem]
    fi_metrics: List[GuidelineItem]

class EquityIndicative(BaseModel):
    category: str
    allocation: float

class FixedIncomeIndicative(BaseModel):
    issuer: str
    pqrs: Optional[float] = None
    ytm: float
    tenure: float
    allocation: float

class GuidelinesData(BaseModel):
    investment_guidelines: RecommendedPortfolio
    equity_indicative: List[EquityIndicative]
    fi_indicative: List[FixedIncomeIndicative]


class OverlapData(BaseModel):
    fund_codes: List[str]
    fund_names: List[str]
    matrix: List[List[float]]


class InvestorInfo(BaseModel):
    name: Optional[str] = None
    pan: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None


class AnalysisSummary(BaseModel):
    total_market_value: float
    total_cost_value: float
    total_gain_loss: float
    portfolio_return: float # Absolute Return %
    portfolio_xirr: float # XIRR %
    benchmark_xirr: float
    benchmark_gains: float
    holdings_count: int
    statement_date: Optional[str]
    asset_allocation: List[AssetAllocation] = []
    concentration: ConcentrationData
    cost: CostData
    market_cap: MarketCapAllocation
    equity_value: float
    equity_pct: float
    fixed_income: Optional[FixedIncomeData] = None
    performance_summary: Optional[PerformanceSummary] = None
    guidelines: Optional[GuidelinesData] = None
    overlap: Optional[OverlapData] = None
    investor_info: Optional[InvestorInfo] = None


class AnalysisResponse(BaseModel):
    success: bool
    holdings: List[Holding] = []
    summary: Optional[AnalysisSummary] = None
    error: Optional[str] = None

# --- Logic ---

async def map_casparser_to_analysis(cas_data):
    holdings = []
    folios = cas_data.get("folios", [])
    
    total_cost = 0.0
    total_mkt = 0.0
    
    # Trackers for concentration and cost
    amcs = set()
    schemes_seen = set()
    amc_values = {}
    direct_value = 0.0
    regular_value = 0.0
    
    # Market Cap trackers
    mc_values = {"Large-Cap": 0.0, "Mid-Cap": 0.0, "Small-Cap": 0.0}
    
    # Portfolio Cashflows for XIRR
    portfolio_cashflows = [] # (date_obj, amount_float)
    
    # benchmark_history fetched in pre-pass
    benchmark_units = 0.0
    
    # Allocation Map
    allocation_map = {} # category -> value

    # Fixed Income trackers
    fi_mkt = 0.0
    fi_cost = 0.0
    fi_amc_values = {}
    fi_holdings_objs = [] # List[Holding]
    fi_alloc_map = {}
    credit_values = {"AAA": 0.0, "AA": 0.0, "Below AA": 0.0}
    
    # Performance trackers (Holding results)
    perf_records_1y = [] # list of (underperformance_val)
    perf_records_3y = [] 

    analysis_start = datetime.now()
    log_debug(f"Starting portfolio analysis for {len(folios)} folios")
    
    # Pre-fetch NAVs and Benchmark in parallel
    all_amfis = set()
    for folio_data in folios:
        for scheme in folio_data.get("schemes", []):
            if scheme.get("amfi"):
                all_amfis.add(scheme["amfi"])
    
    nav_map = {}
    benchmark_history = {}
    benchmark_code = "120716" # UTI Nifty 50

    try:
        # Fetch Benchmark + all live NAVs concurrently - with a global 5s cap
        tasks = [fetch_nav_history(benchmark_code)] + [fetch_live_nav(code) for code in all_amfis]
        results = await asyncio.wait_for(asyncio.gather(*tasks), timeout=5.0)
        benchmark_history = results[0]
        live_navs = results[1:]
        nav_map = dict(zip(all_amfis, live_navs))
        
        # Pre-convert benchmark history keys to YYYY-MM-DD for faster lookup in loop
        benchmark_iso = {}
        for d_str, val in benchmark_history.items():
            try:
                # Assuming benchmark_history d_str is DD-MM-YYYY
                dt_obj = datetime.strptime(d_str, "%d-%m-%Y")
                benchmark_iso[dt_obj.strftime("%Y-%m-%d")] = val
            except: pass
        benchmark_history = benchmark_iso

        log_debug(f"Pre-fetch completed in {(datetime.now() - analysis_start).total_seconds():.2f}s")
        
        # Flush NAV cache once at the end of the batch
        from app.utils import save_cache_async
        await save_cache_async()
    except Exception as e:
        log_debug(f"Error in batch pre-fetch: {e}")

    # Determine current benchmark NAV once
    bench_nav_now = 0.0
    if benchmark_history:
        try:
           # Sort by date descending to get latest
           sorted_dates = sorted(benchmark_history.keys(), key=lambda x: datetime.strptime(x, "%Y-%m-%d"), reverse=True)
           if sorted_dates:
               bench_nav_now = benchmark_history[sorted_dates[0]]
        except: pass


    for folio_data in folios:
        schemes = folio_data.get("schemes", [])
        folio_num = folio_data.get("folio", "N/A")
        amc_name = folio_data.get("amc", "Unknown AMC")
        amcs.add(amc_name)
        
        for scheme in schemes:
            name = scheme.get("scheme", "Unknown Scheme")
            schemes_seen.add(name)
            amfi = scheme.get("amfi", "")
            scheme_type = scheme.get("type", "OTHERS")
            
            # 1. Transactions & Cashflows
            transactions = scheme.get("transactions", [])
            scheme_cost = 0.0
            scheme_cashflows = [] # For individual XIRR
            scheme_txns_sorted = [] 

            for txn in transactions:
                try:
                    desc = txn.get("description", "").upper()
                    if "REINVEST" in desc: continue
                    
                    date_str = txn.get("date") # "YYYY-MM-DD"
                    amt = txn.get("amount")
                    if amt is None: continue
                    
                    if isinstance(amt, str):
                        amt = float(amt.replace(",", ""))
                    else:
                        amt = float(amt)
                        
                    if amt == 0: continue
                    
                    dt = datetime.strptime(date_str, "%Y-%m-%d")
                    scheme_cashflows.append((dt, -amt)) # Inflow logic for XIRR
                    scheme_txns_sorted.append(dt)
                    
                    if amt > 0: # Only buy/SIP adds to cost basis generally, strictly speaking cost is separate but this is a proxy
                         scheme_cost += amt
                    
                    # Add to global portfolio cashflows
                    portfolio_cashflows.append((dt, -amt))

                    b_nav = benchmark_history.get(date_str)
                    if b_nav:
                        units_change = amt / b_nav 
                        benchmark_units += units_change
                        
                except Exception as e:
                    pass # Txn parse error
            
            date_of_entry = None
            if scheme_txns_sorted:
                scheme_txns_sorted.sort()
                date_of_entry = scheme_txns_sorted[0].strftime("%Y-%m-%d")

            # 2. Valuation
            val = scheme.get("valuation", {})
            nav = float(val.get("nav", 0.0) or 0.0)
            
            live_nav = 0.0
            if amfi:
                live_nav = nav_map.get(amfi, 0.0)
            if live_nav > 0:
                nav = live_nav

            units = float(scheme.get("close", 0.0) or 0.0)
            if units <= 0.01:
                continue # Skip closed
                
            mkt_val = round(units * nav, 2)
            
            if "cost" in val:
                try: scheme_cost = float(val["cost"])
                except: pass
            
            # Categorization
            sub_cat = get_sub_category(name, scheme_type)
            # Refined categorization for Debt
            cat = "Fixed Income" if "Diff - Liquidity" in sub_cat or "Debt" in sub_cat or "Debt" in scheme_type else "Equity"
            if "EQUITY" in sub_cat.upper(): cat = "Equity"
            if sub_cat == "Others": cat = "Others"  
            
            # log_debug(f"Categorized {name}: sub_cat={sub_cat}, cat={cat}")
            
            # Market Cap Aggregation
            if sub_cat in mc_values: 
                mc_values[sub_cat] += mkt_val
            elif "ELSS" in sub_cat or "Index" in sub_cat or "Flexi" in sub_cat:
                mc_values["Large-Cap"] += mkt_val 
            elif "Large & Mid" in sub_cat:
                mc_values["Large-Cap"] += (mkt_val * 0.5)
                mc_values["Mid-Cap"] += (mkt_val * 0.5)
            elif cat == "Equity":
                mc_values["Large-Cap"] += mkt_val # Fallback for other equity
            
            # Identify Direct vs Regular
            is_direct = "DIRECT" in name.upper()
            if is_direct: direct_value += mkt_val
            else: regular_value += mkt_val
            
            # AMC aggregation
            amc_values[amc_name] = amc_values.get(amc_name, 0.0) + mkt_val
            
            # Add to Allocation
            allocation_map[sub_cat] = allocation_map.get(sub_cat, 0.0) + mkt_val

            gain = mkt_val - scheme_cost
            ret_pct = 0.0
            if scheme_cost > 0:
                ret_pct = round((gain / scheme_cost) * 100, 2)
            
            # --- Fixed Income Logic ---
            if cat == "Fixed Income":
                fi_mkt += mkt_val
                fi_cost += scheme_cost
                fi_amc_values[amc_name] = fi_amc_values.get(amc_name, 0.0) + mkt_val
                fi_alloc_map[sub_cat] = fi_alloc_map.get(sub_cat, 0.0) + mkt_val
                
                # Heuristic Credit Quality
                u_sub = sub_cat.upper()
                if any(x in u_sub for x in ["LIQUID", "GILT", "OVERNIGHT", "MONEY MARKET", "TREASURY"]):
                    credit_values["AAA"] += mkt_val
                elif any(x in u_sub for x in ["CREDIT RISK", "MEDIUM DURATION", "DYNAMIC"]):
                    credit_values["AA"] += mkt_val
                else:
                    credit_values["AAA"] += mkt_val # Default safe
                
            # --- Performance Simulation ---
            # Simulate benchmark for this fund
            bm_ret = 12.0 if cat == "Equity" else 7.0 
            under_val = bm_ret - ret_pct
            perf_records_1y.append(under_val) # Placeholder for 1Y
            perf_records_3y.append(under_val + 1.2) # Placeholder for 3Y
            
            # Scheme XIRR
            s_xirr = 0.0
            s_bm_xirr = 0.0
            if scheme_cashflows:
                # 1. Fund XIRR
                s_flows = scheme_cashflows + [(datetime.now(), mkt_val)]
                s_xirr = calculate_xirr([x[0] for x in s_flows], [x[1] for x in s_flows])
                
                # 2. Benchmark XIRR equivalent
                # We need to simulate: if we invested the same amounts in Benchmark on same days, what would be value now?
                # Benchmark units accumulated map to `scheme_benchmark_units` locally
                # But since we didn't track local benchmark units per scheme in the loop, let's do a quick pass or approximation
                # Better: Use the cashflows and benchmark history directly here
                
                s_bm_units = 0.0
                for dt, amt in scheme_cashflows: 
                    # amt is negative for investment (outflow from pocket), positive for redemption (inflow)
                    # For unit calculation, Investment(neg amount) -> Buy units(pos). Redemption(pos amount) -> Sell units(neg)
                    # So: units_bought = (-amt) / nav.  => Since amt is -ve for buy, -(-ve) = +ve. Correct.
                    d_str = dt.strftime("%Y-%m-%d")
                    b_nav_d = benchmark_history.get(d_str)
                    if not b_nav_d and benchmark_history:
                        # Fallback to closest or first/last if missing (simple fallback: use 10000 or skip)
                        b_nav_d = list(benchmark_history.values())[0] # Very rough fallback
                    
                    if b_nav_d:
                         # Cashflow amt: -1000 (Invest). Units = 1000 / nav.
                         # Cashflow amt: +500 (Redeem). Units = -500 / nav.
                         # So units_change = -amt / nav
                         s_bm_units += (-amt) / b_nav_d
                
                # Current Val of Benchmark = s_bm_units * current_benchmark_nav
                s_bm_val = s_bm_units * bench_nav_now
                
                s_bm_flows = scheme_cashflows + [(datetime.now(), s_bm_val)]
                s_bm_xirr = calculate_xirr([x[0] for x in s_bm_flows], [x[1] for x in s_bm_flows])

            h_obj = Holding(
                fund_family=amc_name,
                folio=folio_num,
                scheme_name=name,
                amfi=amfi,
                units=units,
                nav=nav,
                market_value=mkt_val,
                cost_value=scheme_cost,
                category=cat,
                sub_category=sub_cat,
                gain_loss=round(gain, 2),
                return_pct=ret_pct,
                xirr=round(s_xirr, 2),
                benchmark_xirr=round(s_bm_xirr, 2),
                date_of_entry=date_of_entry,
                style_category="Direct" if is_direct else "Regular"
            )
            holdings.append(h_obj)
            if cat == "Fixed Income":
                fi_holdings_objs.append(h_obj)
            
            total_mkt += mkt_val
            total_cost += scheme_cost

    # Summary Calculations
    log_debug(f"Totals: Mkt={total_mkt:.2f}, Cost={total_cost:.2f}, Holdings={len(holdings)}, XIRR Txns={len(portfolio_cashflows)}")
    stmt_period = cas_data.get("statement_period", {})
    date_str = stmt_period.get("to") or datetime.now().strftime("%d-%b-%Y")
    now_dt = datetime.now()
    
    # 1. Portfolio XIRR
    pf_xirr_flows = portfolio_cashflows + [(now_dt, total_mkt)]
    log_debug(f"Calculating Portfolio XIRR...")
    pf_xirr = calculate_xirr([x[0] for x in pf_xirr_flows], [x[1] for x in pf_xirr_flows])
    log_debug(f"Portfolio XIRR: {pf_xirr:.2f}%")
    
    # 2. Benchmark Stats
    # bench_nav_now calculated above
    benchmark_val_now = benchmark_units * bench_nav_now
    bm_xirr_flows = portfolio_cashflows + [(now_dt, benchmark_val_now)]
    log_debug(f"Calculating Benchmark XIRR...")
    bm_xirr = calculate_xirr([x[0] for x in bm_xirr_flows], [x[1] for x in bm_xirr_flows])
    log_debug(f"Benchmark XIRR: {bm_xirr:.2f}%")

    # 3. Asset Allocation
    alloc_list = [AssetAllocation(category=k, value=round(v, 2), allocation_pct=round((v/total_mkt)*100, 1)) 
                  for k, v in allocation_map.items() if total_mkt > 0]
    alloc_list.sort(key=lambda x: x.value, reverse=True)

    # 4. Concentration Data
    top_5_schemes = sorted(holdings, key=lambda x: x.market_value, reverse=True)[:5]
    top_funds = [TopItem(name=s.scheme_name, value=round(s.market_value, 2), allocation_pct=round(s.market_value/total_mkt*100, 1)) for s in top_5_schemes]
    
    sorted_amcs = sorted(amc_values.items(), key=lambda x: x[1], reverse=True)[:5]
    top_amcs = [TopItem(name=k, value=round(v, 2), allocation_pct=round(v/total_mkt*100, 1)) for k, v in sorted_amcs]
    
    fund_count = len(schemes_seen)
    amc_count = len(amcs)
    
    # 5. Cost Data
    annual_cost_est = (direct_value * 0.0075 + regular_value * 0.015) 
    total_cost_paid_est = annual_cost_est * 5 # simplistic estimate for years since 2015-ish
    
    # 6. Market Cap
    total_equity_val = sum(mc_values.values()) or 1.0 # avoid div by zero
    mc_alloc = MarketCapAllocation(
        large_cap=round(mc_values["Large-Cap"]/total_equity_val*100, 1),
        mid_cap=round(mc_values["Mid-Cap"]/total_equity_val*100, 1),
        small_cap=round(mc_values["Small-Cap"]/total_equity_val*100, 1)
    )

    # 7. Fixed Income Summary
    fi_top_funds = sorted(fi_holdings_objs, key=lambda x: x.market_value, reverse=True)[:5]
    fi_top_amcs_sorted = sorted(fi_amc_values.items(), key=lambda x: x[1], reverse=True)[:5]
    
    fi_alloc_list = [AssetAllocation(category=k, value=round(v, 2), allocation_pct=round((v/fi_mkt)*100, 1)) 
                     for k, v in fi_alloc_map.items() if fi_mkt > 0]
    
    fi_data = None
    if fi_mkt > 0:
        fi_data = FixedIncomeData(
            invested_value=round(fi_cost, 2),
            current_value=round(fi_mkt, 2),
            irr=7.2, # Placeholder: In a real app we'd filter cashflows for FI funds only
            ytm=7.6,
            credit_quality=CreditQuality(
                aaa_pct=round(credit_values["AAA"]/fi_mkt*100, 1),
                aa_pct=round(credit_values["AA"]/fi_mkt*100, 1),
                below_aa_pct=round(credit_values["Below AA"]/fi_mkt*100, 1)
            ),
            top_funds=[TopItem(name=s.scheme_name, value=round(s.market_value, 2), allocation_pct=round(s.market_value/fi_mkt*100, 1)) for s in fi_top_funds],
            top_amcs=[TopItem(name=k, value=round(v, 2), allocation_pct=round(v/fi_mkt*100, 1)) for k, v in fi_top_amcs_sorted],
            category_allocation=fi_alloc_list
        )

    # 8. Performance Summary
    def calc_perf_metric(records):
        total = len(records)
        if total == 0: return PerfMetric(underperforming_pct=0, upto_3_pct=0, more_than_3_pct=0)
        under = [r for r in records if r > 0]
        upto_3 = [r for r in records if 0 < r <= 3]
        more_3 = [r for r in records if r > 3]
        return PerfMetric(
            underperforming_pct=round(len(under)/total*100, 1),
            upto_3_pct=round(len(upto_3)/total*100, 1),
            more_than_3_pct=round(len(more_3)/total*100, 1)
        )
    
    perf_summary = PerformanceSummary(
        one_year=calc_perf_metric(perf_records_1y),
        three_year=calc_perf_metric(perf_records_3y)
    )

    # 9. Guidelines and Recommendations
    equity_pct_actual = round(total_equity_val / total_mkt * 100, 1) if total_mkt > 0 else 0
    fi_pct_actual = round(fi_mkt / total_mkt * 100, 1) if total_mkt > 0 else 0
    others_pct_actual = round(max(0, 100 - equity_pct_actual - fi_pct_actual), 1) if total_mkt > 0 else 0

    guidelines = GuidelinesData(
        investment_guidelines=RecommendedPortfolio(
            asset_allocation=[
                GuidelineItem(label="Equity", current=equity_pct_actual, recommended=80.0),
                GuidelineItem(label="Fixed Income", current=fi_pct_actual, recommended=20.0),
                GuidelineItem(label="Others", current=others_pct_actual, recommended=0.0)
            ],
            equity_mc=[
                GuidelineItem(label="Large Cap", current=mc_alloc.large_cap, recommended=67.0),
                GuidelineItem(label="Mid Cap", current=mc_alloc.mid_cap, recommended=20.0),
                GuidelineItem(label="Small Cap", current=mc_alloc.small_cap, recommended=13.0)
            ],
            fi_metrics=[
                GuidelineItem(label="Net YTM", current=7.6, recommended=11.06),
                GuidelineItem(label="Average Maturity (Years)", current=4.9, recommended=2.27)
            ]
        ),
        equity_indicative=[
            EquityIndicative(category="Large Cap - Index", allocation=25.0),
            EquityIndicative(category="Focused", allocation=20.0),
            EquityIndicative(category="Contra", allocation=17.0),
            EquityIndicative(category="Flexi Cap", allocation=15.0),
            EquityIndicative(category="Mid Cap", allocation=12.5),
            EquityIndicative(category="Small Cap", allocation=10.0),
            EquityIndicative(category="Liquid", allocation=0.5)
        ],
        fi_indicative=[
            FixedIncomeIndicative(issuer="Diversified Book", pqrs=4.51, ytm=10.85, tenure=3.70, allocation=20.0),
            FixedIncomeIndicative(issuer="Micro Finance/PTC", pqrs=4.09, ytm=11.9, tenure=1.4, allocation=20.0),
            FixedIncomeIndicative(issuer="MSME/Personal", pqrs=3.80, ytm=11.2, tenure=1.65, allocation=15.0),
            FixedIncomeIndicative(issuer="SME Finance/Education", pqrs=4.13, ytm=10.7, tenure=1.65, allocation=15.0),
            FixedIncomeIndicative(issuer="Education Finance", pqrs=3.80, ytm=10.5, tenure=2.48, allocation=10.0),
            FixedIncomeIndicative(issuer="Enterprise Book/Supply Chain", pqrs=4.13, ytm=10.5, tenure=1.1, allocation=5.0),
            FixedIncomeIndicative(issuer="Invits", ytm=11.0, tenure=3.0, allocation=15.0)
        ]
    )

    # Overlap: equity schemes only, real holdings from AMFI or HOLDINGS_API_URL
    overlap_data = None
    all_categories = [h.category for h in holdings]
    from collections import Counter
    log_debug(f"[Analysis Overlap Debug] All categories found: {Counter(all_categories)}")
    
    equity_holdings = [h for h in holdings if h.category == "Equity"]
    log_debug(f"[Analysis Overlap Debug] Found {len(equity_holdings)} equity holdings.")
    
    if len(equity_holdings) >= 2:
        seen = set()
        scheme_order: List[str] = []
        scheme_names_map: Dict[str, str] = {}
        for h in equity_holdings:
            key = (h.amfi or "").strip() or h.scheme_name
            if not key or key in seen:
                continue
            seen.add(key)
            scheme_order.append(key)
            scheme_names_map[key] = h.scheme_name
            
        log_debug(f"[Analysis Overlap Debug] Unique equity schemes to check: {scheme_order}")
        
        if scheme_order:
            log_debug(f"Calling get_holdings_for_schemes for {len(scheme_order)} schemes")
            h_start = datetime.now()
            try:
                holdings_by_scheme = await get_holdings_for_schemes(
                    scheme_order,
                    scheme_names=scheme_names_map,
                )
                log_debug(f"Holdings fetched successfully. Result type: {type(holdings_by_scheme)}, keys: {len(holdings_by_scheme)}")
            except Exception as e:
                log_debug(f"ERROR in get_holdings_for_schemes: {type(e).__name__}: {str(e)}")
                import traceback
                log_debug(f"Traceback: {traceback.format_exc()}")
                holdings_by_scheme = {}
            
            log_debug(f"Holdings fetched. Saving AMFI cache...")
            # Flush AMFI cache
            from app.holdings import save_amfi_cache_async
            await save_amfi_cache_async()
            
            log_debug(f"get_holdings_for_schemes took {(datetime.now() - h_start).total_seconds():.2f}s. Computing overlap...")
            
            schemes_with_holdings = [s for s in scheme_order if holdings_by_scheme.get(s)]
            log_debug(f"[Analysis Overlap Debug] Schemes with non-empty holdings: {len(schemes_with_holdings)}")
            
            if len(schemes_with_holdings) >= 2:
                _, matrix = compute_overlap_matrix(holdings_by_scheme, schemes_with_holdings)
                log_debug(f"[Analysis Overlap Debug] Overlap matrix computed.")
                overlap_data = OverlapData(
                    fund_codes=schemes_with_holdings,
                    fund_names=[scheme_names_map.get(c, c) for c in schemes_with_holdings],
                    matrix=matrix,
                )
            else:
                log_debug(f"[Analysis Overlap Debug] Skipping overlap matrix: only {len(schemes_with_holdings)} schemes had matching holdings data.")
        else:
            log_debug("[Analysis Overlap Debug] Skipping overlap: scheme_order is empty.")
    else:
        log_debug(f"[Analysis Overlap Debug] Skipping overlap: need at least 2 equity funds, found {len(equity_holdings)}.")

    # Extract investor information from cas_data
    investor_info = None
    if cas_data:
        # casparser returns investor_info object with: name, email, mobile, address
        # PAN is typically at folio level, not in investor_info
        investor_obj = cas_data.get("investor_info") or cas_data.get("investor") or {}
        investor_data = {}
        
        if isinstance(investor_obj, dict):
            # Extract from investor_info object (casparser structure)
            investor_data = {
                "name": investor_obj.get("name") or investor_obj.get("investor_name") or investor_obj.get("full_name"),
                "email": investor_obj.get("email") or investor_obj.get("email_id") or investor_obj.get("email_address"),
                "address": investor_obj.get("address") or investor_obj.get("investor_address") or investor_obj.get("full_address"),
                "phone": investor_obj.get("mobile") or investor_obj.get("phone") or investor_obj.get("phone_number") or investor_obj.get("mobile_number"),
            }
        
        # Also check top-level fields (fallback)
        if not investor_data.get("name"):
            investor_data["name"] = cas_data.get("investor_name") or cas_data.get("name") or cas_data.get("investor") or cas_data.get("full_name")
        if not investor_data.get("email"):
            investor_data["email"] = cas_data.get("email") or cas_data.get("email_id") or cas_data.get("email_address")
        if not investor_data.get("address"):
            investor_data["address"] = cas_data.get("address") or cas_data.get("investor_address") or cas_data.get("full_address")
        if not investor_data.get("phone"):
            investor_data["phone"] = cas_data.get("mobile") or cas_data.get("phone") or cas_data.get("phone_number") or cas_data.get("mobile_number")
        
        # Extract PAN from folios if not found in investor_info
        # PAN is typically at folio level in casparser structure
        if not investor_data.get("pan"):
            # Check top-level first
            investor_data["pan"] = cas_data.get("pan") or cas_data.get("pan_number") or cas_data.get("pan_no") or cas_data.get("PAN")
            
            # If still not found, check folios
            if not investor_data.get("pan"):
                folios = cas_data.get("folios") or []
                for folio in folios:
                    if isinstance(folio, dict):
                        pan = folio.get("PAN") or folio.get("pan") or folio.get("pan_number") or folio.get("pan_no")
                        if pan:
                            investor_data["pan"] = pan
                            break
        
        # Only create if at least one field has a value
        if any(v for v in investor_data.values() if v):
            investor_info = InvestorInfo(**{k: v for k, v in investor_data.items() if v})
            log_debug(f"Extracted investor info: {investor_info}")

    summary = AnalysisSummary(
        total_market_value=round(total_mkt, 2),
        total_cost_value=round(total_cost, 2),
        total_gain_loss=round(total_mkt - total_cost, 2),
        portfolio_return=round((total_mkt - total_cost)/total_cost * 100, 2) if total_cost > 0 else 0.0,
        portfolio_xirr=round(pf_xirr, 2),
        benchmark_xirr=round(bm_xirr, 2),
        benchmark_gains=round(benchmark_val_now - total_cost, 2),
        holdings_count=len(holdings),
        statement_date=date_str,
        asset_allocation=alloc_list,
        market_cap=mc_alloc,
        concentration=ConcentrationData(
            fund_count=fund_count,
            fund_status="Over-diversified" if fund_count > 15 else "Healthy",
            amc_count=amc_count,
            amc_status="Over-diversified" if amc_count > 10 else "Healthy",
            top_funds=top_funds,
            top_amcs=top_amcs
        ),
        cost=CostData(
            direct_pct=round(direct_value/total_mkt*100, 1) if total_mkt > 0 else 0,
            regular_pct=round(regular_value/total_mkt*100, 1) if total_mkt > 0 else 0,
            portfolio_cost_pct=round((annual_cost_est/total_mkt*100), 2) if total_mkt > 0 else 0,
            annual_cost=round(annual_cost_est, 2),
            total_cost_paid=round(total_cost_paid_est, 2),
            savings_value=round(total_cost_paid_est * 0.6, 2)
        ),
        equity_value=round(total_equity_val, 2),
        equity_pct=equity_pct_actual,
        fixed_income=fi_data,
        performance_summary=perf_summary,
        guidelines=guidelines,
        overlap=overlap_data,
        investor_info=investor_info,
    )
    
    return AnalysisResponse(success=True, holdings=holdings, summary=summary)

def parse_cas_data(data):
    # Fallback legacy parser for direct list input (unlikely to be used if called from UI properly)
    # Ideally should map to new structure too, but for now returned empty or basic
    return AnalysisResponse(success=False, error="Legacy list format not supported in new analyzer")

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze(file: UploadFile = File(...), password: str = Form("")):
    try:
        filename = file.filename.lower()
        content = await file.read()
        
        if filename.endswith(".pdf"):
            # Create a bytes buffer for PDF parsing
            pdf_buffer = io.BytesIO(content)
            parse_result = parse_with_casparser(pdf_buffer, password=password)
            
            if not parse_result["success"]:
                return AnalysisResponse(success=False, error=parse_result["error"])
            
            # Map the parsed data to our analysis structure
            return await map_casparser_to_analysis(parse_result["data"])
            
        elif filename.endswith(".json"):
            json_data = json.loads(content)
            
            # Check format - handle dictionary with 'folios' or list
            if isinstance(json_data, dict):
                if "folios" in json_data:
                    return await map_casparser_to_analysis(json_data)
            
            if isinstance(json_data, list):
                 return parse_cas_data(json_data)
                 
            return AnalysisResponse(success=False, error="Unknown JSON format")
        else:
            return AnalysisResponse(success=False, error="Unsupported file type. Please upload a PDF or JSON.")
            
    except Exception as e:
        return AnalysisResponse(success=False, error=str(e))

# Import the new parser
from app.cas_parser import parse_with_casparser, convert_to_excel
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from fastapi import Form

@app.post("/api/parse_pdf")
async def parse_pdf(
    file: UploadFile = File(...), 
    password: str = Form(""),
    output_format: str = Form("json")
):
    try:
        req_start = datetime.now()
        log_debug(f"Received parse request for {file.filename}")
        
        content = await file.read()
        read_time = (datetime.now() - req_start).total_seconds()
        log_debug(f"File read completed in {read_time:.2f}s (Size: {len(content)} bytes)")
        
        # Create a bytes buffer
        pdf_buffer = io.BytesIO(content)
        
        # Parse
        parse_start = datetime.now()
        result = parse_with_casparser(pdf_buffer, password=password)
        parse_time = (datetime.now() - parse_start).total_seconds()
        log_debug(f"cas_parser parsing took {parse_time:.2f}s")
        
        if not result["success"]:
            log_debug(f"Parsing failed: {result['error']}")
            return JSONResponse(status_code=400, content={"error": result["error"]})
            
        data = result["data"]
        
        if output_format.lower() == "excel":
            excel_start = datetime.now()
            excel_buffer = convert_to_excel(data)
            log_debug(f"Excel conversion took {(datetime.now() - excel_start).total_seconds():.2f}s")
            return StreamingResponse(
                excel_buffer, 
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment; filename=portfolio.xlsx"}
            )
        else:
            log_debug(f"Total parse request time: {(datetime.now() - req_start).total_seconds():.2f}s")
            return JSONResponse(content=data)
            
    except Exception as e:
        log_debug(f"Critical error in parse_pdf: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.get("/test")
async def test_api():
    return {"message": "API is alive"}


@app.get("/")
async def home():
    """Serve the Portfolio Overview UI as the home page."""
    return FileResponse("static/index.html")


app.mount("/", StaticFiles(directory="static", html=True), name="static")
