#!/usr/bin/env python3
"""Placeholder refresh script for committed TRI index history files."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRI_DIR = ROOT / "data" / "tri_indices"


def main() -> int:
    if not TRI_DIR.exists():
        print(f"TRI directory missing: {TRI_DIR}")
        return 1

    files = sorted(TRI_DIR.glob("*.json"))
    if not files:
        print("No TRI index files found.")
        return 1

    for path in files:
        payload = json.loads(path.read_text(encoding="utf-8"))
        levels = payload.get("levels") or {}
        print(f"{path.name}: {len(levels)} level(s)")
    print("TRI files are committed locally; wire NSE/BSE ingestion here when licensed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
