# dashboard-wj-cs-mcp

MCP Server untuk CS Agent Wkwk Japanese Course. Mengekspos 12 tool yang
bersumber dari database `dashboard-wj` (Laravel app).

## Tools

| Tool | Permission | Deskripsi |
|---|---|---|
| `class_schedule` | read | Jadwal batch mendatang per kelas (N5/N4/N3/JFT/KAIWA) |
| `batch_list` | read | Daftar batch + jumlah siswa, bisa filter by class/keyword |
| `batch_get_by_id` | read | Detail satu batch by ID |
| `package_lookup` | read | Cari paket kursus by class name atau package_id |
| `installment_get_unpaid_by_phone` | read | Tagihan unpaid siswa by nomor WA |
| `installment_get_by_student` | read | Semua tagihan siswa by student_id |
| `installment_list` | read | Listing tagihan ter-paginate + search |
| `student_search` | read | Cari siswa by nama atau nomor WA |
| `payment_list` | read | Listing invoice Xendit ter-paginate + search |
| `broadcast_query_execute` | read | Jalankan SELECT bebas di koneksi read-only |
| `payment_recreate_invoice` | **write** | Generate ulang link pembayaran + kirim WA |
| `payment_expire_invoice` | **write** | Paksa invoice Xendit menjadi EXPIRED |

## Setup

### 1. Install dependencies

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e .
```

### 2. Konfigurasi environment

```bash
cp .env.example .env
# Edit .env sesuai kredensial DB dan URL app
```

Variabel wajib:
- `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` — koneksi MySQL utama
- `DB_READONLY_*` — koneksi read-only untuk `broadcast_query_execute` (bisa sama dengan main jika belum ada user readonly)
- `APP_BASE_URL` — URL Laravel app (untuk write tools)
- `APP_API_TOKEN` — token autentikasi ke app (jika pakai Bearer token)

### 3. Jalankan server

```bash
# Stdio (untuk Claude Desktop / Claude Code)
python server.py

# Atau via script entry point
serve
```

### 4. Konfigurasi Claude Desktop

Tambahkan ke `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wj-cs": {
      "command": "python",
      "args": ["/path/to/dashboard-wj-cs-mcp/server.py"],
      "env": {
        "DB_HOST": "127.0.0.1",
        "DB_DATABASE": "dashboard_wj",
        "DB_USERNAME": "root",
        "DB_PASSWORD": "your_password",
        "APP_BASE_URL": "http://localhost:8000"
      }
    }
  }
}
```

## Arsitektur

```
server.py               ← FastMCP entry point, daftar semua tools
db.py                   ← Helper koneksi MySQL (main + readonly)
tools/
  schedule.py           ← class_schedule
  batch.py              ← batch_list, batch_get_by_id, package_lookup
  installment.py        ← installment_get_unpaid_by_phone,
                          installment_get_by_student, installment_list
  student.py            ← student_search
  payment.py            ← payment_list, payment_recreate_invoice,
                          payment_expire_invoice
  query.py              ← broadcast_query_execute (read-only sandbox)
```

**Write tools** (`payment_recreate_invoice`, `payment_expire_invoice`)
memanggil endpoint Laravel app via HTTP, bukan langsung ke DB, sehingga
business logic dan validasi tetap terpusat di app.

## Sumber dokumentasi

Query dan logika tiap tool bersumber dari dokumentasi di
`dashboard-wj/docs/db-queries/`.
