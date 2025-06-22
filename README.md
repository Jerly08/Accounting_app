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

# Accounting Application

This is an accounting application that provides various financial management tools including Work In Progress (WIP) reporting.

## Setup Instructions

### Prerequisites
- Node.js (v16 or later)
- npm or yarn

### Backend Setup
1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
   - Create a `.env` file based on `.env.example`
   - Configure database connection settings

4. Start the backend server:
```bash
npm run dev
# or
yarn dev
```

The backend should now be running on http://localhost:5000

### Frontend Setup
1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the frontend development server:
```bash
npm run dev
# or
yarn dev
```

The frontend should now be running on http://localhost:3000

## Features

### Work In Progress (WIP) Reporting

The WIP reporting feature allows you to:
- View all current Work In Progress across your projects
- Filter projects by status (ongoing, completed, cancelled)
- View detailed WIP analysis including:
  - WIP by age
  - WIP by client
  - Risk assessment
  - Trend analysis
- Export reports in various formats (Excel, CSV, PDF, JSON)
- Recalculate WIP for individual projects or all projects

To access the WIP report:
1. Log in to the application
2. Navigate to Reports > WIP Report
3. Or go directly to: http://localhost:3000/reports/wip-report

## WIP Calculation Method

Work In Progress (WIP) is calculated using the Earned Value Method:
- WIP = Earned Value - Amount Billed
- Earned Value = Project Value × Completion Percentage

This method provides an accurate representation of unbilled work value for financial reporting.

## Troubleshooting

- If you experience issues with WIP calculation, use the "Recalculate" button to refresh the data
- Ensure your project progress values are up-to-date for accurate WIP calculations
- For any API connection issues, verify that both frontend and backend are running properly

