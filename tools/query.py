"""Tool: broadcast_query_execute — jalankan SELECT bebas di koneksi read-only."""
import re
from db import get_readonly_conn

_FORBIDDEN = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|EXECUTE|"
    r"LOAD_FILE|BENCHMARK|SLEEP)\b"
    r"|INTO\s+(OUTFILE|DUMPFILE)"
    r"|INFORMATION_SCHEMA|MYSQL\.USER",
    re.IGNORECASE,
)
_COMMENT = re.compile(r"(--|/\*|#)")


def broadcast_query_execute(sql: str, limit: int = 500) -> dict:
    """
    Jalankan query SELECT bebas terhadap database menggunakan koneksi read-only.

    Berguna sebagai fallback untuk pertanyaan data yang belum ada tool khususnya.
    Query dibungkus dalam subquery dengan LIMIT untuk keamanan.

    **Batasan:**
    - Hanya SELECT yang diperbolehkan
    - Tidak boleh ada titik-koma (;)
    - Kata kunci destruktif (DROP, DELETE, dll.) diblokir
    - Komentar SQL diblokir

    Args:
        sql: Query SELECT yang akan dijalankan.
        limit: Maksimum baris hasil (default 500, max 5000).

    Returns:
        dict dengan keys: data (list dict), row_count, truncated (bool).
    """
    limit = min(max(1, limit), 5000)
    sql = sql.strip()

    # Validasi
    if not sql.upper().startswith("SELECT"):
        return {"error": "Query harus diawali dengan SELECT."}
    if ";" in sql:
        return {"error": "Titik-koma (;) tidak diperbolehkan."}
    if _COMMENT.search(sql):
        return {"error": "Komentar SQL tidak diperbolehkan."}
    if _FORBIDDEN.search(sql):
        return {"error": "Query mengandung keyword yang dilarang."}

    wrapped = f"SELECT * FROM ({sql}) AS __cs_query LIMIT {limit}"

    conn = get_readonly_conn()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(wrapped)
        rows = cur.fetchall()
        return {
            "data": rows,
            "row_count": len(rows),
            "truncated": len(rows) == limit,
        }
    except Exception as exc:
        return {"error": str(exc)}
    finally:
        conn.close()
