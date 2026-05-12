"""Tool: class_schedule — jadwal batch mendatang per kelas."""
from db import fetchall

VALID_CLASSES = {"N5", "N4", "N3", "JFT", "KAIWA"}


def class_schedule(class_name: str) -> dict:
    """
    Ambil jadwal batch mendatang beserta harga dan kuota untuk satu kelas.

    Args:
        class_name: Nama kelas. Nilai valid: N5 | N4 | N3 | JFT | KAIWA

    Returns:
        dict dengan keys: schedule (list batch), quota (dict batch_name -> sisa)
    """
    cls = class_name.strip().upper()
    if cls not in VALID_CLASSES:
        return {"error": f"class_name harus salah satu dari {sorted(VALID_CLASSES)}"}

    sql = """
        SELECT id, batch_name, batch_desc, batch_date, batch_price,
               batch_quota, batch_status
        FROM batch_registrations
        WHERE batch_date >= CURDATE()
          AND batch_desc LIKE %s
          {kaiwa_exclude}
        ORDER BY batch_date ASC
    """
    like_cls = f"%{cls}%"
    if cls != "KAIWA":
        sql = sql.format(kaiwa_exclude="AND batch_desc NOT LIKE %s")
        rows = fetchall(sql, (like_cls, f"%kaiwa{cls}%"))
    else:
        sql = sql.format(kaiwa_exclude="")
        rows = fetchall(sql, (like_cls,))

    # group quota by batch_name
    quota: dict[str, int] = {}
    for r in rows:
        name = r["batch_name"]
        quota[name] = quota.get(name, 0) + (r["batch_quota"] or 0)

    return {
        "schedule": rows,
        "quota": quota,
    }
