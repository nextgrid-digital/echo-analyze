import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

_BENCHMARKS_DIR = Path(__file__).resolve().parent


@lru_cache(maxsize=1)
def load_tier1_registry() -> Dict[str, Dict[str, Any]]:
    path = _BENCHMARKS_DIR / "sebi_tier1_registry.json"
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    return {entry["sebi_category"]: entry for entry in data["categories"]}


@lru_cache(maxsize=1)
def load_index_proxies() -> Dict[str, Dict[str, Any]]:
    path = _BENCHMARKS_DIR / "index_proxies.json"
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    return data["indices"]


@lru_cache(maxsize=1)
def load_amfi_sector_benchmarks() -> List[Dict[str, Any]]:
    path = _BENCHMARKS_DIR / "amfi_sector_benchmarks.json"
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    return data.get("sectors", [])


@lru_cache(maxsize=1)
def load_scheme_master() -> Dict[str, Dict[str, Any]]:
    path = _BENCHMARKS_DIR / "scheme_master.json"
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    return data.get("schemes", {})


def get_scheme_master_meta() -> Dict[str, Any]:
    path = _BENCHMARKS_DIR / "scheme_master.json"
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    return {
        "version": data.get("version"),
        "generated_at": data.get("generated_at"),
        "source_url": data.get("source_url"),
        "scheme_count": len(data.get("schemes", {})),
    }


def get_index_proxy(index_key: str) -> Optional[Dict[str, Any]]:
    return load_index_proxies().get(index_key)


def get_tier1_entry(sebi_category: str) -> Optional[Dict[str, Any]]:
    return load_tier1_registry().get(sebi_category)
