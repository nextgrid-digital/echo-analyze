import re
from typing import Optional

from app.Code.benchmarks.registry import load_scheme_master

_FOF_NOISE = re.compile(
    r"\b(?:FUND\s+OF\s+FUND|FOF|DIRECT\s+PLAN|REGULAR\s+PLAN|GROWTH|IDCW|DIVIDEND|OPTION)\b",
    re.IGNORECASE,
)


def _normalize_name_for_match(name: str) -> str:
    cleaned = _FOF_NOISE.sub(" ", name or "")
    cleaned = re.sub(r"[^A-Z0-9& ]+", " ", cleaned.upper())
    return re.sub(r"\s+", " ", cleaned).strip()


def resolve_fof_underlying_amfi(scheme_name: str) -> Optional[str]:
    """
    Identify an underlying domestic scheme AMFI code embedded in a FoF scheme name.
    """
    text = _normalize_name_for_match(scheme_name)
    if not text:
        return None

    master = load_scheme_master()
    candidates: list[tuple[int, str]] = []
    for amfi, meta in master.items():
        if meta.get("sebi_category") in {"fof_domestic", "fof_overseas"}:
            continue
        core = _normalize_name_for_match(str(meta.get("scheme_name", "")))
        if len(core) < 12:
            continue
        if core in text or text in core:
            candidates.append((len(core), amfi))

    if not candidates:
        return None
    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1]
