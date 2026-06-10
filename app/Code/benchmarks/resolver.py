from typing import List, Optional

from app.Code.benchmarks.category_map import (
    normalize_amfi_category,
    sebi_category_label,
    scheme_flags_from_amfi_category,
)
from app.Code.benchmarks.classifier_fallback import (
    classify_sebi_category_from_name,
    fallback_sub_category,
)
from app.Code.benchmarks.fof_resolver import resolve_fof_underlying_amfi
from app.Code.benchmarks.index_name_parser import parse_underlying_index_key
from app.Code.benchmarks.models import BenchmarkComponent, BenchmarkResolution
from app.Code.benchmarks.registry import (
    get_index_proxy,
    get_tier1_entry,
    load_scheme_master,
)
from app.Code.benchmarks.sector_map import resolve_sector_index_key
from app.Code.benchmarks.solution_oriented import resolve_solution_oriented_index_key


def _components_from_index_key(index_key: str) -> List[BenchmarkComponent]:
    proxy = get_index_proxy(index_key)
    if not proxy:
        return []
    components: List[BenchmarkComponent] = []
    for item in proxy.get("components", []):
        code = str(item.get("code", "")).strip()
        if not code:
            continue
        weight = float(item.get("weight", 1.0))
        proxy_name = str(item.get("proxy_name", proxy.get("display_name", index_key)))
        components.append(BenchmarkComponent(code=code, weight=weight, label=proxy_name))
    return components


def _benchmark_name_for_index_key(index_key: str) -> Optional[str]:
    proxy = get_index_proxy(index_key)
    if proxy:
        return str(proxy.get("display_name") or index_key)
    return None


def _benchmark_name_for_sebi_category(sebi_category: str, index_key: str) -> Optional[str]:
    tier1 = get_tier1_entry(sebi_category)
    if tier1:
        return str(tier1["tier1_index_name"])
    proxy = get_index_proxy(index_key)
    if proxy:
        return str(proxy.get("display_name"))
    return None


def _default_sebi_category_from_name(scheme_name: str, scheme_type: str = "") -> str:
    name = (scheme_name or "").upper()
    typ = (scheme_type or "").upper()
    if "DEBT" in typ or any(
        token in name for token in ("DEBT", "BOND", "GILT", "LIQUID", "INCOME", "DURATION")
    ):
        return "liquid"
    if "HYBRID" in typ or any(token in name for token in ("HYBRID", "BALANCED", "ASSET ALLOCATION")):
        return "balanced_hybrid"
    return "flexi_cap"


def _default_index_key_for_sebi_category(sebi_category: str) -> str:
    tier1 = get_tier1_entry(sebi_category)
    if tier1:
        return str(tier1["index_key"])
    if sebi_category in {"index_fund", "etf", "gold_etf", "fof_overseas"}:
        return "nifty_500_tri"
    return "nifty_500_tri"


def _ensure_benchmark_name(
    sebi_category: str,
    index_key: Optional[str],
    components: List[BenchmarkComponent],
) -> str:
    if components:
        if len(components) == 1:
            return components[0].label
        pieces = [f"{round(c.weight * 100)}% {c.label}" for c in components]
        return " + ".join(pieces)
    key = index_key or _default_index_key_for_sebi_category(sebi_category)
    return (
        _benchmark_name_for_sebi_category(sebi_category, key)
        or _benchmark_name_for_index_key(key)
        or "Nifty 500 Total Return Index"
    )


def _resolve_index_key(
    sebi_category: str,
    scheme_name: str,
    scheme_meta: Optional[dict],
    amfi: Optional[str] = None,
    scheme_type: str = "",
    warnings: Optional[List[str]] = None,
) -> Optional[str]:
    warning_list = warnings if warnings is not None else []

    if sebi_category in {"children_fund", "retirement_fund"}:
        return resolve_solution_oriented_index_key(scheme_name)

    if sebi_category == "fof_domestic":
        underlying_amfi = resolve_fof_underlying_amfi(scheme_name)
        if underlying_amfi:
            underlying = resolve_benchmark(underlying_amfi, scheme_name, scheme_type=scheme_type)
            if underlying.index_key and underlying.benchmark_source in {"sebi_tier1", "underlying_index"}:
                return underlying.index_key
        tier1 = get_tier1_entry(sebi_category)
        return str(tier1["index_key"]) if tier1 else "nifty_500_tri"

    if sebi_category in {"index_fund", "etf", "gold_etf"}:
        underlying = None
        if scheme_meta:
            underlying = scheme_meta.get("underlying_index_key")
        if not underlying:
            underlying = parse_underlying_index_key(scheme_name)
        if underlying:
            return underlying

    if sebi_category == "sectoral_thematic":
        index_key, used_fallback = resolve_sector_index_key(scheme_name)
        if used_fallback and index_key:
            warning_list.append("BENCHMARK_SECTOR_UNRESOLVED")
        return index_key

    if sebi_category == "fof_overseas":
        overseas = parse_underlying_index_key(scheme_name)
        return overseas or "sp_500"

    tier1 = get_tier1_entry(sebi_category)
    if tier1:
        return str(tier1["index_key"])
    return None


def resolve_sebi_category(
    amfi: Optional[str],
    scheme_name: str,
    amfi_category: Optional[str] = None,
    scheme_type: str = "",
) -> tuple[str, bool, bool]:
    """
    Returns (sebi_category, used_fallback_classifier, from_master).
    """
    master = load_scheme_master()
    if amfi and amfi in master:
        entry = master[amfi]
        return str(entry["sebi_category"]), False, True

    if amfi_category:
        mapped = normalize_amfi_category(amfi_category)
        if mapped:
            return mapped, False, False

    category, _ambiguous = classify_sebi_category_from_name(scheme_name, scheme_type)
    return category, True, False


def resolve_benchmark(
    amfi: Optional[str],
    scheme_name: str,
    scheme_type: str = "",
    amfi_category: Optional[str] = None,
) -> BenchmarkResolution:
    warnings: List[str] = []
    master = load_scheme_master()
    scheme_meta = master.get(amfi or "") if amfi else None

    sebi_category, used_fallback, from_master = resolve_sebi_category(
        amfi, scheme_name, amfi_category=amfi_category, scheme_type=scheme_type
    )

    if used_fallback:
        warnings.append("BENCHMARK_CATEGORY_FALLBACK")
    elif not from_master and amfi:
        warnings.append("BENCHMARK_CATEGORY_FALLBACK")

    if sebi_category == "unclassified":
        sebi_category = _default_sebi_category_from_name(scheme_name, scheme_type)
        used_fallback = True
        warnings.append("BENCHMARK_CATEGORY_FALLBACK")

    index_key = _resolve_index_key(
        sebi_category,
        scheme_name,
        scheme_meta,
        amfi=amfi,
        scheme_type=scheme_type,
        warnings=warnings,
    )
    if not index_key:
        index_key = _default_index_key_for_sebi_category(sebi_category)
        warnings.append("BENCHMARK_CATEGORY_FALLBACK")

    proxy = get_index_proxy(index_key)
    if proxy and not proxy.get("components"):
        warnings.append("BENCHMARK_PROXY_GAP")

    components = _components_from_index_key(index_key)
    if not components:
        warnings.append("BENCHMARK_PROXY_GAP")

    if sebi_category in {"index_fund", "etf", "gold_etf"}:
        source = "underlying_index"
        benchmark_name = _benchmark_name_for_index_key(index_key) or _benchmark_name_for_sebi_category(
            sebi_category, index_key
        )
    elif sebi_category == "fof_domestic" and resolve_fof_underlying_amfi(scheme_name):
        source = "sebi_tier1"
        benchmark_name = _benchmark_name_for_index_key(index_key) or _benchmark_name_for_sebi_category(
            sebi_category, index_key
        )
    else:
        source = "fallback" if used_fallback or not components else "sebi_tier1"
        benchmark_name = _benchmark_name_for_sebi_category(sebi_category, index_key)
        if sebi_category in {"children_fund", "retirement_fund"}:
            benchmark_name = _benchmark_name_for_index_key(index_key) or benchmark_name
        if not components:
            source = "fallback" if used_fallback else "unresolved"

    benchmark_name = _ensure_benchmark_name(sebi_category, index_key, components) if not benchmark_name else benchmark_name

    if sebi_category in {"sectoral_thematic", "index_fund", "etf", "gold_etf"}:
        sub_category = fallback_sub_category(sebi_category, scheme_name)
    elif scheme_meta and scheme_meta.get("amfi_category"):
        sub_category = sebi_category_label(sebi_category)
    elif used_fallback:
        sub_category = fallback_sub_category(sebi_category, scheme_name)
    else:
        sub_category = sebi_category_label(sebi_category)

    return BenchmarkResolution(
        components=components,
        benchmark_name=benchmark_name,
        sebi_category=sebi_category,
        sub_category=sub_category,
        benchmark_source=source,
        used_fallback_classifier=used_fallback,
        index_key=index_key,
        warnings=warnings,
    )


def build_scheme_meta_from_amfi_row(
    amfi_code: str,
    scheme_name: str,
    amfi_category: str,
) -> dict:
    sebi_category = normalize_amfi_category(amfi_category) or "unclassified"
    is_index, is_etf, is_fof = scheme_flags_from_amfi_category(amfi_category)
    underlying_index_key = None
    if is_index or is_etf or sebi_category == "gold_etf":
        underlying_index_key = parse_underlying_index_key(scheme_name)
    return {
        "scheme_name": scheme_name,
        "amfi_category": amfi_category,
        "sebi_category": sebi_category,
        "is_index": is_index,
        "is_etf": is_etf,
        "is_fof": is_fof,
        "underlying_index_key": underlying_index_key,
    }
