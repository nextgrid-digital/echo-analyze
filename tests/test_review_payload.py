import unittest

from app.Code.ai.review_ai import build_client_review_payload, compute_portfolio_health_status
from app.Code.investment_events import extract_investment_events

SAMPLE_ANALYSIS = {
    "success": True,
    "holdings": [],
    "summary": {
        "total_market_value": 1500000,
        "total_cost_value": 1200000,
        "total_gain_loss": 300000,
        "portfolio_return": 25,
        "portfolio_xirr": 12.5,
        "benchmark_xirr": 10.0,
        "holdings_count": 8,
        "statement_date": "2025-03-31",
        "asset_allocation": [{"category": "Equity", "allocation_pct": 70}],
        "concentration": {
            "fund_count": 8,
            "fund_status": "Healthy",
            "amc_count": 4,
            "amc_status": "Healthy",
            "top_funds": [],
            "top_amcs": [],
        },
        "cost": {
            "direct_pct": 80,
            "regular_pct": 20,
            "portfolio_cost_pct": 1.2,
            "annual_cost": 1000,
            "total_cost_paid": 5000,
            "savings_value": 2000,
        },
        "market_cap": {"large_cap_pct": 60, "mid_cap_pct": 25, "small_cap_pct": 15},
        "equity_value": 1050000,
        "equity_pct": 70,
        "valuation_mode": "live_nav",
        "statement_market_value": 1480000,
        "live_nav_delta_value": 20000,
        "equity_cost_value": 900000,
        "equity_gain_loss": 150000,
        "fixed_income_cost_value": 300000,
        "fixed_income_gain_loss": 150000,
        "benchmark_gains": 50000,
        "tax": {
            "short_term_gains": 0,
            "long_term_gains": 0,
            "tax_free_gains": 0,
            "taxable_gains": 0,
            "estimated_tax_liability": 0,
            "equity_stcg_rate_pct": 15,
            "equity_ltcg_rate_pct": 10,
            "equity_ltcg_exemption": 125000,
        },
        "warnings": [],
        "data_coverage": {
            "benchmark_date_match_pct": 90,
            "overlap_source": "none",
            "overlap_available_funds": 0,
        },
        "performance_summary": {
            "one_year": {
                "comparable_pct": 60,
                "underperforming_pct": 5,
                "upto_3_pct": 10,
                "more_than_3_pct": 5,
            },
            "three_year": {
                "comparable_pct": 50,
                "underperforming_pct": 8,
                "upto_3_pct": 12,
                "more_than_3_pct": 6,
            },
        },
        "investor_info": {"name": "Test Client"},
    },
}


class ReviewPayloadTests(unittest.TestCase):
    def test_build_client_review_payload_excludes_sensitive_fields(self):
        payload = build_client_review_payload(SAMPLE_ANALYSIS, [], "Advisor")
        serialized = str(payload).lower()
        self.assertNotIn("overlap", serialized)
        self.assertNotIn("sharpe", serialized)
        self.assertIn(payload["health_status"], {"excellent", "good", "needs_attention"})

    def test_compute_portfolio_health_status(self):
        metrics = {"underperforming_pct": 5, "fund_count": 8, "equity_gap": 2, "xirr_delta": 2.5}
        self.assertEqual(compute_portfolio_health_status(metrics), "excellent")


class InvestmentEventTests(unittest.TestCase):
    def test_extract_investment_events(self):
        cas = {
            "folios": [
                {
                    "schemes": [
                        {
                            "scheme": "Test Fund",
                            "transactions": [
                                {
                                    "date": "2023-01-15",
                                    "description": "SIP Purchase",
                                    "type": "PURCHASE",
                                    "amount": 5000,
                                    "units": 10,
                                },
                                {
                                    "date": "2024-01-10",
                                    "description": "Redemption",
                                    "type": "REDEMPTION",
                                    "amount": 2000,
                                    "units": -4,
                                },
                            ],
                        }
                    ]
                }
            ]
        }
        events = extract_investment_events(cas)
        self.assertEqual(len(events), 2)
        self.assertEqual(events[0].type, "sip")
        self.assertEqual(events[1].type, "redemption")


if __name__ == "__main__":
    unittest.main()
