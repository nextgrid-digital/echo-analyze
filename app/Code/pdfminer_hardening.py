import os
import re
from typing import Any


_SAFE_CMAP_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
_HARDENED_ATTR = "_echo_analyze_cmap_loader_hardened"
ORIGINAL_CMAP_LOADER_ATTR = "_echo_analyze_original_cmap_loader"


def _is_safe_cmap_name(name: Any) -> bool:
    if not isinstance(name, str):
        return False
    if not name or len(name) > 128:
        return False
    if "\0" in name or "/" in name or "\\" in name or ".." in name:
        return False
    if os.path.isabs(name) or os.path.splitdrive(name)[0]:
        return False
    return bool(_SAFE_CMAP_NAME.fullmatch(name))


def harden_pdfminer_cmap_loading() -> None:
    """Reject path-like CMap names before pdfminer attempts pickle loading."""
    from pdfminer.cmapdb import CMapDB

    if getattr(CMapDB, _HARDENED_ATTR, False):
        return

    setattr(CMapDB, ORIGINAL_CMAP_LOADER_ATTR, CMapDB._load_data)

    @classmethod
    def _safe_load_data(cls, name: str) -> Any:
        if not _is_safe_cmap_name(name):
            raise cls.CMapNotFound(str(name))
        original_loader = getattr(cls, ORIGINAL_CMAP_LOADER_ATTR)
        return original_loader(name)

    CMapDB._load_data = _safe_load_data
    setattr(CMapDB, _HARDENED_ATTR, True)
