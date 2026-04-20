import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional


def _default_db_path() -> str:
    if os.environ.get("VERCEL"):
        return "/tmp/app_analytics.db"
    return "data/app_analytics.db"


DB_PATH = Path(os.environ.get("ANALYTICS_DB_PATH", _default_db_path()))


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


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
                session_id TEXT,
                file_name TEXT,
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
                route TEXT NOT NULL,
                action TEXT NOT NULL,
                status TEXT NOT NULL,
                message TEXT NOT NULL,
                metadata_json TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_analysis_runs_created_at ON analysis_runs(created_at DESC)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_analysis_runs_user_id ON analysis_runs(user_id)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)"
        )
        conn.commit()
    except Exception:
        pass
    finally:
        if conn is not None:
            conn.close()


def record_audit_log(
    *,
    user_id: Optional[str],
    route: str,
    action: str,
    status: str,
    message: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    conn: Optional[sqlite3.Connection] = None
    try:
        conn = _connect()
        conn.execute(
            """
            INSERT INTO audit_logs (
                user_id,
                route,
                action,
                status,
                message,
                metadata_json,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                route,
                action,
                status,
                message,
                json.dumps(metadata or {}, default=str),
                _utc_now_iso(),
            ),
        )
        conn.commit()
    except Exception:
        pass
    finally:
        if conn is not None:
            conn.close()


def record_analysis_run(
    *,
    request_id: str,
    user_id: str,
    session_id: Optional[str],
    file_name: Optional[str],
    file_type: Optional[str],
    status: str,
    duration_ms: Optional[int],
    holdings_count: Optional[int],
    total_market_value: Optional[float],
    error_message: Optional[str] = None,
) -> None:
    created_at = _utc_now_iso()
    conn: Optional[sqlite3.Connection] = None
    try:
        conn = _connect()
        conn.execute(
            """
            INSERT INTO analysis_runs (
                request_id,
                user_id,
                session_id,
                file_name,
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
                user_id,
                session_id,
                file_name,
                file_type,
                status,
                duration_ms,
                holdings_count,
                total_market_value,
                error_message,
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
        user_id=user_id,
        route="/api/analyze",
        action="analysis_completed" if status == "success" else "analysis_failed",
        status=status,
        message=error_message or f"Analysis {status}.",
        metadata={
            "request_id": request_id,
            "file_name": file_name,
            "file_type": file_type,
            "duration_ms": duration_ms,
            "holdings_count": holdings_count,
            "total_market_value": total_market_value,
        },
    )


def get_admin_overview(*, registered_users: Optional[int] = None) -> Dict[str, Any]:
    defaults = {
        "metrics": {
            "registered_users": registered_users,
            "tracked_users": 0,
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
        "recent_analyses": [],
        "recent_logs": [],
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

        active_since = (datetime.now(timezone.utc) - timedelta(days=7)).replace(microsecond=0).isoformat()
        active_users_row = conn.execute(
            """
            SELECT COUNT(DISTINCT user_id) AS active_users_7d
            FROM analysis_runs
            WHERE created_at >= ?
            """,
            (active_since,),
        ).fetchone()

        recent_analyses_rows = conn.execute(
            """
            SELECT
                request_id,
                user_id,
                session_id,
                file_name,
                file_type,
                status,
                duration_ms,
                holdings_count,
                total_market_value,
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
                user_id,
                route,
                action,
                status,
                message,
                metadata_json,
                created_at
            FROM audit_logs
            ORDER BY created_at DESC
            LIMIT 20
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
                "user_id": row["user_id"],
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
            "tracked_users": int(metrics_row["tracked_users"] or 0),
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
        "recent_analyses": [dict(row) for row in recent_analyses_rows],
        "recent_logs": recent_logs,
    }


init_analytics_db()
