from __future__ import annotations

import os
from pathlib import Path
from typing import Optional, Tuple

PROJECT_ROOT = Path(__file__).resolve().parents[2]
_ENV_FILES = (PROJECT_ROOT / ".env", PROJECT_ROOT / ".env.local")
_ENV_LOADED = False


def _parse_env_line(raw_line: str) -> Optional[Tuple[str, str]]:
    line = raw_line.strip()
    if not line or line.startswith("#"):
        return None

    if line.startswith("export "):
        line = line[7:].lstrip()

    if "=" not in line:
        return None

    key, value = line.split("=", 1)
    key = key.strip()
    if not key:
        return None

    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        value = value[1:-1]
    elif " #" in value:
        value = value.split(" #", 1)[0].rstrip()

    return key, value


def load_project_env() -> None:
    global _ENV_LOADED
    if _ENV_LOADED:
        return

    original_keys = set(os.environ)
    loaded_values = {}

    for env_file in _ENV_FILES:
        if not env_file.exists():
            continue

        for line in env_file.read_text(encoding="utf-8").splitlines():
            parsed = _parse_env_line(line)
            if parsed is None:
                continue
            key, value = parsed
            loaded_values[key] = value

    for key, value in loaded_values.items():
        if key not in original_keys:
            os.environ[key] = value

    _ENV_LOADED = True
