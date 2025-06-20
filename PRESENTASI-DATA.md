# Panduan Presentasi Aplikasi Akuntansi Proyek

## Flow Utama Aplikasi

Aplikasi Akuntansi Proyek ini dirancang mengikuti flow bisnis perusahaan jasa boring dan sondir:

```
Input Proyek → Catat Biaya → Buat Invoice → Terima Pembayaran → Laporan
```

Setiap langkah dalam flow ini didukung oleh data dummy yang komprehensif untuk keperluan presentasi.

## Data Dummy untuk Presentasi

Aplikasi telah diisi dengan data dummy yang representatif untuk keperluan presentasi. Berikut adalah ringkasan data yang tersedia:

### 1. Pengguna

Tersedia 2 akun untuk login:

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Administrator |
| user | user123 | User biasa |

### 2. Klien

Terdapat 5 klien dengan berbagai jenis perusahaan:

1. **PT Pembangunan Jaya** - Perusahaan konstruksi besar
2. **PT Konstruksi Maju Bersama** - Kontraktor bangunan
3. **PT Karya Bangun Sejahtera** - Pengembang properti
4. **Dinas PU Kota Surabaya** - Instansi pemerintah
5. **PT Graha Properti Indonesia** - Pengembang real estate

### 3. Proyek

Terdapat 6 proyek dengan berbagai status:

| Kode Proyek | Nama Proyek | Klien | Status | Nilai |
|-------------|-------------|-------|--------|-------|
| BOR-2023-001 | Boring Test Gedung Perkantoran CBD | PT Pembangunan Jaya | Selesai | Rp 175.000.000 |
| SON-2023-002 | Sondir Apartemen Grand Residence | PT Konstruksi Maju Bersama | Selesai | Rp 225.000.000 |
| BOR-2023-003 | Boring & Sondir Jembatan Cisadane | Dinas PU Kota Surabaya | Selesai | Rp 350.000.000 |
| BOR-2023-004 | Boring Test Mall Central Park | PT Graha Properti Indonesia | Berlangsung | Rp 275.000.000 |
| SON-2023-005 | Sondir Perumahan Green Valley | PT Karya Bangun Sejahtera | Berlangsung | Rp 185.000.000 |
| BOR-2024-001 | Boring & Sondir Gedung RSUD | Dinas PU Kota Surabaya | Berlangsung | Rp 320.000.000 |

### 4. Biaya Proyek

Setiap proyek memiliki biaya dengan berbagai kategori:

- **Material**: Pembelian bahan boring, material sondir, semen, pipa PVC, dll.
- **Tenaga Kerja**: Upah pekerja lapangan, honor surveyor, operator alat, dll.
- **Peralatan**: Sewa alat berat, generator, perawatan mesin, dll.
- **Transportasi**: Transportasi alat ke lokasi, BBM, sewa truk, dll.
- **Lain-lain**: Perizinan, konsumsi tim, akomodasi, biaya tak terduga, dll.

Proyek yang sudah selesai memiliki sekitar 8 entri biaya, sementara proyek yang masih berlangsung memiliki sekitar 4 entri biaya.

### 5. Penagihan (Billing)

Setiap proyek memiliki beberapa penagihan:

- Proyek selesai: 3 penagihan (semua berstatus "paid")
- Proyek berlangsung: 2 penagihan (1 "paid", 1 "unpaid" atau "partially_paid")

### 6. Aset Tetap

Terdapat 5 aset tetap dengan nilai dan penyusutan:

1. **Mesin Boring Tipe XL-500** - Nilai: Rp 450.000.000, Masa manfaat: 10 tahun
2. **Mesin Sondir Hidrolik** - Nilai: Rp 375.000.000, Masa manfaat: 8 tahun
3. **Kendaraan Operasional - Toyota Hilux** - Nilai: Rp 320.000.000, Masa manfaat: 5 tahun
4. **Peralatan Kantor** - Nilai: Rp 85.000.000, Masa manfaat: 4 tahun
5. **Alat Ukur Digital** - Nilai: Rp 125.000.000, Masa manfaat: 5 tahun

### 7. Transaksi Keuangan

Transaksi keuangan dibuat berdasarkan:

1. **Pendapatan**: Transaksi dari pembayaran invoice klien
2. **Beban Proyek**: Transaksi dari pembayaran biaya proyek
3. **Beban Operasional**: Transaksi non-proyek seperti gaji, utilitas, dll.

## Alur Demo Presentasi (Mengikuti Flow Utama)

### 1. Login dan Dashboard

1. Login menggunakan akun admin (admin/admin123)
2. Tunjukkan dashboard dengan ringkasan KPI:
   - Total proyek aktif dan selesai
   - Pendapatan vs biaya
   - Status penagihan
   - Nilai WIP (Work In Progress)

### 2. Input Proyek

1. Buka halaman Manajemen Klien
2. Tampilkan detail salah satu klien (PT Pembangunan Jaya)
3. Buka halaman Manajemen Proyek
4. Tunjukkan cara membuat proyek baru
5. Tampilkan daftar proyek dengan status berbeda

### 3. Catat Biaya

1. Pilih proyek (BOR-2023-001)
2. Buka tab Biaya Proyek
3. Tunjukkan daftar biaya yang sudah diinput
4. Demonstrasikan cara menambahkan biaya baru
5. Tunjukkan pengelompokan biaya berdasarkan kategori

### 4. Buat Invoice

1. Pada proyek yang sama, buka tab Penagihan
2. Tunjukkan daftar penagihan yang sudah dibuat
3. Demonstrasikan cara membuat penagihan baru
4. Tunjukkan status penagihan (paid/unpaid)

### 5. Terima Pembayaran

1. Buka halaman Transaksi Keuangan
2. Tunjukkan transaksi terkait pembayaran invoice
3. Demonstrasikan cara mencatat pembayaran
4. Tunjukkan perubahan status penagihan setelah pembayaran

### 6. Laporan Keuangan

1. Laporan Laba Rugi Proyek:
   - Pilih proyek yang sudah selesai (BOR-2023-001)
   - Tunjukkan margin profitabilitas dan analisis biaya
   
2. Laporan WIP (Work In Progress):
   - Tunjukkan proyek yang sedang berlangsung
   - Jelaskan perhitungan WIP dan persentase penyelesaian
   
3. Laporan Arus Kas:
   - Tunjukkan arus kas masuk dan keluar
   - Filter berdasarkan periode

### 7. Fitur Khusus

1. Manajemen Aset Tetap:
   - Tunjukkan daftar aset tetap
   - Demonstrasikan perhitungan penyusutan otomatis
   
2. Validasi Data dan Business Rules:
   - Tunjukkan contoh validasi pada form input
   - Jelaskan business rules yang diimplementasikan
   
3. Error Handling dan Notifikasi:
   - Demonstrasikan penanganan error
   - Tunjukkan sistem notifikasi

## Catatan Teknis

- Database telah diisi dengan data dummy yang mencakup semua entitas utama
- Seluruh perhitungan otomatis sudah diimplementasikan
- Semua fitur utama dapat didemonstrasikan dengan data yang tersedia

## Kredensial Database (Jika Diperlukan)

- **Host**: localhost
- **Port**: 3306
- **Database**: accounting_app
- **Username**: root
- **Password**: (sesuai konfigurasi lokal)

## Menjalankan Aplikasi

1. Backend: `cd app_accounting/backend && npm run dev`
2. Frontend: `cd app_accounting/frontend && npm run dev`
3. Akses aplikasi di browser: `http://localhost:3000` 