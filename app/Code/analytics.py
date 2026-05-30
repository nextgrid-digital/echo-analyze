import json
import hashlib
import hmac
import os
import re
import sqlite3
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional


def _default_db_path() -> str:
    if os.environ.get("VERCEL"):
        return str(Path(tempfile.gettempdir()) / "echo_analyze" / "app_analytics.db")
    return "data/app_analytics.db"


DB_PATH = Path(os.environ.get("ANALYTICS_DB_PATH", _default_db_path()))
PSEUDONYMIZED_ID_PATTERN = re.compile(r"^(usr|ses)_[0-9a-f]{16}$")


def _sanitize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None

    text = str(value).strip()
    if not text:
        return None

    text = re.sub(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", "[REDACTED_PAN]", text, flags=re.IGNORECASE)
    text = re.sub(
        r"(?<![A-Za-z0-9_])[A-Za-z0-9][\w.+-]*@[\w.-]+\.[A-Za-z]{2,}(?![A-Za-z0-9_])",
        "[REDACTED_EMAIL]",
        text,
    )
    text = re.sub(r"(?<![\d.])(?:\+?\d[\d\-\s]{8,}\d)(?![\d.])", "[REDACTED_PHONE]", text)
    text = re.sub(r"[\r\n\t]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    return text[:160]


def _sanitize_metadata(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): _sanitize_metadata(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_sanitize_metadata(item) for item in value]
    if isinstance(value, tuple):
        return [_sanitize_metadata(item) for item in value]
    if isinstance(value, str):
        return _sanitize_text(value)
    return value


def _analytics_hash_salt() -> bytes:
    salt = os.environ.get("ANALYTICS_ID_HASH_SALT")
    return (salt or "echo-analyze-local-analytics").encode("utf-8")


def _pseudonymize_identifier(value: Optional[str], prefix: str) -> Optional[str]:
    safe_value = _sanitize_text(value)
    if safe_value is None:
        return None
    if PSEUDONYMIZED_ID_PATTERN.fullmatch(safe_value):
        return safe_value

    digest = hmac.new(_analytics_hash_salt(), safe_value.encode("utf-8"), hashlib.sha256)
    return f"{prefix}_{digest.hexdigest()[:16]}"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def _column_exists(conn: sqlite3.Connection, table: str, column: str) -> bool:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return any(row["name"] == column for row in rows)


def _ensure_column(conn: sqlite3.Connection, table: str, column_sql: str) -> None:
    column_name = column_sql.split(None, 1)[0]
    if not _column_exists(conn, table, column_name):
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column_sql}")


def _pseudonymize_existing_identifiers(conn: sqlite3.Connection) -> None:
    try:
        rows = conn.execute("SELECT id, user_id, session_id FROM analysis_runs").fetchall()
        for row in rows:
            user_id = _pseudonymize_identifier(row["user_id"], "usr")
            session_id = _pseudonymize_identifier(row["session_id"], "ses")
            if user_id != row["user_id"] or session_id != row["session_id"]:
                conn.execute(
                    "UPDATE analysis_runs SET user_id = ?, session_id = ? WHERE id = ?",
                    (user_id, session_id, row["id"]),
                )

        rows = conn.execute("SELECT id, user_id FROM audit_logs").fetchall()
        for row in rows:
            user_id = _pseudonymize_identifier(row["user_id"], "usr")
            if user_id != row["user_id"]:
                conn.execute("UPDATE audit_logs SET user_id = ? WHERE id = ?", (user_id, row["id"]))
        if _column_exists(conn, "analysis_runs", "file_name"):
            conn.execute("UPDATE analysis_runs SET file_name = NULL")
        if _column_exists(conn, "analysis_runs", "total_market_value"):
            conn.execute("UPDATE analysis_runs SET total_market_value = NULL")
    except Exception:
        return


def init_analytics_db() -> None:
    conn: Optional[sqlite3.Connection] = None
    try:
        conn = _connect()
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS analysis_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                username TEXT NOT NULL DEFAULT 'Unknown user',
                session_id TEXT,
                file_type TEXT,
                status TEXT NOT NULL,
                duration_ms INTEGER,
                holdings_count INTEGER,
                total_market_value REAL,
                error_message TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                username TEXT,
                route TEXT NOT NULL,
                action TEXT NOT NULL,
                status TEXT NOT NULL,
                message TEXT NOT NULL,
                metadata_json TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        for column_sql in (
            "username TEXT NOT NULL DEFAULT 'Unknown user'",
            "session_id TEXT",
            "file_type TEXT",
            "duration_ms INTEGER",
            "holdings_count INTEGER",
            "total_market_value REAL",
            "error_message TEXT",
        ):
            _ensure_column(conn, "analysis_runs", column_sql)
        for column_sql in (
            "username TEXT",
            "metadata_json TEXT",
        ):
            _ensure_column(conn, "audit_logs", column_sql)
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_analysis_runs_created_at ON analysis_runs(created_at DESC)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_analysis_runs_user_id ON analysis_runs(user_id)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)"
        )
        _pseudonymize_existing_identifiers(conn)
        conn.commit()
    except Exception:
        return
    finally:
        if conn is not None:
            conn.close()


def record_audit_log(
    *,
    user_id: Optional[str],
    username: Optional[str] = None,
    route: str,
    action: str,
    status: str,
    message: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    safe_user_id = _pseudonymize_identifier(user_id, "usr")
    safe_username = _sanitize_text(username) or "Unknown user"
    safe_message = _sanitize_text(message) or "Event recorded."
    safe_metadata = _sanitize_metadata(metadata or {})

    conn: Optional[sqlite3.Connection] = None
    try:
        conn = _connect()
        conn.execute(
            """
            INSERT INTO audit_logs (
                user_id,
                username,
                route,
                action,
                status,
                message,
                metadata_json,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                safe_user_id,
                safe_username,
                route,
                action,
                status,
                safe_message,
                json.dumps(safe_metadata, default=str),
                _utc_now_iso(),
            ),
        )
        conn.commit()
    except Exception:
        return
    finally:
        if conn is not None:
            conn.close()


def record_analysis_run(
    *,
    request_id: str,
    user_id: str,
    username: Optional[str],
    session_id: Optional[str],
    file_type: Optional[str],
    status: str,
    duration_ms: Optional[int],
    holdings_count: Optional[int],
    total_market_value: Optional[float],
    error_message: Optional[str] = None,
) -> None:
    created_at = _utc_now_iso()
    safe_user_id = _pseudonymize_identifier(user_id, "usr") or "usr_unknown"
    safe_username = _sanitize_text(username) or "Unknown user"
    safe_session_id = _pseudonymize_identifier(session_id, "ses")
    safe_error_message = _sanitize_text(error_message)
    conn: Optional[sqlite3.Connection] = None
    try:
        conn = _connect()
        conn.execute(
            """
            INSERT INTO analysis_runs (
                request_id,
                user_id,
                username,
                session_id,
                file_type,
                status,
                duration_ms,
                holdings_count,
                total_market_value,
                error_message,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                request_id,
                safe_user_id,
                safe_username,
                safe_session_id,
                file_type,
                status,
                duration_ms,
                holdings_count,
                None,
                safe_error_message,
                created_at,
            ),
        )
        conn.commit()
    except Exception:
        return
    finally:
        if conn is not None:
            conn.close()

    record_audit_log(
        user_id=safe_user_id,
        username=safe_username,
        route="/api/analyze",
        action="analysis_completed" if status == "success" else "analysis_failed",
        status=status,
        message=safe_error_message or f"Analysis {status}.",
        metadata={
            "request_id": request_id,
            "file_type": file_type,
            "duration_ms": duration_ms,
            "holdings_count": holdings_count,
        },
    )


LOG_WINDOW_DAYS = {
    "24h": 1,
    "7d": 7,
    "30d": 30,
}


def get_admin_overview(*, registered_users: Optional[int] = None, log_window: str = "24h") -> Dict[str, Any]:
    window_key = log_window if log_window in LOG_WINDOW_DAYS else "24h"
    window_days = LOG_WINDOW_DAYS[window_key]
    window_since = (datetime.now(timezone.utc) - timedelta(days=window_days)).replace(microsecond=0).isoformat()

    defaults = {
        "metrics": {
            "registered_users": registered_users,
            "total_users": registered_users,
            "tracked_users": 0,
            "active_users": 0,
            "active_users_7d": 0,
            "total_analyses": 0,
            "successful_analyses": 0,
            "failed_analyses": 0,
            "success_rate": 0.0,
            "average_duration_ms": 0.0,
            "fastest_duration_ms": None,
            "slowest_duration_ms": None,
            "last_analysis_at": None,
        },
        "log_window": window_key,
        "recent_analyses": [],
        "recent_logs": [],
        "top_users": [],
    }

    conn: Optional[sqlite3.Connection] = None
    try:
        conn = _connect()
        metrics_row = conn.execute(
            """
            SELECT
                COUNT(*) AS total_analyses,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successful_analyses,
                SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) AS failed_analyses,
                COUNT(DISTINCT user_id) AS tracked_users,
                AVG(duration_ms) AS average_duration_ms,
                MIN(duration_ms) AS fastest_duration_ms,
                MAX(duration_ms) AS slowest_duration_ms,
                MAX(created_at) AS last_analysis_at
            FROM analysis_runs
            """
        ).fetchone()

        active_7d_since = (datetime.now(timezone.utc) - timedelta(days=7)).replace(microsecond=0).isoformat()
        active_users_row = conn.execute(
            """
            SELECT COUNT(DISTINCT user_id) AS active_users_7d
            FROM analysis_runs
            WHERE created_at >= ?
            """,
            (active_7d_since,),
        ).fetchone()

        window_active_users_row = conn.execute(
            """
            SELECT COUNT(DISTINCT user_id) AS active_users
            FROM analysis_runs
            WHERE created_at >= ?
            """,
            (window_since,),
        ).fetchone()

        recent_analyses_rows = conn.execute(
            """
            SELECT
                request_id,
                username,
                file_type,
                status,
                duration_ms,
                holdings_count,
                error_message,
                created_at
            FROM analysis_runs
            ORDER BY created_at DESC
            LIMIT 12
            """
        ).fetchall()

        recent_logs_rows = conn.execute(
            """
            SELECT
                username,
                route,
                action,
                status,
                message,
                metadata_json,
                created_at
            FROM audit_logs
            WHERE created_at >= ?
            ORDER BY created_at DESC
            LIMIT 20
            """,
            (window_since,),
        ).fetchall()

        top_users_rows = conn.execute(
            """
            SELECT
                username,
                COUNT(*) AS report_count,
                MAX(created_at) AS last_analysis_at
            FROM analysis_runs
            GROUP BY user_id, username
            ORDER BY report_count DESC, last_analysis_at DESC
            LIMIT 10
            """
        ).fetchall()
    except Exception:
        return defaults
    finally:
        if conn is not None:
            conn.close()

    total_analyses = int(metrics_row["total_analyses"] or 0)
    successful_analyses = int(metrics_row["successful_analyses"] or 0)
    failed_analyses = int(metrics_row["failed_analyses"] or 0)
    success_rate = round((successful_analyses / total_analyses) * 100, 1) if total_analyses else 0.0

    recent_logs = []
    for row in recent_logs_rows:
        metadata: Dict[str, Any] = {}
        raw_metadata = row["metadata_json"]
        if raw_metadata:
            try:
                loaded = json.loads(raw_metadata)
                if isinstance(loaded, dict):
                    metadata = loaded
            except Exception:
                metadata = {}
        recent_logs.append(
            {
                "username": row["username"] or "Unknown user",
                "route": row["route"],
                "action": row["action"],
                "status": row["status"],
                "message": row["message"],
                "metadata": metadata,
                "created_at": row["created_at"],
            }
        )

    return {
        "metrics": {
            "registered_users": registered_users,
            "total_users": registered_users if registered_users is not None else int(metrics_row["tracked_users"] or 0),
            "tracked_users": int(metrics_row["tracked_users"] or 0),
            "active_users": int(window_active_users_row["active_users"] or 0),
            "active_users_7d": int(active_users_row["active_users_7d"] or 0),
            "total_analyses": total_analyses,
            "successful_analyses": successful_analyses,
            "failed_analyses": failed_analyses,
            "success_rate": success_rate,
            "average_duration_ms": round(float(metrics_row["average_duration_ms"] or 0.0), 1),
            "fastest_duration_ms": metrics_row["fastest_duration_ms"],
            "slowest_duration_ms": metrics_row["slowest_duration_ms"],
            "last_analysis_at": metrics_row["last_analysis_at"],
        },
        "log_window": window_key,
        "recent_analyses": [dict(row) for row in recent_analyses_rows],
        "recent_logs": recent_logs,
        "top_users": [dict(row) for row in top_users_rows],
    }


init_analytics_db()
