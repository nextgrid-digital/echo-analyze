import json
import unittest
from pathlib import Path

from app.Code.benchmarks.registry import (
    get_scheme_master_meta,
    get_tier1_entry,
    load_index_proxies,
    load_scheme_master,
    load_tier1_registry,
)
from app.Code.benchmarks.resolver import resolve_benchmark

BENCHMARKS_DIR = Path(__file__).resolve().parents[1] / "app" / "Code" / "benchmarks"


class TestBenchmarksRegistry(unittest.TestCase):
    def test_scheme_master_is_present_and_populated(self):
        meta = get_scheme_master_meta()
        schemes = load_scheme_master()
        self.assertGreater(meta.get("scheme_count", 0), 10000)
        self.assertGreater(len(schemes), 10000)

    def test_tier1_registry_covers_all_proxy_indices(self):
        registry = load_tier1_registry()
        proxies = load_index_proxies()
        for entry in registry.values():
            index_key = entry["index_key"]
            self.assertIn(index_key, proxies, msg=f"Missing proxy for {index_key}")

    def test_sample_cas_amfi_codes_exist_in_master(self):
        fixture_path = Path(__file__).resolve().parent / "fixtures" / "sample_cas.json"
        payload = json.loads(fixture_path.read_text(encoding="utf-8"))
        schemes = load_scheme_master()
        for folio in payload["folios"]:
            for scheme in folio["schemes"]:
                amfi = str(scheme.get("amfi", "")).strip()
                self.assertIn(amfi, schemes, msg=f"AMFI {amfi} missing from scheme master")

    def test_focused_fund_uses_nifty_500_tier1(self):
        resolution = resolve_benchmark("118950", "HDFC Focused Fund - Growth Option - Direct Plan")
        self.assertEqual(resolution.sebi_category, "focused_fund")
        self.assertEqual(resolution.benchmark_name, "Nifty 500 Total Return Index")
        self.assertEqual(resolution.benchmark_source, "sebi_tier1")
        self.assertEqual([c.code for c in resolution.components], ["152731"])

    def test_large_mid_cap_uses_single_composite_index(self):
        resolution = resolve_benchmark(None, "Test Large & Mid Cap Fund", scheme_type="EQUITY")
        self.assertEqual(resolution.sebi_category, "large_mid_cap")
        self.assertEqual(resolution.benchmark_name, "Nifty LargeMidcap 250 Total Return Index")
        self.assertEqual([c.code for c in resolution.components], ["149341"])

    def test_multi_cap_uses_official_multicap_index(self):
        resolution = resolve_benchmark(None, "Test Multi Cap Fund", scheme_type="EQUITY")
        self.assertEqual(resolution.sebi_category, "multi_cap")
        self.assertEqual(
            resolution.benchmark_name,
            "Nifty 500 Multicap 50:25:25 Total Return Index",
        )
        self.assertEqual([c.code for c in resolution.components], ["152778"])

    def test_sectoral_banking_uses_nifty_bank_index(self):
        resolution = resolve_benchmark(
            None,
            "Test Banking and Financial Services Fund",
            scheme_type="EQUITY",
        )
        self.assertEqual(resolution.sebi_category, "sectoral_thematic")
        self.assertEqual(resolution.benchmark_name, "Nifty Bank Total Return Index")
        self.assertEqual([c.code for c in resolution.components], ["147620"])

    def test_nifty_50_index_fund_uses_underlying_index(self):
        resolution = resolve_benchmark(
            None,
            "UTI Nifty 50 Index Fund - Direct Plan - Growth",
            scheme_type="EQUITY",
        )
        self.assertEqual(resolution.benchmark_source, "underlying_index")
        self.assertEqual(resolution.benchmark_name, "Nifty 50 Total Return Index")
        self.assertEqual([c.code for c in resolution.components], ["120716"])

    def test_unknown_scheme_gets_fallback_benchmark_name(self):
        resolution = resolve_benchmark(None, "Mystery Fund - Direct Plan", scheme_type="EQUITY")
        self.assertEqual(resolution.benchmark_name, "Nifty 500 Total Return Index")

    def test_every_tier1_category_has_registry_entry(self):
        categories = {
            entry["sebi_category"]
            for entry in json.loads((BENCHMARKS_DIR / "sebi_tier1_registry.json").read_text())["categories"]
        }
        for category in categories:
            self.assertIsNotNone(get_tier1_entry(category))


if __name__ == "__main__":
    unittest.main()
