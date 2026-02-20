// Mirrors backend Pydantic models (app/main.py) — API contract

export interface Holding {
  fund_family: string
  folio: string
  scheme_name: string
  amfi?: string | null
  units: number
  nav: number
  market_value: number
  cost_value: number
  category: string
  sub_category: string
  gain_loss?: number
  return_pct?: number
  xirr?: number | null
  benchmark_xirr?: number | null
  date_of_entry?: string | null
  style_category?: string | null
}

export interface TopItem {
  name: string
  value: number
  allocation_pct: number
}

export interface ConcentrationData {
  fund_count: number
  recommended_funds?: string
  fund_status: string
  amc_count: number
  recommended_amcs?: string
  amc_status: string
  top_funds: TopItem[]
  top_amcs: TopItem[]
}

export interface CostData {
  direct_pct: number
  regular_pct: number
  portfolio_cost_pct: number
  annual_cost: number
  total_cost_paid: number
  savings_value: number
}

export interface MarketCapAllocation {
  large_cap: number
  mid_cap: number
  small_cap: number
}

export interface AssetAllocation {
  category: string
  value: number
  allocation_pct: number
}

export interface CreditQuality {
  aaa_pct: number
  aa_pct: number
  below_aa_pct: number
}

export interface FixedIncomeData {
  invested_value: number
  current_value: number
  irr: number
  ytm: number
  credit_quality: CreditQuality
  top_funds: TopItem[]
  top_amcs: TopItem[]
  category_allocation: AssetAllocation[]
}

export interface PerfMetric {
  underperforming_pct: number
  upto_3_pct: number
  more_than_3_pct: number
}

export interface PerformanceSummary {
  one_year: PerfMetric
  three_year: PerfMetric
}

export interface GuidelineItem {
  label: string
  current: number
  recommended: number
}

export interface RecommendedPortfolio {
  asset_allocation: GuidelineItem[]
  equity_mc: GuidelineItem[]
  fi_metrics: GuidelineItem[]
}

export interface EquityIndicative {
  category: string
  allocation: number
}

export interface FixedIncomeIndicative {
  issuer: string
  pqrs?: number | null
  ytm: number
  tenure: number
  allocation: number
}

export interface GuidelinesData {
  investment_guidelines: RecommendedPortfolio
  equity_indicative: EquityIndicative[]
  fi_indicative: FixedIncomeIndicative[]
}

export interface OverlapData {
  fund_codes: string[]
  fund_names: string[]
  matrix: number[][]
}

export interface InvestorInfo {
  name?: string | null
  pan?: string | null
  email?: string | null
  address?: string | null
  phone?: string | null
}

export interface AnalysisSummary {
  total_market_value: number
  total_cost_value: number
  total_gain_loss: number
  portfolio_return: number
  portfolio_xirr: number | null
  benchmark_xirr: number | null
  benchmark_gains: number
  holdings_count: number
  statement_date?: string | null
  asset_allocation: AssetAllocation[]
  concentration: ConcentrationData
  cost: CostData
  market_cap: MarketCapAllocation
  equity_value: number
  equity_pct: number
  fixed_income?: FixedIncomeData | null
  performance_summary?: PerformanceSummary | null
  guidelines?: GuidelinesData | null
  overlap?: OverlapData | null
  investor_info?: InvestorInfo | null
}

export interface AnalysisResponse {
  success: boolean
  holdings: Holding[]
  summary?: AnalysisSummary | null
  error?: string | null
}
