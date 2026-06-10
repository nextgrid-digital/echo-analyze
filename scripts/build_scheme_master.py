#!/usr/bin/env python3
"""Download AMFI scheme master and build scheme_master.json for benchmark resolution."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
import httpx

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.Code.benchmarks.resolver import build_scheme_meta_from_amfi_row

AMFI_SCHEME_URL = "https://portal.amfiindia.com/DownloadSchemeData_Po.aspx?mf=0"
OUTPUT_PATH = ROOT / "app" / "Code" / "benchmarks" / "scheme_master.json"


def download_amfi_scheme_csv() -> str:
    response = httpx.get(AMFI_SCHEME_URL, timeout=120.0)
    response.raise_for_status()
    return response.text


def parse_amfi_rows(csv_text: str) -> dict[str, dict]:
    schemes: dict[str, dict] = {}
    reader = csv.reader(io.StringIO(csv_text))
    header = next(reader, None)
    if not header:
        return schemes

    for row in reader:
        if len(row) < 5:
            continue
        amfi_code = str(row[1]).strip()
        scheme_name = str(row[2]).strip()
        amfi_category = str(row[4]).strip()
        if not amfi_code.isdigit():
            continue
        schemes[amfi_code] = build_scheme_meta_from_amfi_row(amfi_code, scheme_name, amfi_category)
    return schemes


def main() -> None:
    csv_text = download_amfi_scheme_csv()
    schemes = parse_amfi_rows(csv_text)
    payload = {
        "version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_url": AMFI_SCHEME_URL,
        "checksum": hashlib.sha256(csv_text.encode("utf-8")).hexdigest(),
        "scheme_count": len(schemes),
        "schemes": schemes,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote {len(schemes)} schemes to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
