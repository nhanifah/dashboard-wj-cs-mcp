"""Shared DB connection helpers."""
import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()


def _conn_args(prefix: str = "") -> dict:
    p = f"DB_{prefix}" if prefix else "DB_"
    return {
        "host": os.getenv(f"{p}HOST", "127.0.0.1"),
        "port": int(os.getenv(f"{p}PORT", 3306)),
        "database": os.getenv(f"{p}DATABASE", "dashboard_wj"),
        "user": os.getenv(f"{p}USERNAME", "root"),
        "password": os.getenv(f"{p}PASSWORD", ""),
        "charset": "utf8mb4",
        "use_pure": True,
    }


def get_conn():
    """Return a fresh main-DB connection."""
    return mysql.connector.connect(**_conn_args())


def get_readonly_conn():
    """Return a fresh read-only connection (broadcast sandbox)."""
    return mysql.connector.connect(**_conn_args("READONLY_"))


def fetchall(sql: str, params: tuple = ()) -> list[dict]:
    """Execute a SELECT and return rows as list of dicts."""
    conn = get_conn()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params)
        return cur.fetchall()
    finally:
        conn.close()


def fetchone(sql: str, params: tuple = ()) -> dict | None:
    """Execute a SELECT and return the first row as dict, or None."""
    rows = fetchall(sql, params)
    return rows[0] if rows else None
