"""
Compute pairwise fund overlap matrix from scheme-level holdings.
Overlap(A, B) = sum over common instruments of min(weight_A[s], weight_B[s]).
"""
from typing import Dict, List, Tuple


def compute_overlap_matrix(
    holdings_by_scheme: Dict[str, List[Tuple[str, float]]],
    scheme_order: List[str],
) -> Tuple[List[str], List[List[float]]]:
    """
    Compute symmetric overlap matrix for the given schemes.

    Args:
        holdings_by_scheme: scheme_id -> [(instrument_name_or_id, weight_pct), ...]
        scheme_order: order of schemes for rows/columns (e.g. fund_codes).

    Returns:
        (fund_codes, matrix) where matrix[i][j] = overlap % between scheme_order[i] and scheme_order[j].
        Diagonal is 100.0 (self-overlap).
    """
    n = len(scheme_order)
    matrix: List[List[float]] = [[0.0] * n for _ in range(n)]

    # Pre-compute maps to avoid N^2 redundant work
    scheme_maps = {}
    for code in scheme_order:
        h = holdings_by_scheme.get(code)
        scheme_maps[code] = _to_weight_map(h) if h else {}

    for i in range(n):
        scheme_i = scheme_order[i]
        map_i = scheme_maps[scheme_i]
        if not map_i:
            continue

        for j in range(i, n): # Symmetric matrix, only compute half
            if i == j:
                matrix[i][j] = 100.0
                continue
            
            scheme_j = scheme_order[j]
            map_j = scheme_maps[scheme_j]
            if not map_j:
                continue
            
            overlap = round(_pairwise_overlap(map_i, map_j), 1)
            matrix[i][j] = overlap
            matrix[j][i] = overlap

    return scheme_order, matrix


def _to_weight_map(holdings: List[Tuple[str, float]]) -> Dict[str, float]:
    """Normalize holdings list to instrument -> weight. Normalize key for matching."""
    out: Dict[str, float] = {}
    for name, w in holdings:
        key = _normalize_instrument(name)
        if key:
            out[key] = out.get(key, 0.0) + float(w)
    total_weight = sum(v for v in out.values() if v > 0)
    if total_weight > 0:
        scale = 100.0 / total_weight
        for key in list(out.keys()):
            out[key] = out[key] * scale
    return out


def _normalize_instrument(name: str) -> str:
    """Normalize instrument name for matching (strip, upper, collapse spaces)."""
    if not name or not isinstance(name, str):
        return ""
    return " ".join(name.upper().strip().split())


def _pairwise_overlap(
    map_a: Dict[str, float],
    map_b: Dict[str, float],
) -> float:
    """Overlap % = sum of min(weight_a[s], weight_b[s]) for common s."""
    total = 0.0
    common = set(map_a) & set(map_b)
    for s in common:
        total += min(map_a[s], map_b[s])
    return total
