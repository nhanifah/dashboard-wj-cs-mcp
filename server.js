import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { classSchedule }               from './tools/schedule.js';
import { batchList, batchGetById, packageLookup } from './tools/batch.js';
import { installmentGetUnpaidByPhone, installmentGetByStudent, installmentList } from './tools/installment.js';
import { studentSearch }               from './tools/student.js';
import { paymentList, paymentRecreateInvoice, paymentExpireInvoice } from './tools/payment.js';
import { broadcastQueryExecute }       from './tools/query.js';

const server = new McpServer({
  name: 'WJ CS Agent',
  version: '0.1.0',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tool(name, description, schema, handler) {
  server.tool(name, description, schema, async (args) => {
    const result = await handler(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });
}

// ─── Read tools ───────────────────────────────────────────────────────────────

tool('class_schedule',
  'Jadwal batch mendatang + kuota untuk satu kelas (N5/N4/N3/JFT/KAIWA)',
  { class_name: z.string().describe('Nama kelas: N5 | N4 | N3 | JFT | KAIWA') },
  classSchedule,
);

tool('batch_list',
  'Daftar batch registrasi + jumlah siswa terdaftar, bisa filter by class atau keyword',
  {
    keyword:    z.string().optional().default('').describe('Filter substring batch_desc/batch_name'),
    class_name: z.string().optional().default('').describe('Filter by class, misal N5'),
  },
  batchList,
);

tool('batch_get_by_id',
  'Detail satu batch berdasarkan ID (batch_registrations.id)',
  { batch_id: z.number().int().describe('Primary key batch_registrations.id') },
  batchGetById,
);

tool('package_lookup',
  'Cari paket kursus berdasarkan class name atau package_id',
  {
    class_name: z.string().optional().default('').describe('Substring nama kelas, misal N5 atau Kaiwa'),
    package_id: z.string().optional().default('').describe('UUID package_list.package_id (prioritas)'),
  },
  packageLookup,
);

tool('installment_get_unpaid_by_phone',
  'Ambil semua tagihan UNPAID milik siswa berdasarkan nomor WhatsApp',
  { phone_number: z.string().describe('Nomor WA siswa (format bebas, akan dinormalisasi ke 62xxx)') },
  installmentGetUnpaidByPhone,
);

tool('installment_get_by_student',
  'Semua tagihan (semua status) milik satu siswa berdasarkan student_id',
  { student_id: z.string().describe('UUID students.student_id') },
  installmentGetByStudent,
);

tool('installment_list',
  'Listing tagihan ter-paginate dengan pencarian by nama siswa, WA, batch, atau status',
  {
    keyword: z.string().optional().default('').describe('Kata kunci pencarian'),
    limit:   z.number().int().optional().default(10).describe('Jumlah per halaman (max 100)'),
    page:    z.number().int().optional().default(1).describe('Nomor halaman'),
  },
  installmentList,
);

tool('student_search',
  'Cari siswa berdasarkan nama lengkap atau nomor WhatsApp',
  {
    keyword: z.string().describe('Nama siswa atau nomor WA'),
    limit:   z.number().int().optional().default(10).describe('Jumlah per halaman (max 50)'),
    page:    z.number().int().optional().default(1).describe('Nomor halaman'),
  },
  studentSearch,
);

tool('payment_list',
  'Listing invoice Xendit ter-paginate, bisa filter by siswa atau keyword',
  {
    keyword:    z.string().optional().default('').describe('Cari di nama, WA, external_id, email'),
    student_id: z.string().optional().default('').describe('UUID students.student_id (opsional)'),
    limit:      z.number().int().optional().default(10).describe('Jumlah per halaman (max 100)'),
    page:       z.number().int().optional().default(1).describe('Nomor halaman'),
  },
  paymentList,
);

tool('broadcast_query_execute',
  'Jalankan SELECT bebas di koneksi read-only. Gunakan sebagai fallback untuk query data yang tidak ada tool-nya.',
  {
    sql:   z.string().describe('Query SELECT yang akan dijalankan'),
    limit: z.number().int().optional().default(500).describe('Maksimum baris hasil (max 5000)'),
  },
  broadcastQueryExecute,
);

// ─── Write tools ──────────────────────────────────────────────────────────────

tool('payment_recreate_invoice',
  '[WRITE] Generate ulang link pembayaran Xendit + kirim via WA. Selalu konfirmasi ke operator sebelum digunakan.',
  { installment_id: z.string().describe('UUID installment.installment_id') },
  paymentRecreateInvoice,
);

tool('payment_expire_invoice',
  '[WRITE] Paksa invoice Xendit menjadi EXPIRED. Tidak dapat dibatalkan. Selalu konfirmasi ke operator.',
  { invoice_id: z.string().describe('Xendit invoice ID (xendit_invoice.id)') },
  paymentExpireInvoice,
);

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
