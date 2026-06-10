#!/usr/bin/env python3
"""Validate scheme -> benchmark mappings against an expected CSV."""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.Code.benchmarks.resolver import resolve_benchmark


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate benchmark mappings.")
    parser.add_argument(
        "csv_path",
        nargs="?",
        default=str(ROOT / "tests" / "fixtures" / "expected_benchmarks.csv"),
        help="CSV with columns: amfi_code,scheme_name,expected_benchmark",
    )
    args = parser.parse_args()
    path = Path(args.csv_path)
    if not path.exists():
        print(f"Fixture not found: {path}")
        return 1

    failures = 0
    with path.open(encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            amfi = (row.get("amfi_code") or "").strip() or None
            scheme_name = (row.get("scheme_name") or "").strip()
            expected = (row.get("expected_benchmark") or "").strip()
            resolution = resolve_benchmark(amfi, scheme_name)
            actual = resolution.benchmark_name or ""
            if actual != expected:
                failures += 1
                print(
                    f"FAIL amfi={amfi} scheme={scheme_name!r}: expected={expected!r} actual={actual!r}"
                )
    if failures:
        print(f"{failures} benchmark validation failure(s)")
        return 1
    print("All benchmark validations passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
