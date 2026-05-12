"""MCP Server — WJ Dashboard CS Agent."""
from dotenv import load_dotenv

load_dotenv()

from fastmcp import FastMCP
from tools.schedule import class_schedule
from tools.batch import batch_list, batch_get_by_id, package_lookup
from tools.installment import (
    installment_get_unpaid_by_phone,
    installment_get_by_student,
    installment_list,
)
from tools.student import student_search
from tools.payment import payment_list, payment_recreate_invoice, payment_expire_invoice
from tools.query import broadcast_query_execute

mcp = FastMCP(
    name="WJ CS Agent",
    instructions=(
        "Kamu adalah asisten CS (Customer Service) Wkwk Japanese Course. "
        "Gunakan tools di bawah untuk menjawab pertanyaan siswa tentang jadwal kelas, "
        "tagihan, link pembayaran, dan status pendaftaran. "
        "Untuk operasi write (recreate/expire invoice), selalu konfirmasi dulu ke operator."
    ),
)

# ─── Read tools ───────────────────────────────────────────────────────────────

mcp.tool(class_schedule)
mcp.tool(batch_list)
mcp.tool(batch_get_by_id)
mcp.tool(package_lookup)
mcp.tool(installment_get_unpaid_by_phone)
mcp.tool(installment_get_by_student)
mcp.tool(installment_list)
mcp.tool(student_search)
mcp.tool(payment_list)
mcp.tool(broadcast_query_execute)

# ─── Write tools (gunakan dengan konfirmasi) ──────────────────────────────────

mcp.tool(payment_recreate_invoice)
mcp.tool(payment_expire_invoice)


def main():
    mcp.run()


if __name__ == "__main__":
    main()
