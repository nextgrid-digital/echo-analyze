import asyncio
import base64
import csv
import io
import json
import os
import socket
import tempfile
import time
import unittest
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
from openpyxl import load_workbook
from fastapi import HTTPException
from fastapi.testclient import TestClient

import app.Code.holdings as holdings_module
from casparser.enums import CASFileType, FileType, TransactionType
from casparser.parsers.utils import cas2csv, cas2csv_summary
from casparser.types import (
    CASData,
    Folio,
    InvestorInfo as CasInvestorInfo,
    Scheme,
    SchemeValuation,
    StatementPeriod,
    TransactionData,
)
from app.Code.analytics import _pseudonymize_identifier, _sanitize_file_name, _sanitize_text
from app.Code.cas_parser import convert_to_excel, parse_with_casparser
from app.Code.env_loader import load_local_env
from app.Code.pdfminer_hardening import (
    ORIGINAL_CMAP_LOADER_ATTR,
    harden_pdfminer_cmap_loading,
)
from app.Code.main import (
    _benchmark_nav_for_date,
    _current_holding_entry_date,
    _get_pdf_parse_executor,
    _get_pdf_parse_timeout_seconds,
    _normalize_amfi_code,
    _parse_amount,
    _parse_iso_date,
    _parse_pdf_upload_in_subprocess,
    _parse_pdf_upload,
    _prepare_benchmark_history,
    _resolve_benchmark_components,
    _validate_cas_json_shape,
    _validate_upload,
    app,
    map_casparser_to_analysis,
    MAX_CAS_TRANSACTIONS,
)
from app.Code.utils import calculate_xirr, fetch_live_nav, fetch_nav_history


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


class _UploadStub:
    def __init__(self, filename: str, content_type: str):
        self.filename = filename
        self.content_type = content_type


def _sleeping_pdf_parse_worker(_content, _password, _result_queue):
    time.sleep(5)


def _successful_pdf_parse_worker(_content, _password, result_sink):
    result_sink.send({"success": True, "data": {"folios": []}})
    result_sink.close()


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

    def test_technology_and_infrastructure_funds_use_sector_benchmarks(self):
        technology = _resolve_benchmark_components(
            "ICICI Prudential Technology Fund - Growth",
            "EQUITY",
            "Sectoral - Technology",
            "Equity",
        )
        self.assertEqual([c.code for c in technology], ["148763"])
        self.assertEqual(technology[0].label, "BSE Teck TRI proxy")

        infrastructure = _resolve_benchmark_components(
            "UTI Infrastructure Fund - Regular Plan",
            "EQUITY",
            "Thematic - Infrastructure",
            "Equity",
        )
        self.assertEqual([c.code for c in infrastructure], ["140102"])
        self.assertEqual(infrastructure[0].label, "Nifty Infrastructure TRI proxy")

    def test_business_cycle_equity_funds_use_bse_500_tri_proxy_only(self):
        business_cycle = _resolve_benchmark_components(
            "Motilal Oswal Business Cycle Fund - Direct Plan - Growth",
            "EQUITY",
            "Equity - Other",
            "Equity",
        )
        self.assertEqual([c.code for c in business_cycle], ["151728"])
        self.assertEqual(business_cycle[0].label, "BSE 500 TRI proxy")

        flexi = _resolve_benchmark_components(
            "Test Flexi Cap Fund - Direct Plan - Growth",
            "EQUITY",
            "Flexi Cap",
            "Equity",
        )
        self.assertEqual([c.code for c in flexi], ["152731"])

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

    async def test_analysis_labels_technology_and_infrastructure_benchmarks_without_proxy_history(self):
        cas_data = {
            "folios": [
                {
                    "amc": "ICICI Prudential Mutual Fund",
                    "folio": "20644404/27",
                    "schemes": [
                        {
                            "scheme": "ICICI Prudential Technology Fund - Growth",
                            "amfi": "100001",
                            "type": "EQUITY",
                            "close": 100.0,
                            "valuation": {"nav": 120.0, "value": 12000.0, "cost": 10000.0},
                            "transactions": [{"date": "2024-01-01", "amount": 10000.0, "description": "Purchase"}],
                        }
                    ],
                },
                {
                    "amc": "UTI Mutual Fund",
                    "folio": "511213501963/0",
                    "schemes": [
                        {
                            "scheme": "UTI Infrastructure Fund - Regular Plan",
                            "amfi": "100002",
                            "type": "EQUITY",
                            "close": 100.0,
                            "valuation": {"nav": 130.0, "value": 13000.0, "cost": 10000.0},
                            "transactions": [{"date": "2024-01-01", "amount": 10000.0, "description": "Purchase"}],
                        }
                    ],
                },
            ],
            "statement_period": {"from": "01-Jan-2024", "to": "01-Jan-2025"},
        }

        async def fake_live_nav(_):
            return 0.0

        async def fake_nav_history(amfi_code):
            if amfi_code in {"100001", "100002"}:
                return {"01-01-2024": 100.0, "01-01-2025": 110.0}
            return {}

        with patch("app.Code.main.fetch_live_nav", new=fake_live_nav), patch(
            "app.Code.main.fetch_nav_history", new=fake_nav_history
        ), patch("app.Code.main.save_cache_async", new=AsyncMock()), patch(
            "app.Code.main.get_holdings_for_schemes", new=AsyncMock(return_value={})
        ), patch(
            "app.Code.main.save_amfi_cache_async", new=AsyncMock()
        ):
            response = await map_casparser_to_analysis(cas_data)

        self.assertTrue(response.success)
        holdings_by_name = {holding.scheme_name: holding for holding in response.holdings}
        self.assertEqual(
            holdings_by_name["ICICI Prudential Technology Fund - Growth"].benchmark_name,
            "BSE Teck TRI proxy",
        )
        self.assertEqual(
            holdings_by_name["ICICI Prudential Technology Fund - Growth"].sub_category,
            "Sectoral - Technology",
        )
        self.assertEqual(
            holdings_by_name["UTI Infrastructure Fund - Regular Plan"].benchmark_name,
            "Nifty Infrastructure TRI proxy",
        )
        self.assertEqual(
            holdings_by_name["UTI Infrastructure Fund - Regular Plan"].sub_category,
            "Thematic - Infrastructure",
        )

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

    async def test_concentration_top_funds_aggregate_same_scheme_across_folios(self):
        cas_data = {
            "folios": [
                {
                    "amc": "Test AMC",
                    "folio": "1/1",
                    "schemes": [
                        {
                            "scheme": "Repeated Equity Fund",
                            "amfi": "100001",
                            "type": "EQUITY",
                            "close": 10.0,
                            "valuation": {"nav": 100.0, "value": 1000.0, "cost": 900.0},
                            "transactions": [{"date": "2024-01-01", "amount": 900.0, "units": 10.0, "description": "Purchase"}],
                        }
                    ],
                },
                {
                    "amc": "Test AMC",
                    "folio": "2/2",
                    "schemes": [
                        {
                            "scheme": "Repeated Equity Fund",
                            "amfi": "100001",
                            "type": "EQUITY",
                            "close": 20.0,
                            "valuation": {"nav": 100.0, "value": 2000.0, "cost": 1800.0},
                            "transactions": [{"date": "2024-01-01", "amount": 1800.0, "units": 20.0, "description": "Purchase"}],
                        },
                        {
                            "scheme": "Smaller Equity Fund",
                            "amfi": "100002",
                            "type": "EQUITY",
                            "close": 15.0,
                            "valuation": {"nav": 100.0, "value": 1500.0, "cost": 1500.0},
                            "transactions": [{"date": "2024-01-01", "amount": 1500.0, "units": 15.0, "description": "Purchase"}],
                        },
                    ],
                },
            ],
            "statement_period": {"from": "01-Jan-2024", "to": "01-Jan-2025"},
        }

        async def fake_live_nav(_):
            return 0.0

        async def fake_nav_history(_):
            return {"01-01-2024": 100.0, "01-01-2025": 100.0}

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
        self.assertEqual(summary.concentration.fund_count, 2)
        self.assertEqual(summary.concentration.top_funds[0].name, "Repeated Equity Fund")
        self.assertEqual(summary.concentration.top_funds[0].value, 3000.0)
        self.assertAlmostEqual(summary.concentration.top_funds[0].allocation_pct, 66.7)


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

    def test_upload_validation_accepts_content_type_parameters(self):
        json_error = _validate_upload(
            _UploadStub("sample.json", "application/json; charset=utf-8"),
            b'{"folios": []}',
        )
        pdf_error = _validate_upload(
            _UploadStub("statement.pdf", "application/pdf; charset=binary"),
            b"%PDF-1.7\n",
        )

        self.assertIsNone(json_error)
        self.assertIsNone(pdf_error)

    def test_analyze_rejects_invalid_cas_json_shape(self):
        client = TestClient(app)
        files = {"file": ("sample.json", b'{"folios":["oops"]}', "application/json")}
        response = client.post("/api/analyze", files=files, data={"password": ""})
        body = response.json()
        self.assertFalse(body.get("success", True))
        self.assertIn("invalid cas json format", body.get("error", "").lower())
        self.assertNotIn("request id", body.get("error", "").lower())

    def test_analyze_rejects_non_finite_numeric_values(self):
        client = TestClient(app)
        payload = {
            "folios": [
                {
                    "amc": "Test AMC",
                    "folio": "1/1",
                    "schemes": [
                        {
                            "scheme": "Bad Number Fund",
                            "amfi": "100001",
                            "type": "EQUITY",
                            "close": "NaN",
                            "valuation": {"nav": 10, "value": 100},
                            "transactions": [],
                        }
                    ],
                }
            ]
        }
        files = {"file": ("sample.json", json.dumps(payload).encode("utf-8"), "application/json")}
        response = client.post("/api/analyze", files=files, data={"password": ""})

        body = response.json()
        self.assertFalse(body.get("success", True))
        self.assertIn("finite number", body.get("error", "").lower())
        self.assertNotIn("request id", body.get("error", "").lower())

    def test_cas_shape_limits_reject_transaction_floods(self):
        payload = {
            "folios": [
                {
                    "amc": "Test AMC",
                    "folio": "1/1",
                    "schemes": [
                        {
                            "scheme": "Large Fund",
                            "amfi": "100001",
                            "type": "EQUITY",
                            "close": 1,
                            "valuation": {"nav": 1, "value": 1},
                            "transactions": [
                                {"date": "2024-01-01", "amount": 1, "units": 1}
                                for _ in range(MAX_CAS_TRANSACTIONS + 1)
                            ],
                        }
                    ],
                }
            ]
        }

        error = _validate_cas_json_shape(payload)

        self.assertIsNotNone(error)
        self.assertIn("too many transactions", error.lower())

    def test_non_numeric_amfi_codes_are_ignored_before_external_fetch(self):
        self.assertEqual(_normalize_amfi_code("100001"), "100001")
        self.assertEqual(_normalize_amfi_code(100001.0), "100001")
        self.assertEqual(_normalize_amfi_code("100001/../../evil"), "")

    def test_nav_fetchers_reject_invalid_amfi_codes_without_network(self):
        with patch("app.Code.utils._get_client", side_effect=AssertionError("network called")):
            self.assertEqual(asyncio.run(fetch_live_nav("100001/../../evil")), 0.0)
            self.assertEqual(asyncio.run(fetch_nav_history("100001/../../evil")), {})

    def test_parse_amount_rejects_non_finite_values(self):
        self.assertIsNone(_parse_amount("NaN"))
        self.assertIsNone(_parse_amount("Infinity"))
        self.assertEqual(_parse_amount("Rs 1,234.50"), 1234.5)

    def test_parse_iso_date_accepts_iso_datetime_values(self):
        self.assertEqual(_parse_iso_date("2024-01-02T10:30:00").date(), date(2024, 1, 2))
        self.assertEqual(_parse_iso_date("2024-01-02T10:30:00Z").date(), date(2024, 1, 2))
        self.assertEqual(_parse_iso_date(date(2024, 1, 2)).date(), date(2024, 1, 2))

    def test_analyze_rejects_oversized_upload_before_processing(self):
        client = TestClient(app)
        with patch("app.Code.main.MAX_UPLOAD_BYTES", 10):
            files = {"file": ("sample.json", b'{"folios": []}', "application/json")}
            response = client.post("/api/analyze", files=files, data={"password": ""})
        body = response.json()
        self.assertFalse(body.get("success", True))
        self.assertIn("too large", body.get("error", "").lower())

    def test_spa_routes_return_index_html_locally_with_admin_hidden(self):
        client = TestClient(app)

        admin_response = client.get("/admin")
        dashboard_response = client.get("/dashboard")

        self.assertEqual(admin_response.status_code, 404)
        self.assertEqual(dashboard_response.status_code, 200)
        self.assertIn("<!doctype html>", dashboard_response.text.lower())
        self.assertEqual(admin_response.headers.get("cache-control"), "no-store, max-age=0")
        self.assertEqual(dashboard_response.headers.get("cache-control"), "no-store, max-age=0")

        admin_api_response = client.get("/api/admin/overview")
        self.assertEqual(admin_api_response.status_code, 404)
        self.assertEqual(admin_api_response.headers.get("cache-control"), "no-store, max-age=0")

    def test_analyze_disables_client_and_proxy_caching(self):
        client = TestClient(app)

        response = client.post(
            "/api/analyze",
            files={"file": ("sample.json", b"{}", "application/json")},
            data={"password": ""},
        )

        self.assertEqual(response.headers.get("cache-control"), "no-store, max-age=0")
        self.assertEqual(response.headers.get("pragma"), "no-cache")
        self.assertEqual(response.headers.get("expires"), "0")
        self.assertEqual(response.headers.get("x-content-type-options"), "nosniff")
        self.assertEqual(response.headers.get("x-frame-options"), "DENY")
        csp = response.headers.get("content-security-policy", "")
        self.assertIn("default-src 'self'", csp)
        self.assertIn("object-src 'none'", csp)
        self.assertIn("frame-ancestors 'none'", csp)

    def test_vercel_spa_routes_are_served_by_fastapi_for_security_headers(self):
        vercel_config = json.loads(Path("vercel.json").read_text(encoding="utf-8"))
        routes = {route["src"]: route for route in vercel_config["routes"]}

        for route in ("/", "/dashboard", "/dashboard/(.*)", "/admin", "/admin/(.*)"):
            self.assertEqual(routes[route]["dest"], "app/Code/main.py")

    def test_public_test_endpoint_is_not_exposed(self):
        client = TestClient(app)

        response = client.get("/test")

        self.assertEqual(response.status_code, 404)

class TestAnalyticsPrivacyHelpers(unittest.TestCase):
    def test_pseudonymize_identifier_hashes_stably_without_raw_id(self):
        first = _pseudonymize_identifier("user_123", "usr")
        second = _pseudonymize_identifier("user_123", "usr")

        self.assertEqual(first, second)
        self.assertRegex(first or "", r"^usr_[0-9a-f]{16}$")
        self.assertNotIn("user_123", first or "")

    def test_sanitize_file_name_redacts_path_and_sensitive_tokens(self):
        sanitized = _sanitize_file_name(r"C:\\fakepath\\rahul-ABCDE1234F-john@example.com.pdf")

        self.assertEqual(sanitized, "rahul-[REDACTED_PAN]-[REDACTED_EMAIL].pdf")

    def test_sanitize_text_redacts_phone_and_normalizes_whitespace(self):
        sanitized = _sanitize_text(" Call me at +91 98765 43210 \nthanks ")

        self.assertEqual(sanitized, "Call me at [REDACTED_PHONE] thanks")


class TestParserAndHoldingsResilience(unittest.IsolatedAsyncioTestCase):
    def test_pdf_parse_timeout_default_and_cap(self):
        with patch.dict(os.environ, {"PDF_PARSE_TIMEOUT_SECONDS": ""}, clear=False):
            self.assertEqual(_get_pdf_parse_timeout_seconds(), 120.0)

        with patch.dict(os.environ, {"PDF_PARSE_TIMEOUT_SECONDS": "999"}, clear=False):
            self.assertEqual(_get_pdf_parse_timeout_seconds(), 240.0)

        with patch.dict(os.environ, {"PDF_PARSE_TIMEOUT_SECONDS": "invalid"}, clear=False):
            self.assertEqual(_get_pdf_parse_timeout_seconds(), 120.0)

    def test_pdf_parse_auto_uses_thread_on_vercel(self):
        with patch.dict(os.environ, {"PDF_PARSE_EXECUTOR": "auto", "VERCEL": "1"}, clear=False):
            self.assertEqual(_get_pdf_parse_executor(), "thread")

        with patch.dict(os.environ, {"PDF_PARSE_EXECUTOR": "auto", "VERCEL_ENV": "production"}, clear=False):
            os.environ.pop("VERCEL", None)
            self.assertEqual(_get_pdf_parse_executor(), "thread")

    def test_pdf_parse_auto_uses_process_locally(self):
        with patch.dict(os.environ, {"PDF_PARSE_EXECUTOR": "auto"}, clear=False):
            os.environ.pop("VERCEL", None)
            os.environ.pop("VERCEL_ENV", None)
            self.assertEqual(_get_pdf_parse_executor(), "auto")

    def test_pdf_parse_explicit_process_overrides_vercel_default(self):
        with patch.dict(os.environ, {"PDF_PARSE_EXECUTOR": "process", "VERCEL": "1"}, clear=False):
            self.assertEqual(_get_pdf_parse_executor(), "process")

    def test_pdf_parse_subprocess_timeout_terminates_worker(self):
        started_at = time.perf_counter()

        result = _parse_pdf_upload_in_subprocess(
            b"%PDF-1.4\n",
            "",
            0.2,
            worker_target=_sleeping_pdf_parse_worker,
        )

        self.assertFalse(result["success"])
        self.assertIn("timed out", result["error"].lower())
        self.assertLess(time.perf_counter() - started_at, 4.0)

    def test_pdf_parse_subprocess_reads_worker_pipe_result(self):
        result = _parse_pdf_upload_in_subprocess(
            b"%PDF-1.4\n",
            "",
            2.0,
            worker_target=_successful_pdf_parse_worker,
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["data"], {"folios": []})

    def test_pdf_parse_subprocess_setup_failure_is_controlled_error(self):
        class BrokenContext:
            def Pipe(self, *args, **kwargs):
                raise OSError("process pipes unavailable")

        with patch("app.Code.main.multiprocessing.get_context", return_value=BrokenContext()):
            result = _parse_pdf_upload_in_subprocess(b"%PDF-1.4\n", "", 0.2)

        self.assertFalse(result["success"])
        self.assertIn("could not start", result["error"].lower())

    async def test_pdf_parse_auto_falls_back_to_thread_when_subprocess_cannot_start(self):
        class BrokenContext:
            def Pipe(self, *args, **kwargs):
                raise OSError("process pipes unavailable")

        with patch.dict(
            os.environ,
            {"PDF_PARSE_EXECUTOR": "auto", "PDF_PARSE_TIMEOUT_SECONDS": "1"},
            clear=False,
        ), patch(
            "app.Code.main.multiprocessing.get_context",
            return_value=BrokenContext(),
        ), patch(
            "app.Code.main.parse_with_casparser",
            return_value={"success": True, "data": {"folios": []}},
        ):
            os.environ.pop("VERCEL", None)
            os.environ.pop("VERCEL_ENV", None)
            result = await _parse_pdf_upload(b"%PDF-1.4\n", password="")

        self.assertTrue(result["success"])
        self.assertEqual(result["data"], {"folios": []})

    async def test_pdf_parse_thread_executor_skips_subprocess(self):
        with patch.dict(
            os.environ,
            {"PDF_PARSE_EXECUTOR": "thread", "PDF_PARSE_TIMEOUT_SECONDS": "1"},
            clear=False,
        ), patch(
            "app.Code.main.multiprocessing.get_context",
            side_effect=AssertionError("subprocess should not start"),
        ), patch(
            "app.Code.main.parse_with_casparser",
            return_value={"success": True, "data": {"folios": []}},
        ):
            result = await _parse_pdf_upload(b"%PDF-1.4\n", password="")

        self.assertTrue(result["success"])
        self.assertEqual(result["data"], {"folios": []})

    def test_pdf_parse_subprocess_reads_large_result_before_joining_worker(self):
        class FakeConnection:
            def __init__(self):
                self.drained = False

            def poll(self, timeout=None):
                return True

            def recv(self):
                self.drained = True
                return {"success": True, "data": {"folios": []}}

            def close(self):
                return None

        class FakeProcess:
            def __init__(self, target, args, daemon):
                self.connection = args[2]
                self.started = False
                self.terminated = False

            def start(self):
                self.started = True

            def join(self, timeout=None):
                return None

            def is_alive(self):
                return not self.connection.drained and not self.terminated

            def terminate(self):
                self.terminated = True

            def kill(self):
                self.terminated = True

        class FakeContext:
            def __init__(self):
                self.parent_connection = FakeConnection()
                self.child_connection = self.parent_connection

            def Pipe(self, *args, **kwargs):
                return self.parent_connection, self.child_connection

            def Process(self, target, args, daemon):
                return FakeProcess(target, args, daemon)

        with patch("app.Code.main.multiprocessing.get_context", return_value=FakeContext()):
            result = _parse_pdf_upload_in_subprocess(b"%PDF-1.4\n", "", 0.2)

        self.assertTrue(result["success"])
        self.assertEqual(result["data"], {"folios": []})

    def test_pdfminer_cmap_loader_rejects_path_like_names(self):
        from pdfminer.cmapdb import CMapDB

        harden_pdfminer_cmap_loading()

        with patch.object(CMapDB, ORIGINAL_CMAP_LOADER_ATTR, side_effect=AssertionError("unsafe loader called")) as original:
            for name in [
                "../evil",
                "..\\evil",
                "/tmp/evil",
                "C:\\tmp\\evil",
                "\\\\server\\share\\evil",
                "Adobe/../../evil",
                "Identity-H\0",
                "",
            ]:
                with self.subTest(name=name):
                    with self.assertRaises(CMapDB.CMapNotFound):
                        CMapDB._load_data(name)

        original.assert_not_called()

    def test_pdfminer_cmap_loader_still_delegates_safe_names(self):
        from pdfminer.cmapdb import CMapDB

        harden_pdfminer_cmap_loading()

        with patch.object(CMapDB, ORIGINAL_CMAP_LOADER_ATTR, return_value={"ok": True}) as original:
            self.assertEqual(CMapDB._load_data("Identity-H"), {"ok": True})

        original.assert_called_once_with("Identity-H")

    def test_parse_with_casparser_reapplies_pdfminer_hardening(self):
        with patch("app.Code.cas_parser.harden_pdfminer_cmap_loading") as harden, patch(
            "app.Code.cas_parser.read_cas_pdf", return_value={"folios": []}
        ):
            result = parse_with_casparser("dummy.pdf")

        self.assertTrue(result["success"])
        harden.assert_called_once()

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

    async def test_pdf_upload_parser_times_out_without_blocking_event_loop(self):
        def slow_parse(*_args, **_kwargs):
            time.sleep(0.1)
            return {"success": True, "data": {"folios": []}}

        with patch("app.Code.main._get_pdf_parse_timeout_seconds", return_value=0.01), patch(
            "app.Code.main.parse_with_casparser", side_effect=slow_parse
        ):
            result = await _parse_pdf_upload(b"%PDF-1.7\n", password="")

        self.assertFalse(result["success"])
        self.assertIn("timed out", result["error"].lower())

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
                                },
                                {
                                    "date": "2024-01-02",
                                    "description": " \t=cmd",
                                    "amount": 1000,
                                    "units": 10,
                                    "nav": 100,
                                    "balance": 10,
                                    "type": "\t@TYPE",
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
        self.assertEqual(sheet["F3"].value, "' \t=cmd")
        self.assertEqual(sheet["K3"].value, "'\t@TYPE")

    def test_vendored_casparser_csv_exports_escape_formula_like_cells(self):
        cas_data = CASData(
            statement_period=StatementPeriod(from_="01-Jan-2024", to="01-Jan-2025"),
            investor_info=CasInvestorInfo(
                name="Investor",
                email="investor@example.com",
                address="Address",
                mobile="9999999999",
            ),
            cas_type=CASFileType.DETAILED,
            file_type=FileType.CAMS,
            folios=[
                Folio(
                    folio="=12345",
                    amc="@AMC",
                    PAN="ABCDE1234F",
                    schemes=[
                        Scheme(
                            scheme="+Danger Fund",
                            advisor="-Advisor",
                            rta_code="RTA",
                            rta="CAMS",
                            type="EQUITY",
                            isin="INF000000000",
                            amfi="100001",
                            nominees=[],
                            open=Decimal("0"),
                            close=Decimal("10"),
                            close_calculated=Decimal("10"),
                            valuation=SchemeValuation(
                                date="2024-01-01",
                                nav=Decimal("100"),
                                value=Decimal("1000"),
                            ),
                            transactions=[
                                TransactionData(
                                    date="2024-01-01",
                                    description=" \t=cmd",
                                    amount=Decimal("1000"),
                                    units=Decimal("10"),
                                    nav=Decimal("100"),
                                    balance=Decimal("10"),
                                    type=TransactionType.PURCHASE,
                                )
                            ],
                        )
                    ],
                )
            ],
        )

        detailed_csv = cas2csv(cas_data)
        summary_csv = cas2csv_summary(cas_data)
        detailed_rows = list(csv.DictReader(io.StringIO(detailed_csv)))
        summary_rows = list(csv.DictReader(io.StringIO(summary_csv)))

        self.assertEqual(detailed_rows[0]["amc"], "'@AMC")
        self.assertEqual(detailed_rows[0]["folio"], "'=12345")
        self.assertEqual(detailed_rows[0]["scheme"], "'+Danger Fund")
        self.assertEqual(detailed_rows[0]["advisor"], "'-Advisor")
        self.assertEqual(detailed_rows[0]["description"], "' \t=cmd")
        self.assertEqual(summary_rows[0]["amc"], "'@AMC")
        self.assertEqual(summary_rows[0]["scheme"], "'+Danger Fund")
