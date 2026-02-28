import json
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.Code.main import (
    _benchmark_nav_for_date,
    _current_holding_entry_date,
    _prepare_benchmark_history,
    _resolve_benchmark_components,
    app,
    map_casparser_to_analysis,
)


class TestSecurityAccuracy(unittest.IsolatedAsyncioTestCase):
    async def test_map_returns_new_summary_fields(self):
        fixture = Path("tests/fixtures/sample_cas.json")
        cas_data = json.loads(fixture.read_text(encoding="utf-8"))

        async def fake_live_nav(_):
            return 0.0

        async def fake_benchmark_history(_):
            return {
                "01-01-2023": 100.0,
                "02-01-2023": 100.2,
                "01-01-2024": 120.0,
            }

        with patch("app.Code.main.fetch_live_nav", new=fake_live_nav), patch(
            "app.Code.main.fetch_nav_history", new=fake_benchmark_history
        ), patch("app.Code.main.save_cache_async", new=AsyncMock()), patch(
            "app.Code.main.get_holdings_for_schemes", new=AsyncMock(return_value={})
        ), patch(
            "app.Code.main.save_amfi_cache_async", new=AsyncMock()
        ):
            response = await map_casparser_to_analysis(cas_data)

        self.assertTrue(response.success)
        self.assertIsNotNone(response.summary)
        summary = response.summary
        assert summary is not None
        self.assertEqual(summary.valuation_mode, "live_nav")
        self.assertAlmostEqual(summary.total_market_value, summary.statement_market_value, places=2)
        self.assertAlmostEqual(summary.live_nav_delta_value, 0.0, places=2)
        self.assertIsNotNone(summary.data_coverage)
        self.assertTrue(isinstance(summary.warnings, list))
        self.assertIsNotNone(summary.tax)
        self.assertEqual(summary.tax.equity_ltcg_rate_pct, 12.5)

    async def test_taxable_gains_apply_ltcg_exemption(self):
        cas_data = {
            "folios": [
                {
                    "amc": "Test AMC",
                    "folio": "1/1",
                    "schemes": [
                        {
                            "scheme": "Test Equity Fund",
                            "amfi": "100001",
                            "type": "EQUITY",
                            "close": 1000.0,
                            "valuation": {"nav": 200.0, "value": 200000.0, "cost": 100000.0},
                            "transactions": [{"date": "2020-01-01", "amount": 100000.0, "description": "Purchase"}],
                        }
                    ],
                }
            ],
            "statement_period": {"from": "01-Jan-2020", "to": "01-Jan-2026"},
        }

        async def fake_live_nav(_):
            return 0.0

        async def fake_benchmark_history(_):
            return {"01-01-2020": 100.0, "01-01-2026": 110.0}

        with patch("app.Code.main.fetch_live_nav", new=fake_live_nav), patch(
            "app.Code.main.fetch_nav_history", new=fake_benchmark_history
        ), patch("app.Code.main.save_cache_async", new=AsyncMock()), patch(
            "app.Code.main.get_holdings_for_schemes", new=AsyncMock(return_value={})
        ), patch(
            "app.Code.main.save_amfi_cache_async", new=AsyncMock()
        ):
            response = await map_casparser_to_analysis(cas_data)

        self.assertTrue(response.success)
        summary = response.summary
        assert summary is not None
        self.assertEqual(summary.tax.long_term_gains, 100000.0)
        self.assertEqual(summary.tax.short_term_gains, 0.0)
        self.assertEqual(summary.tax.taxable_gains, 0.0)
        self.assertEqual(summary.tax.estimated_tax_liability, 0.0)

    async def test_performance_uses_distinct_1y_and_3y_windows(self):
        cas_data = {
            "folios": [
                {
                    "amc": "Test AMC",
                    "folio": "1/1",
                    "schemes": [
                        {
                            "scheme": "Test Equity Fund",
                            "amfi": "100001",
                            "type": "EQUITY",
                            "close": 1000.0,
                            "valuation": {"nav": 130.0, "value": 130000.0, "cost": 100000.0},
                            "transactions": [{"date": "2023-01-01", "amount": 100000.0, "units": 1000.0, "description": "Purchase"}],
                        }
                    ],
                }
            ],
            "statement_period": {"from": "01-Jan-2023", "to": "01-Jan-2026"},
        }

        async def fake_live_nav(_):
            return 0.0

        async def fake_nav_history(code):
            if str(code) == "100001":
                return {
                    "01-01-2023": 100.0,
                    "25-02-2025": 120.0,
                    "25-02-2026": 130.0,
                }
            # Nifty 50 proxy used by equity benchmark mapping.
            return {
                "01-01-2023": 100.0,
                "25-02-2025": 110.0,
                "25-02-2026": 125.0,
            }

        with patch("app.Code.main.fetch_live_nav", new=fake_live_nav), patch(
            "app.Code.main.fetch_nav_history", new=fake_nav_history
        ), patch("app.Code.main.save_cache_async", new=AsyncMock()), patch(
            "app.Code.main.get_holdings_for_schemes", new=AsyncMock(return_value={})
        ), patch(
            "app.Code.main.save_amfi_cache_async", new=AsyncMock()
        ):
            response = await map_casparser_to_analysis(cas_data)

        self.assertTrue(response.success)
        summary = response.summary
        assert summary is not None and summary.performance_summary is not None
        one_year = summary.performance_summary.one_year.underperforming_pct
        three_year = summary.performance_summary.three_year.underperforming_pct
        self.assertNotEqual(one_year, three_year)
        # Current fund value exceeds benchmark value for same cashflow path.
        self.assertLess((response.holdings[0].missed_gains or 0.0), 0.0)

    async def test_tax_lot_losses_are_set_off_before_tax(self):
        cas_data = {
            "folios": [
                {
                    "amc": "Test AMC",
                    "folio": "1/1",
                    "schemes": [
                        {
                            "scheme": "Winning Equity Fund",
                            "amfi": "100001",
                            "type": "EQUITY",
                            "close": 1000.0,
                            "valuation": {"nav": 400.0, "value": 400000.0, "cost": 100000.0},
                            "transactions": [{"date": "2020-01-01", "amount": 100000.0, "units": 1000.0, "description": "Purchase"}],
                        },
                        {
                            "scheme": "Losing Equity Fund",
                            "amfi": "100002",
                            "type": "EQUITY",
                            "close": 1000.0,
                            "valuation": {"nav": 100.0, "value": 100000.0, "cost": 300000.0},
                            "transactions": [{"date": "2020-01-01", "amount": 300000.0, "units": 1000.0, "description": "Purchase"}],
                        },
                    ],
                }
            ],
            "statement_period": {"from": "01-Jan-2020", "to": "01-Jan-2026"},
        }

        async def fake_live_nav(_):
            return 0.0

        async def fake_nav_history(_):
            return {"01-01-2020": 100.0, "25-02-2026": 120.0}

        with patch("app.Code.main.fetch_live_nav", new=fake_live_nav), patch(
            "app.Code.main.fetch_nav_history", new=fake_nav_history
        ), patch("app.Code.main.save_cache_async", new=AsyncMock()), patch(
            "app.Code.main.get_holdings_for_schemes", new=AsyncMock(return_value={})
        ), patch(
            "app.Code.main.save_amfi_cache_async", new=AsyncMock()
        ):
            response = await map_casparser_to_analysis(cas_data)

        self.assertTrue(response.success)
        summary = response.summary
        assert summary is not None
        self.assertEqual(summary.tax.long_term_gains, 100000.0)
        self.assertEqual(summary.tax.taxable_gains, 0.0)
        self.assertEqual(summary.tax.estimated_tax_liability, 0.0)

    async def test_overlap_absent_when_real_holdings_unavailable(self):
        fixture = Path("tests/fixtures/sample_cas.json")
        cas_data = json.loads(fixture.read_text(encoding="utf-8"))

        async def fake_live_nav(_):
            return 0.0

        async def fake_benchmark_history(_):
            return {"01-01-2023": 100.0, "01-01-2024": 120.0}

        with patch("app.Code.main.fetch_live_nav", new=fake_live_nav), patch(
            "app.Code.main.fetch_nav_history", new=fake_benchmark_history
        ), patch("app.Code.main.save_cache_async", new=AsyncMock()), patch(
            "app.Code.main.get_holdings_for_schemes", new=AsyncMock(return_value={})
        ), patch(
            "app.Code.main.save_amfi_cache_async", new=AsyncMock()
        ):
            response = await map_casparser_to_analysis(cas_data)

        self.assertIsNone(response.summary.overlap)
        self.assertEqual(response.summary.data_coverage.overlap_source, "none")

    def test_benchmark_fallback_uses_nearest_previous_date(self):
        history, keys, days, _ = _prepare_benchmark_history(
            {"01-01-2023": 100.0, "03-01-2023": 103.0}
        )
        nav, is_exact = _benchmark_nav_for_date("2023-01-02", history, keys, days)
        self.assertEqual(nav, 100.0)
        self.assertFalse(is_exact)

    def test_current_holding_entry_date_uses_remaining_units_after_full_exit(self):
        entry_dt = _current_holding_entry_date(
            50.0,
            [
                (datetime(2020, 1, 1), 100.0, 10000.0),
                (datetime(2021, 1, 1), -100.0, 12000.0),
                (datetime(2024, 1, 1), 50.0, 7000.0),
            ],
            datetime(2020, 1, 1),
        )
        self.assertEqual(entry_dt, datetime(2024, 1, 1))

    def test_benchmark_mapping_uses_more_specific_proxies(self):
        flexi = _resolve_benchmark_components(
            "Test Flexi Cap Fund - Direct Plan - Growth",
            "EQUITY",
            "Flexi Cap",
            "Equity",
        )
        self.assertEqual([c.code for c in flexi], ["152731"])

        nasdaq = _resolve_benchmark_components(
            "ICICI Prudential NASDAQ 100 Index Fund - Direct Plan - Growth",
            "EQUITY",
            "Index Fund",
            "Equity",
        )
        self.assertEqual([c.code for c in nasdaq], ["149219"])

        gold = _resolve_benchmark_components(
            "HDFC Gold ETF Fund of Fund - Direct Plan",
            "ETF",
            "Index Fund",
            "Equity",
        )
        self.assertEqual([c.code for c in gold], ["119132"])

    def test_sectoral_equity_funds_do_not_fall_back_to_broad_proxy(self):
        sectoral = _resolve_benchmark_components(
            "Test Banking and Financial Services Fund",
            "EQUITY",
            "Equity - Other",
            "Equity",
        )
        self.assertEqual(sectoral, [])

    async def test_analysis_uses_updated_benchmark_name_for_flexi_cap_funds(self):
        cas_data = {
            "folios": [
                {
                    "amc": "Test AMC",
                    "folio": "1/1",
                    "schemes": [
                        {
                            "scheme": "Test Flexi Cap Fund",
                            "amfi": "100001",
                            "type": "EQUITY",
                            "close": 100.0,
                            "valuation": {"nav": 120.0, "value": 12000.0, "cost": 10000.0},
                            "transactions": [{"date": "2024-01-01", "amount": 10000.0, "description": "Purchase"}],
                        }
                    ],
                }
            ],
            "statement_period": {"from": "01-Jan-2024", "to": "01-Jan-2025"},
        }

        async def fake_live_nav(_):
            return 0.0

        async def fake_nav_history(_):
            return {"01-01-2024": 100.0, "01-01-2025": 110.0}

        with patch("app.Code.main.fetch_live_nav", new=fake_live_nav), patch(
            "app.Code.main.fetch_nav_history", new=fake_nav_history
        ), patch("app.Code.main.save_cache_async", new=AsyncMock()), patch(
            "app.Code.main.get_holdings_for_schemes", new=AsyncMock(return_value={})
        ), patch(
            "app.Code.main.save_amfi_cache_async", new=AsyncMock()
        ):
            response = await map_casparser_to_analysis(cas_data)

        self.assertTrue(response.success)
        self.assertEqual(response.holdings[0].benchmark_name, "Nifty 500 TRI proxy")

    async def test_performance_summary_exposes_comparable_coverage(self):
        cas_data = {
            "folios": [
                {
                    "amc": "Test AMC",
                    "folio": "1/1",
                    "schemes": [
                        {
                            "scheme": "Test Flexi Cap Fund",
                            "amfi": "100001",
                            "type": "EQUITY",
                            "close": 1000.0,
                            "valuation": {"nav": 100.0, "value": 100000.0, "cost": 90000.0},
                            "transactions": [{"date": "2024-01-01", "amount": 90000.0, "units": 1000.0, "description": "Purchase"}],
                        },
                        {
                            "scheme": "Test Banking and Financial Services Fund",
                            "amfi": "100002",
                            "type": "EQUITY",
                            "close": 1000.0,
                            "valuation": {"nav": 100.0, "value": 100000.0, "cost": 90000.0},
                            "transactions": [{"date": "2024-01-01", "amount": 90000.0, "units": 1000.0, "description": "Purchase"}],
                        },
                    ],
                }
            ],
            "statement_period": {"from": "01-Jan-2024", "to": "01-Jan-2026"},
        }

        async def fake_live_nav(_):
            return 0.0

        async def fake_nav_history(code):
            if str(code) in {"100001", "100002"}:
                return {
                    "01-01-2024": 90.0,
                    "01-01-2025": 95.0,
                    "01-01-2026": 100.0,
                }
            return {
                "01-01-2024": 100.0,
                "01-01-2025": 105.0,
                "01-01-2026": 110.0,
            }

        with patch("app.Code.main.fetch_live_nav", new=fake_live_nav), patch(
            "app.Code.main.fetch_nav_history", new=fake_nav_history
        ), patch("app.Code.main.save_cache_async", new=AsyncMock()), patch(
            "app.Code.main.get_holdings_for_schemes", new=AsyncMock(return_value={})
        ), patch(
            "app.Code.main.save_amfi_cache_async", new=AsyncMock()
        ):
            response = await map_casparser_to_analysis(cas_data)

        self.assertTrue(response.success)
        summary = response.summary
        assert summary is not None and summary.performance_summary is not None
        self.assertEqual(summary.performance_summary.one_year.comparable_pct, 50.0)

    async def test_analysis_uses_remaining_holding_entry_date_and_parses_statement_cost(self):
        cas_data = {
            "folios": [
                {
                    "amc": "Test AMC",
                    "folio": "1/1",
                    "schemes": [
                        {
                            "scheme": "Test Flexi Cap Fund",
                            "amfi": "100001",
                            "type": "EQUITY",
                            "close": 50.0,
                            "valuation": {"nav": 140.0, "value": 7000.0, "cost": "7,000.0"},
                            "transactions": [
                                {"date": "2020-01-01", "amount": 10000.0, "units": 100.0, "description": "Purchase"},
                                {"date": "2021-01-01", "amount": 12000.0, "units": -100.0, "description": "Redemption"},
                                {"date": "2024-01-01", "amount": 7000.0, "units": 50.0, "description": "Purchase"},
                            ],
                        }
                    ],
                }
            ],
            "statement_period": {"from": "01-Jan-2020", "to": "01-Jan-2026"},
        }

        async def fake_live_nav(_):
            return 0.0

        async def fake_nav_history(_):
            return {
                "01-01-2020": 100.0,
                "01-01-2021": 110.0,
                "01-01-2024": 120.0,
                "01-01-2026": 130.0,
            }

        with patch("app.Code.main.fetch_live_nav", new=fake_live_nav), patch(
            "app.Code.main.fetch_nav_history", new=fake_nav_history
        ), patch("app.Code.main.save_cache_async", new=AsyncMock()), patch(
            "app.Code.main.get_holdings_for_schemes", new=AsyncMock(return_value={})
        ), patch(
            "app.Code.main.save_amfi_cache_async", new=AsyncMock()
        ):
            response = await map_casparser_to_analysis(cas_data)

        self.assertTrue(response.success)
        holding = response.holdings[0]
        self.assertEqual(holding.date_of_entry, "2024-01-01")
        self.assertEqual(holding.cost_value, 7000.0)

    def test_eval_removed_from_holdings_cache_loader(self):
        holdings_source = Path("app/Code/holdings.py").read_text(encoding="utf-8")
        self.assertNotIn("eval(", holdings_source)

    async def test_debt_type_not_misclassified_by_growth_keyword(self):
        cas_data = {
            "folios": [
                {
                    "amc": "Test AMC",
                    "folio": "1/1",
                    "schemes": [
                        {
                            "scheme": "Test Equity Fund - Growth",
                            "amfi": "100001",
                            "type": "EQUITY",
                            "close": 10.0,
                            "valuation": {"nav": 100.0, "value": 1000.0, "cost": 800.0},
                            "transactions": [{"date": "2024-01-01", "amount": 800.0, "description": "Purchase"}],
                        },
                        {
                            "scheme": "Test Short Duration Fund - Growth",
                            "amfi": "100002",
                            "type": "DEBT",
                            "close": 20.0,
                            "valuation": {"nav": 100.0, "value": 2000.0, "cost": 1800.0},
                            "transactions": [{"date": "2024-01-01", "amount": 1800.0, "description": "Purchase"}],
                        },
                    ],
                }
            ],
            "statement_period": {"from": "01-Jan-2024", "to": "01-Jan-2025"},
        }

        async def fake_live_nav(_):
            return 0.0

        async def fake_benchmark_history(_):
            return {"01-01-2024": 100.0, "01-01-2025": 110.0}

        with patch("app.Code.main.fetch_live_nav", new=fake_live_nav), patch(
            "app.Code.main.fetch_nav_history", new=fake_benchmark_history
        ), patch("app.Code.main.save_cache_async", new=AsyncMock()), patch(
            "app.Code.main.get_holdings_for_schemes", new=AsyncMock(return_value={})
        ), patch(
            "app.Code.main.save_amfi_cache_async", new=AsyncMock()
        ):
            response = await map_casparser_to_analysis(cas_data)

        self.assertTrue(response.success)
        summary = response.summary
        assert summary is not None
        self.assertGreater(summary.equity_pct, 0.0)
        self.assertLess(summary.equity_pct, 100.0)
        self.assertIsNotNone(summary.fixed_income)
        assert summary.fixed_income is not None
        self.assertGreater(summary.fixed_income.current_value, 0.0)


class TestErrorSanitization(unittest.TestCase):
    def test_analyze_returns_sanitized_internal_error(self):
        client = TestClient(app)
        files = {"file": ("sample.json", b'{"folios": []}', "application/json")}
        with patch("app.Code.main.map_casparser_to_analysis", side_effect=RuntimeError("boom secret details")):
            response = client.post("/api/analyze", files=files, data={"password": ""})
        body = response.json()
        self.assertIn("Request ID", body.get("error", ""))
        self.assertNotIn("secret details", body.get("error", ""))

    def test_upload_signature_validation_rejects_invalid_pdf_bytes(self):
        client = TestClient(app)
        files = {"file": ("statement.pdf", b"not-a-real-pdf", "application/pdf")}
        response = client.post("/api/analyze", files=files, data={"password": ""})
        body = response.json()
        self.assertFalse(body.get("success", True))
        self.assertIn("invalid or corrupted", body.get("error", "").lower())
