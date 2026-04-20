import json
import os
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock, patch

from openpyxl import load_workbook
from fastapi.testclient import TestClient

import app.Code.holdings as holdings_module
from app.Code.auth import AuthContext, require_admin_user, require_authenticated_user
from app.Code.cas_parser import convert_to_excel, parse_with_casparser
from app.Code.env_loader import load_local_env
from app.Code.main import (
    _benchmark_nav_for_date,
    _current_holding_entry_date,
    _prepare_benchmark_history,
    _resolve_benchmark_components,
    app,
    map_casparser_to_analysis,
)
from app.Code.utils import calculate_xirr


async def _fake_auth_context():
    return AuthContext(
        user_id="user_test",
        session_id="sess_test",
        is_admin=True,
        claims={"sub": "user_test", "sid": "sess_test"},
    )


app.dependency_overrides[require_authenticated_user] = _fake_auth_context
app.dependency_overrides[require_admin_user] = _fake_auth_context


class _FakeResponse:
    def __init__(self, status_code: int, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload


class _FailingAsyncClient:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def get(self, url):
        raise RuntimeError("timeout")


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

    async def test_holding_benchmark_xirr_uses_current_position_window(self):
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
                            "valuation": {"nav": 180.0, "value": 180000.0, "cost": 150000.0},
                            "transactions": [
                                {"date": "2020-01-01", "amount": 100000.0, "units": 1000.0, "description": "Purchase"},
                                {"date": "2022-01-01", "amount": 110000.0, "units": -1000.0, "description": "Redemption"},
                                {"date": "2024-01-01", "amount": 150000.0, "units": 1000.0, "description": "Purchase"},
                            ],
                        }
                    ],
                }
            ],
            "statement_period": {"from": "01-Jan-2020", "to": "01-Jan-2026"},
        }

        as_of_str = datetime.now().strftime("%d-%m-%Y")

        async def fake_live_nav(_):
            return 0.0

        async def fake_nav_history(code):
            if str(code) == "100001":
                return {
                    "01-01-2020": 100.0,
                    "01-01-2022": 110.0,
                    "01-01-2024": 150.0,
                    as_of_str: 180.0,
                }
            return {
                "01-01-2020": 100.0,
                "01-01-2022": 110.0,
                "01-01-2024": 130.0,
                as_of_str: 140.0,
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
        self.assertIsNotNone(holding.benchmark_xirr)

        expected_benchmark_value = (150000.0 / 130.0) * 140.0
        expected_benchmark_xirr = calculate_xirr(
            [datetime(2024, 1, 1), datetime.now()],
            [-150000.0, expected_benchmark_value],
        )
        self.assertIsNotNone(expected_benchmark_xirr)
        self.assertAlmostEqual(holding.benchmark_xirr, round(expected_benchmark_xirr or 0.0, 2), places=1)

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

    async def test_partial_redemption_reconstructs_remaining_cost_basis(self):
        cas_data = {
            "folios": [
                {
                    "amc": "Test AMC",
                    "folio": "1/1",
                    "schemes": [
                        {
                            "scheme": "Partial Redemption Fund",
                            "amfi": "100001",
                            "type": "EQUITY",
                            "close": 50.0,
                            "valuation": {"nav": 100.0, "value": 5000.0},
                            "transactions": [
                                {"date": "2024-01-01", "amount": 10000.0, "units": 100.0, "description": "Purchase"},
                                {"date": "2025-01-01", "amount": 7500.0, "units": -50.0, "description": "Redemption"},
                            ],
                        }
                    ],
                }
            ],
            "statement_period": {"from": "01-Jan-2024", "to": "01-Jan-2026"},
        }

        async def fake_live_nav(_):
            return 0.0

        async def fake_nav_history(_):
            return {"01-01-2024": 100.0, "01-01-2025": 110.0, "01-01-2026": 100.0}

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
        self.assertEqual(holding.cost_value, 5000.0)
        self.assertEqual(holding.gain_loss, 0.0)
        self.assertEqual(response.summary.total_cost_value, 5000.0)

    async def test_analysis_parses_comma_formatted_numeric_strings(self):
        cas_data = {
            "folios": [
                {
                    "amc": "Test AMC",
                    "folio": "1/1",
                    "schemes": [
                        {
                            "scheme": "Formatted Numbers Fund",
                            "amfi": "100001",
                            "type": "EQUITY",
                            "close": "70",
                            "valuation": {"nav": "100.50", "value": "7,035.00", "cost": "6,000.00"},
                            "transactions": [{"date": "2024-01-01", "amount": "6,000.00", "units": "70", "description": "Purchase"}],
                        }
                    ],
                }
            ],
            "statement_period": {"from": "01-Jan-2024", "to": "01-Jan-2026"},
        }

        async def fake_live_nav(_):
            return 0.0

        async def fake_nav_history(_):
            return {"01-01-2024": 100.0, "01-01-2026": 100.5}

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
        self.assertEqual(holding.units, 70.0)
        self.assertEqual(holding.nav, 100.5)
        self.assertEqual(holding.market_value, 7035.0)
        self.assertEqual(response.summary.statement_market_value, 7035.0)

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
    def test_load_local_env_sets_missing_values_without_overwriting_existing_ones(self):
        temp_key = "TEST_ENV_LOADER_KEY"
        preserved_key = "TEST_ENV_LOADER_PRESERVE"
        original_temp = os.environ.pop(temp_key, None)
        original_preserved = os.environ.get(preserved_key)
        os.environ[preserved_key] = "already-set"

        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                env_path = Path(tmpdir) / ".env"
                env_path.write_text(
                    f"{temp_key}=loaded-value\n{preserved_key}=should-not-overwrite\n",
                    encoding="utf-8",
                )

                load_local_env(env_path)

            self.assertEqual(os.environ.get(temp_key), "loaded-value")
            self.assertEqual(os.environ.get(preserved_key), "already-set")
        finally:
            if original_temp is None:
                os.environ.pop(temp_key, None)
            else:
                os.environ[temp_key] = original_temp

            if original_preserved is None:
                os.environ.pop(preserved_key, None)
            else:
                os.environ[preserved_key] = original_preserved

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

    def test_analyze_rejects_invalid_cas_json_shape(self):
        client = TestClient(app)
        files = {"file": ("sample.json", b'{"folios":["oops"]}', "application/json")}
        response = client.post("/api/analyze", files=files, data={"password": ""})
        body = response.json()
        self.assertFalse(body.get("success", True))
        self.assertIn("invalid cas json format", body.get("error", "").lower())
        self.assertNotIn("request id", body.get("error", "").lower())

    def test_analyze_rejects_oversized_upload_before_processing(self):
        client = TestClient(app)
        with patch("app.Code.main.MAX_UPLOAD_BYTES", 10):
            files = {"file": ("sample.json", b'{"folios": []}', "application/json")}
            response = client.post("/api/analyze", files=files, data={"password": ""})
        body = response.json()
        self.assertFalse(body.get("success", True))
        self.assertIn("too large", body.get("error", "").lower())

    def test_spa_routes_return_index_html_locally(self):
        client = TestClient(app)

        admin_response = client.get("/admin")
        dashboard_response = client.get("/dashboard")

        self.assertEqual(admin_response.status_code, 200)
        self.assertEqual(dashboard_response.status_code, 200)
        self.assertIn("<!doctype html>", admin_response.text.lower())
        self.assertIn("<!doctype html>", dashboard_response.text.lower())


class TestParserAndHoldingsResilience(unittest.IsolatedAsyncioTestCase):
    def test_parse_with_casparser_path_input_skips_tempfile_creation(self):
        with patch("app.Code.cas_parser.read_cas_pdf", return_value={"folios": []}), patch(
            "tempfile.NamedTemporaryFile"
        ) as named_tmp:
            result = parse_with_casparser("dummy.pdf")

        self.assertTrue(result["success"])
        named_tmp.assert_not_called()

    async def test_groww_index_failure_does_not_disable_future_retries(self):
        old_loaded = holdings_module._groww_index_loaded
        old_by_code = holdings_module._groww_index_by_code
        old_entries = holdings_module._groww_index_entries
        try:
            holdings_module._groww_index_loaded = False
            holdings_module._groww_index_by_code = {}
            holdings_module._groww_index_entries = []

            class FailingClient:
                async def get(self, url):
                    return _FakeResponse(500, {})

            by_code, entries = await holdings_module._get_groww_index(FailingClient())
            self.assertEqual(by_code, {})
            self.assertEqual(entries, [])
            self.assertFalse(holdings_module._groww_index_loaded)
        finally:
            holdings_module._groww_index_loaded = old_loaded
            holdings_module._groww_index_by_code = old_by_code
            holdings_module._groww_index_entries = old_entries

    async def test_amfi_transient_failure_does_not_persist_failed_urls(self):
        old_cache = holdings_module._amfi_cache
        old_failed = holdings_module._failed_urls
        try:
            holdings_module._amfi_cache = {}
            holdings_module._failed_urls = set()

            with patch("app.Code.holdings.httpx.AsyncClient", _FailingAsyncClient), patch(
                "app.Code.holdings.save_amfi_cache_async", new=AsyncMock()
            ):
                result = await holdings_module._fetch_amfi_monthly_file()

            self.assertEqual(result, {})
            self.assertEqual(holdings_module._failed_urls, set())
        finally:
            holdings_module._amfi_cache = old_cache
            holdings_module._failed_urls = old_failed

    def test_convert_to_excel_escapes_formula_like_cells(self):
        payload = {
            "folios": [
                {
                    "amc": "=AMC",
                    "folio": "+12345",
                    "schemes": [
                        {
                            "scheme": "@Danger Fund",
                            "advisor": "-Advisor",
                            "transactions": [
                                {
                                    "date": "2024-01-01",
                                    "description": "=cmd",
                                    "amount": 1000,
                                    "units": 10,
                                    "nav": 100,
                                    "balance": 10,
                                    "type": "@TYPE",
                                }
                            ],
                        }
                    ],
                }
            ]
        }

        workbook_bytes = convert_to_excel(payload)
        workbook = load_workbook(workbook_bytes)
        sheet = workbook.active

        self.assertEqual(sheet["A2"].value, "'=AMC")
        self.assertEqual(sheet["B2"].value, "'+12345")
        self.assertEqual(sheet["C2"].value, "'@Danger Fund")
        self.assertEqual(sheet["D2"].value, "'-Advisor")
        self.assertEqual(sheet["F2"].value, "'=cmd")
        self.assertEqual(sheet["K2"].value, "'@TYPE")
