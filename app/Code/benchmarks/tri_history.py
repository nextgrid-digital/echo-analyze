import json
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Iterable, Optional, Set

_TRI_DIR = Path(__file__).resolve().parents[3] / "data" / "tri_indices"


def _parse_required_dates(required_dates: Optional[Iterable[Any]]) -> Set[date]:
    parsed: Set[date] = set()
    if not required_dates:
        return parsed
    for value in required_dates:
        if isinstance(value, date):
            parsed.add(value)
            continue
        if hasattr(value, "date"):
            try:
                parsed.add(value.date())
            except Exception:
                continue
    return parsed


@lru_cache(maxsize=64)
def _load_tri_payload(index_key: str) -> Dict[str, Any]:
    path = _TRI_DIR / f"{index_key}.json"
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


@lru_cache(maxsize=64)
def _load_tri_file(index_key: str) -> Dict[str, float]:
    payload = _load_tri_payload(index_key)
    if not payload or payload.get("quality") == "sample":
        return {}
    levels = payload.get("levels") or {}
    history: Dict[str, float] = {}
    for iso_day, level in levels.items():
        try:
            value = float(level)
        except (TypeError, ValueError):
            continue
        if value > 0:
            parts = iso_day.split("-")
            if len(parts) == 3:
                history[f"{parts[2]}-{parts[1]}-{parts[0]}"] = value
    return history


def fetch_tri_index_history(index_key: str, required_dates: Optional[Iterable[Any]] = None) -> Dict[str, float]:
    """
    Load committed NSE/BSE TRI index levels for benchmark simulation.
    Returns DD-MM-YYYY -> level map when local TRI data exists.
    """
    history = _load_tri_file(index_key)
    if not history:
        return {}

    required = _parse_required_dates(required_dates)
    if not required:
        return history

    available_dates = sorted(required.intersection(_tri_dates_from_history(history)))
    if not available_dates:
        return history
    return history


def _tri_dates_from_history(history: Dict[str, float]) -> Set[date]:
    dates: Set[date] = set()
    for d_str in history:
        parts = d_str.split("-")
        if len(parts) != 3:
            continue
        try:
            dates.add(date(int(parts[2]), int(parts[1]), int(parts[0])))
        except ValueError:
            continue
    return dates


def tri_data_available(index_key: str) -> bool:
    return bool(_load_tri_file(index_key))
