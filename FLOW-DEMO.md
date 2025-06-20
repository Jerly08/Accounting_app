# Flow Utama Aplikasi Akuntansi Proyek

## Panduan Cepat untuk Presentasi

### Flow Utama Bisnis
```
Input Proyek → Catat Biaya → Buat Invoice → Terima Pembayaran → Laporan
```

## 1. Input Proyek

### Fitur yang Didemonstrasikan:
- Manajemen klien
- Pembuatan proyek baru
- Pengaturan detail proyek (nilai, tanggal mulai/selesai, status)

### Data Dummy yang Tersedia:
- 5 klien dengan berbagai jenis perusahaan
- 6 proyek (3 selesai, 3 berlangsung)

### Contoh untuk Demo:
- Klien: PT Pembangunan Jaya
- Proyek Selesai: BOR-2023-001 (Boring Test Gedung Perkantoran CBD)
- Proyek Berlangsung: BOR-2023-004 (Boring Test Mall Central Park)

## 2. Catat Biaya

### Fitur yang Didemonstrasikan:
- Input biaya proyek dengan kategori
- Approval biaya
- Perhitungan total biaya per proyek

### Data Dummy yang Tersedia:
- Berbagai kategori biaya (material, tenaga kerja, peralatan, transportasi, lain-lain)
- Proyek selesai: ~8 entri biaya
- Proyek berlangsung: ~4 entri biaya

### Contoh untuk Demo:
- Biaya Material: "Pembelian Bahan Boring" - Rp 15.000.000
- Biaya Tenaga Kerja: "Upah Pekerja Lapangan" - Rp 12.000.000

## 3. Buat Invoice

### Fitur yang Didemonstrasikan:
- Pembuatan invoice berdasarkan persentase penyelesaian
- Pengelolaan status invoice
- Perhitungan total penagihan vs nilai proyek

### Data Dummy yang Tersedia:
- Proyek selesai: 3 penagihan (semua "paid")
- Proyek berlangsung: 2 penagihan (1 "paid", 1 "unpaid"/"partially_paid")

### Contoh untuk Demo:
- Invoice 1: 30% dari nilai proyek - status "paid"
- Invoice 2: 40% dari nilai proyek - status "paid"
- Invoice 3: 30% dari nilai proyek - status "unpaid" (untuk proyek berlangsung)

## 4. Terima Pembayaran

### Fitur yang Didemonstrasikan:
- Pencatatan pembayaran invoice
- Update status invoice
- Transaksi keuangan terkait pembayaran

### Data Dummy yang Tersedia:
- Transaksi pendapatan dari pembayaran invoice
- Transaksi kas/bank terkait penerimaan pembayaran

### Contoh untuk Demo:
- Pembayaran Invoice BOR-2023-001: Rp 52.500.000 (30% dari Rp 175.000.000)
- Transaksi debit ke akun Bank BCA / Kas
- Transaksi credit ke akun Pendapatan Jasa Boring

## 5. Laporan

### Fitur yang Didemonstrasikan:
- Laporan Laba Rugi Proyek
- Laporan WIP (Work In Progress)
- Laporan Arus Kas

### Data Dummy yang Tersedia:
- Profitabilitas proyek selesai
- WIP untuk proyek berlangsung
- Transaksi keuangan untuk laporan arus kas

### Contoh untuk Demo:
- Profitabilitas BOR-2023-001: Pendapatan vs Biaya, Margin Laba
- WIP BOR-2023-004: Biaya yang sudah dikeluarkan vs Penagihan
- Arus Kas: Filter transaksi per periode (Maret-April 2023)

## Fitur Khusus

### 1. Manajemen Aset Tetap
- Perhitungan penyusutan otomatis
- Contoh: Mesin Boring Tipe XL-500, nilai Rp 450.000.000, penyusutan Rp 67.500.000

### 2. Validasi Data dan Business Rules
- Validasi input pada form
- Business rules untuk approval biaya dan penagihan

### 3. Error Handling dan Notifikasi
- Penanganan error saat input data tidak valid
- Notifikasi untuk status penagihan dan approval biaya 