import os
from pathlib import Path


def load_local_env(env_path: str | Path | None = None, *, override: bool = False) -> None:
    """Load simple KEY=VALUE pairs from a local .env file if present.

    This keeps local development working even when the backend is started
    without an env-file aware process manager. Existing environment variables
    are preserved unless override=True is passed explicitly.
    """

    if env_path is None:
        env_path = Path(__file__).resolve().parents[2] / ".env"
    else:
        env_path = Path(env_path)

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

        if override:
            os.environ[key] = value
        else:
            os.environ.setdefault(key, value)
