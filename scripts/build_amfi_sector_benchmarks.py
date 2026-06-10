#!/usr/bin/env python3
"""Validate and refresh amfi_sector_benchmarks.json against index_proxies."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SECTOR_PATH = ROOT / "app" / "Code" / "benchmarks" / "amfi_sector_benchmarks.json"
PROXIES_PATH = ROOT / "app" / "Code" / "benchmarks" / "index_proxies.json"


def main() -> int:
    if not SECTOR_PATH.exists():
        print(f"Missing sector table: {SECTOR_PATH}")
        return 1

    with SECTOR_PATH.open(encoding="utf-8") as handle:
        sector_data = json.load(handle)

    with PROXIES_PATH.open(encoding="utf-8") as handle:
        proxy_data = json.load(handle)

    proxies = proxy_data.get("indices", {})
    failures = 0
    sectors = sector_data.get("sectors", [])
    if len(sectors) < 20:
        print(f"Expected at least 20 sector entries, found {len(sectors)}")
        failures += 1

    seen_keys: set[str] = set()
    for entry in sectors:
        index_key = entry.get("index_key", "")
        label = entry.get("sector_label", "")
        patterns = entry.get("match_patterns") or []
        if not index_key or not label or not patterns:
            print(f"Invalid sector entry: {entry}")
            failures += 1
            continue
        if index_key in seen_keys and label not in {"PSU", "PSU Bank"}:
            print(f"Duplicate index_key {index_key} for {label}")
            failures += 1
        seen_keys.add(index_key)
        if index_key not in proxies:
            print(f"Missing index proxy for sector {label}: {index_key}")
            failures += 1
        elif not proxies[index_key].get("components"):
            print(f"Empty proxy components for sector {label}: {index_key}")
            failures += 1

    if failures:
        print(f"{failures} sector benchmark validation failure(s)")
        return 1

    print(f"Validated {len(sectors)} AMFI sector benchmarks")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
