# Panduan Demo Aplikasi Akuntansi Proyek

## Persiapan Presentasi

Sebelum memulai presentasi, pastikan Anda telah melakukan langkah-langkah berikut:

1. Pastikan database MySQL sudah berjalan
2. Pastikan file `.env` di folder `backend` sudah dikonfigurasi dengan benar
3. Pastikan semua dependencies sudah terinstall:
   ```
   cd backend && npm install
   cd ../frontend && npm install
   ```
4. Jalankan seeder untuk mengisi database dengan data dummy:
   ```
   cd backend && npm run seed
   ```

## Menjalankan Aplikasi untuk Demo

Kami telah menyediakan script otomatis untuk menjalankan aplikasi dalam mode presentasi:

### Windows
```
start-demo.bat
```

### Linux/Mac
```
chmod +x start-demo.sh
./start-demo.sh
```

Script ini akan menjalankan backend dan frontend secara bersamaan dan memberikan informasi kredensial login.

## Kredensial Login

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Administrator |
| user | user123 | User biasa |

## Fitur Utama untuk Demo

### 1. Dashboard
- Tampilkan KPI utama (total proyek, pendapatan, biaya, WIP)
- Grafik tren pendapatan dan biaya
- Status proyek aktif

### 2. Manajemen Proyek
- Daftar proyek dengan status berbeda
- Detail proyek dengan biaya dan penagihan
- Perhitungan profitabilitas proyek

### 3. Manajemen Keuangan
- Transaksi keuangan
- Aset tetap dan penyusutan
- Laporan laba rugi

### 4. Laporan
- Laporan WIP (Work In Progress)
- Laporan profitabilitas proyek
- Laporan arus kas

## Data Dummy yang Tersedia

Aplikasi telah diisi dengan data dummy yang komprehensif:
- 5 klien dengan berbagai jenis perusahaan
- 6 proyek dengan status berbeda (selesai dan berlangsung)
- Biaya proyek dengan berbagai kategori
- Penagihan dengan status berbeda
- Aset tetap dengan data penyusutan
- Transaksi keuangan (pendapatan, biaya, operasional)

Detail lengkap tentang data dummy dapat dilihat di file `PRESENTASI-DATA.md`.

## Alur Demo yang Disarankan (Mengikuti Flow Utama)

### 1. Pengenalan dan Login
1. Login sebagai admin (admin/admin123)
2. Tunjukkan dashboard dengan ringkasan KPI dan status proyek

### 2. Input Proyek
1. Buka halaman Manajemen Klien dan tunjukkan daftar klien
2. Pilih salah satu klien (PT Pembangunan Jaya) dan tunjukkan detailnya
3. Buka halaman Manajemen Proyek dan tunjukkan daftar proyek
4. Demonstrasikan cara membuat proyek baru (opsional: tanpa perlu menyimpan)
5. Pilih proyek yang sudah selesai (BOR-2023-001) untuk ditampilkan detailnya

### 3. Catat Biaya
1. Pada detail proyek, buka tab Biaya Proyek
2. Tunjukkan daftar biaya yang sudah diinput untuk proyek tersebut
3. Demonstrasikan cara menambahkan biaya baru (opsional: tanpa perlu menyimpan)
4. Tunjukkan bagaimana biaya dikelompokkan berdasarkan kategori

### 4. Buat Invoice
1. Pada detail proyek, buka tab Penagihan
2. Tunjukkan daftar penagihan yang sudah dibuat untuk proyek tersebut
3. Demonstrasikan cara membuat penagihan baru (opsional: tanpa perlu menyimpan)
4. Tunjukkan status penagihan (paid, unpaid, partially_paid)

### 5. Terima Pembayaran
1. Buka halaman Transaksi Keuangan
2. Tunjukkan transaksi yang terkait dengan pembayaran invoice
3. Demonstrasikan cara mencatat pembayaran invoice (opsional: tanpa perlu menyimpan)
4. Tunjukkan bagaimana status penagihan berubah setelah pembayaran

### 6. Laporan
1. Buka halaman Laporan dan tunjukkan jenis-jenis laporan yang tersedia
2. Laporan Profitabilitas Proyek:
   - Pilih proyek yang sudah selesai (BOR-2023-001)
   - Tunjukkan margin profitabilitas dan analisis biaya
3. Laporan WIP:
   - Tunjukkan proyek yang sedang berlangsung (BOR-2023-004)
   - Jelaskan perhitungan WIP dan persentase penyelesaian
4. Laporan Arus Kas:
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
   - Demonstrasikan penanganan error dan sistem notifikasi

## Catatan Penting

- Jika Anda ingin mereset data, jalankan kembali seeder:
  ```
  cd backend && npm run seed
  ```
- Jika ada masalah koneksi ke backend, pastikan server backend berjalan di port 5000
- Untuk menghentikan aplikasi, tutup terminal atau tekan Ctrl+C pada terminal yang menjalankan script

## Kontak Dukungan Teknis

Jika Anda mengalami masalah teknis selama presentasi, silakan hubungi tim dukungan teknis kami:

- Email: support@example.com
- Telepon: 0812-3456-7890 