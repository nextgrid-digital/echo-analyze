import argparse
import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.Code.cas_parser import parse_with_casparser
from app.Code.main import map_casparser_to_analysis


def main() -> int:
    parser = argparse.ArgumentParser(description="Deterministic CAS validation runner")
    parser.add_argument("--pdf", required=True, help="Path to CAS PDF")
    parser.add_argument("--password", default="", help="PDF password/PIN")
    parser.add_argument("--json-out", default="", help="Optional output JSON file")
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    if not pdf_path.exists():
        print(f"ERROR: File not found: {pdf_path}")
        return 1

    parsed = parse_with_casparser(str(pdf_path), password=args.password)
    if not parsed.get("success"):
        print(f"ERROR: Parse failed: {parsed.get('error')}")
        return 1

    analysis = asyncio.run(map_casparser_to_analysis(parsed["data"]))
    if not analysis.success or not analysis.summary:
        print(f"ERROR: Analysis failed: {analysis.error}")
        return 1

    s = analysis.summary
    report = {
        "statement_market_value": s.statement_market_value,
        "total_market_value": s.total_market_value,
        "live_nav_delta_value": s.live_nav_delta_value,
        "benchmark_date_match_pct": s.data_coverage.benchmark_date_match_pct,
        "overlap_source": s.data_coverage.overlap_source,
        "overlap_available_funds": s.data_coverage.overlap_available_funds,
        "warning_codes": [w.code for w in s.warnings],
    }

    print(json.dumps(report, indent=2))

    # Assertions expected from remediated behavior.
    assert s.valuation_mode == "live_nav"
    assert s.data_coverage.overlap_source in {"real", "none"}
    assert 0 <= s.data_coverage.benchmark_date_match_pct <= 100

    if args.json_out:
        Path(args.json_out).write_text(json.dumps(report, indent=2), encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
