import os
from pathlib import Path


def _should_set_env(key: str, *, override: bool, override_public_frontend: bool) -> bool:
    if override:
        return True
    if key not in os.environ:
        return True
    if override_public_frontend and (key.startswith("VITE_") or key.startswith("NEXT_PUBLIC_")):
        return True
    return False


def _load_env_file(env_path: Path, *, override: bool, override_public_frontend: bool = False) -> None:
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            continue

        if value and len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]

        if _should_set_env(key, override=override, override_public_frontend=override_public_frontend):
            os.environ[key] = value


def load_local_env(env_path: str | Path | None = None, *, override: bool = False) -> None:
    """Load simple KEY=VALUE pairs from local .env files if present.

    This keeps local development working even when the backend is started
    without an env-file aware process manager. Existing environment variables
    are preserved unless override=True is passed explicitly.
    """

    if env_path is not None:
        _load_env_file(Path(env_path), override=override)
        return

    repo_root = Path(__file__).resolve().parents[2]
    _load_env_file(repo_root / ".env", override=override)
    _load_env_file(repo_root / "frontend" / ".env", override=override, override_public_frontend=True)
    _load_env_file(repo_root / "frontend" / ".env.local", override=override, override_public_frontend=True)
