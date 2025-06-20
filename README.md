# Aplikasi Akuntansi Proyek - Perusahaan Jasa Boring & Sondir

Aplikasi manajemen keuangan dan akuntansi proyek khusus untuk perusahaan jasa boring dan sondir. Sistem ini memungkinkan pengelolaan proyek, biaya, penagihan, dan pelaporan keuangan secara terintegrasi.

## Fitur Utama

- **Master Data Management**
  - Pengelolaan data klien
  - Struktur Chart of Accounts sesuai standar akuntansi

- **Manajemen Proyek**
  - Pendaftaran dan tracking proyek
  - Pencatatan biaya proyek dengan kategorisasi (material, sewa, tenaga kerja, dll)
  - Upload bukti pengeluaran

- **Penagihan & Keuangan**
  - Pembuatan invoice berdasarkan termin
  - Tracking status pembayaran
  - Pencatatan transaksi kas & bank
  - Manajemen aset tetap dengan penyusutan otomatis
  - Pengelolaan WIP (Work In Progress) untuk proyek yang belum selesai

- **Laporan & Analisis**
  - Dashboard dengan KPI proyek
  - Laporan laba rugi per proyek
  - Neraca & arus kas
  - Export laporan ke PDF/Excel

## Teknologi

- **Frontend**: Next.js, React
- **Backend**: Node.js, Express
- **Database**: PostgreSQL/MySQL
- **ORM**: Prisma
- **Authentication**: JWT

## Struktur Proyek

```
app_accounting/
├── frontend/             # Next.js client
│   ├── pages/            # Next.js pages
│   ├── components/       # Reusable components
│   ├── styles/           # CSS and styling
│   ├── public/           # Static assets
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   └── context/          # React context providers
│
├── backend/              # Express server
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Custom middleware
│   │   └── utils/        # Utility functions
│   ├── prisma/           # Prisma schema and migrations
│   ├── uploads/          # File uploads
│   └── config/           # Configuration files
│
└── docs/                 # Documentation
```

## Instalasi

### Prasyarat

- Node.js (v14 atau lebih tinggi)
- PostgreSQL/MySQL

### Langkah Instalasi

1. **Clone repository**

```bash
git clone https://github.com/Jerly08/Accounting_app.git
cd app_accounting
```

2. **Setup Backend**

```bash
cd backend
npm install
cp .env.example .env
# Edit .env file untuk konfigurasi database
npx prisma migrate dev
npm run dev
```

3. **Setup Frontend**

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env file jika diperlukan
npm run dev
```

4. **Akses Aplikasi**

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Pengembangan

### Flow Utama Aplikasi

1. Input Proyek
2. Catat Biaya Proyek
3. Buat Invoice
4. Terima Pembayaran
5. Generate Laporan

### Struktur Database

Aplikasi menggunakan beberapa model data utama:
- clients (id, name, phone, email, address)
- projects (id, project_code, name, client_id, start_date, end_date, total_value, status)
- project_costs (id, project_id, category, description, amount, date, status)
- billings (id, project_id, billing_date, percentage, amount, status)
- fixed_assets (id, asset_name, acquisition_date, value, useful_life, accumulated_depreciation, book_value)
- transactions (id, date, type, account_code, description, amount, project_id)
- chart_of_accounts (code, name, type)

### Contoh Struktur Akun

| Kode Akun | Nama Akun | Tipe |
|-----------|-----------|------|
| 4001 | Pendapatan Jasa Boring & Sondir | Pendapatan |
| 5101 | Beban Proyek - Proyek A | Beban |
| 5102 | Beban Proyek - Proyek B | Beban |
| 6101 | Beban Operasional Kantor | Beban |
| 1201 | Piutang Usaha | Aktiva |
| 1101 | Kas Proyek | Aktiva |
| 1102 | Bank BCA | Aktiva |
| 1301 | Pekerjaan Dalam Proses (WIP) | Aktiva |
| 1501 | Mesin Boring | Aset Tetap |
| 1601 | Akumulasi Penyusutan Mesin Boring | Kontra Aset |

## Fitur Khusus

- Pengelolaan WIP untuk proyek yang belum selesai
- Manajemen aset tetap dengan penyusutan otomatis
- Reporting yang komprehensif untuk analisis bisnis
- Perhitungan laba rugi per proyek

## Dokumentasi

- [Fitur Transaksi Keuangan](docs/FINANCIAL-TRANSACTIONS.md)
- [Fitur Export](docs/EXPORT_FEATURES.md)

