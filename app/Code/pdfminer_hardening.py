from __future__ import annotations

import gzip
import os
import pickle  # nosec B403
from pathlib import PurePath
from typing import Any


def _is_safe_cmap_name(name: str) -> bool:
    cleaned = (name or "").replace("\0", "")
    if not cleaned or cleaned in {".", ".."}:
        return False
    if PurePath(cleaned).name != cleaned:
        return False
    if any(sep in cleaned for sep in ("/", "\\")):
        return False
    if ":" in cleaned:
        return False
    return True


def harden_pdfminer_cmap_loading() -> None:
    try:
        from pdfminer import cmapdb
    except Exception:
        return

    if getattr(cmapdb.CMapDB, "_echo_analyze_hardened", False):
        return

    package_cmap_dir = os.path.join(os.path.dirname(cmapdb.__file__), "cmap")
    original_exception = cmapdb.CMapDB.CMapNotFound

    @classmethod
    def _safe_load_data(cls, name: str) -> Any:
        cleaned = (name or "").replace("\0", "")
        if not _is_safe_cmap_name(cleaned):
            raise original_exception(cleaned)

        filename = f"{cleaned}.pickle.gz"
        path = os.path.join(package_cmap_dir, filename)
        if not os.path.exists(path):
            raise original_exception(cleaned)

        with gzip.open(path, "rb") as gzfile:
            # The loaded file is constrained to pdfminer's packaged cmap directory only.
            return type(str(cleaned), (), pickle.loads(gzfile.read()))  # nosec B301

    cmapdb.CMapDB._load_data = _safe_load_data
    cmapdb.CMapDB._echo_analyze_hardened = True
