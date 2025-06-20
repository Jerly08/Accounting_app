# Aplikasi Akuntansi Proyek - Perusahaan Jasa Boring & Sondir

Aplikasi manajemen keuangan dan akuntansi proyek khusus untuk perusahaan jasa boring dan sondir. Sistem ini memungkinkan pengelolaan proyek, biaya, penagihan, dan pelaporan keuangan secara terintegrasi.

## Fitur Utama

- **Master Data Management**
  - Pengelolaan data klien
  - Struktur Chart of Accounts

- **Manajemen Proyek**
  - Pendaftaran dan tracking proyek
  - Pencatatan biaya proyek dengan kategorisasi
  - Upload bukti pengeluaran

- **Penagihan & Keuangan**
  - Pembuatan invoice berdasarkan termin
  - Tracking status pembayaran
  - Pencatatan transaksi kas & bank
  - Manajemen aset tetap & penyusutan

- **Laporan & Analisis**
  - Dashboard dengan KPI proyek
  - Laporan laba rugi per proyek
  - Neraca & arus kas
  - Export laporan ke PDF/Excel/CSV/JSON dengan berbagai opsi kustomisasi

## Teknologi

- **Frontend**: Next.js, React, Chakra UI
- **Backend**: Node.js, Express
- **Database**: MySQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Export Tools**: XLSX, jsPDF, FileSaver

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
- MySQL (v8 atau lebih tinggi)

### Langkah Instalasi

1. **Clone repository**

```bash
git clone <repository-url>
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
6. Export Data untuk Analisis Lanjutan

### Struktur Database

Aplikasi menggunakan beberapa model data utama:
- clients: data pelanggan
- projects: informasi proyek
- project_costs: biaya-biaya proyek
- billings: penagihan dan pembayaran
- fixed_assets: aset tetap perusahaan
- transactions: transaksi keuangan
- chart_of_accounts: struktur akun keuangan

## Dokumentasi Tambahan

- [Fitur Export Laporan](docs/EXPORT_FEATURES.md) - Panduan lengkap untuk fitur export dengan berbagai format
- [Panduan Pengguna](docs/USER_GUIDE.md) - Panduan penggunaan aplikasi
- [Panduan Pengembangan](docs/DEVELOPER_GUIDE.md) - Dokumentasi untuk pengembang

## Lisensi

[Lisensi MIT](LICENSE) 