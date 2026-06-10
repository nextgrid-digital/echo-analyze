import json
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from app.Code.main import map_casparser_to_analysis


class TestBenchmarkPortfolioCoverage(unittest.IsolatedAsyncioTestCase):
    async def test_portfolio_tier1_coverage_is_complete(self):
        fixture = Path(__file__).resolve().parent / "fixtures" / "portfolio_cas_benchmarks.json"
        cas_data = json.loads(fixture.read_text(encoding="utf-8"))

        async def fake_live_nav(_):
            return 100.0

        async def fake_benchmark_history(_code, required_dates=None):
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
        summary = response.summary
        assert summary is not None
        coverage = summary.data_coverage
        self.assertEqual(coverage.benchmark_unresolved_holdings, 0)
        self.assertEqual(coverage.benchmark_fallback_holdings, 0)
        self.assertEqual(coverage.benchmark_coverage_pct, 100.0)
        for holding in response.holdings:
            self.assertIn(
                holding.benchmark_source,
                {"sebi_tier1", "underlying_index"},
                msg=f"{holding.scheme_name} has source {holding.benchmark_source}",
            )
            self.assertTrue(holding.benchmark_name)


if __name__ == "__main__":
    unittest.main()
