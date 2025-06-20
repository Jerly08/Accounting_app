# Langkah 9: Integrasi & Business Logic

Pada langkah ini, kami telah mengimplementasikan berbagai fitur untuk integrasi dan business logic pada aplikasi akuntansi proyek. Berikut adalah ringkasan fitur-fitur yang telah diimplementasikan:

## 1. Perhitungan Otomatis Penyusutan Aset Tetap

### Fitur:
- Perhitungan penyusutan menggunakan metode garis lurus (straight line)
- Perhitungan otomatis nilai buku berdasarkan nilai aset dan akumulasi penyusutan
- Cron job untuk menjalankan perhitungan penyusutan secara otomatis setiap hari
- API endpoint untuk menghitung penyusutan satu aset atau semua aset

### File terkait:
- `app_accounting/backend/src/services/depreciation.js` - Service untuk perhitungan penyusutan
- `app_accounting/backend/src/routes/assets.js` - Endpoint untuk perhitungan penyusutan
- `app_accounting/backend/src/index.js` - Konfigurasi cron job

## 2. Perhitungan WIP (Work In Progress)

### Fitur:
- Perhitungan nilai WIP berdasarkan biaya proyek dan penagihan
- Perhitungan persentase penyelesaian proyek
- API endpoint untuk mendapatkan data WIP per proyek atau ringkasan

### File terkait:
- `app_accounting/backend/src/routes/wip.js` - Endpoint untuk data WIP

## 3. Perhitungan Laba Rugi Proyek

### Fitur:
- Perhitungan laba kotor per proyek
- Perhitungan margin laba dan ROI (Return on Investment)
- Perhitungan rasio biaya terhadap nilai proyek
- API endpoint untuk mendapatkan data profitabilitas proyek

### File terkait:
- `app_accounting/backend/src/services/profitability.js` - Service untuk perhitungan profitabilitas
- `app_accounting/backend/src/routes/profitability.js` - Endpoint untuk data profitabilitas

## 4. Validasi Data dan Business Rules

### Fitur:
- Validasi data untuk semua entitas utama (proyek, biaya, penagihan, aset, transaksi)
- Validasi tipe data dan nilai (angka positif, tanggal valid, dll.)
- Validasi relasi antar entitas

### File terkait:
- `app_accounting/backend/src/services/validation.js` - Service untuk validasi data

## 5. Error Handling dan Notifications

### Fitur:
- Middleware untuk menangani error secara konsisten
- Format response error yang seragam
- Penanganan error khusus untuk Prisma (database)
- Logging error untuk debugging

### File terkait:
- `app_accounting/backend/src/middleware/errorHandler.js` - Middleware error handling
- `app_accounting/backend/src/services/validation.js` - Format error response

## Cara Menggunakan

### Menjalankan Perhitungan Penyusutan

```bash
# Menghitung penyusutan untuk satu aset
POST /api/assets/:id/calculate-depreciation

# Menghitung penyusutan untuk semua aset (admin only)
POST /api/assets/calculate-all-depreciation
```

### Mendapatkan Data Profitabilitas

```bash
# Mendapatkan data profitabilitas semua proyek
GET /api/profitability

# Mendapatkan ringkasan profitabilitas
GET /api/profitability/summary

# Mendapatkan data profitabilitas satu proyek
GET /api/profitability/:projectId
```

### Mendapatkan Data WIP

```bash
# Mendapatkan data WIP semua proyek
GET /api/wip

# Mendapatkan ringkasan WIP
GET /api/wip/summary

# Mendapatkan data WIP satu proyek
GET /api/wip/:projectId
```

## Catatan Implementasi

- Perhitungan penyusutan aset tetap dijalankan secara otomatis setiap hari pada jam 00:00 menggunakan node-cron
- Semua nilai keuangan diformat dengan 2 angka desimal untuk konsistensi
- Error handling menggunakan middleware untuk memastikan format response yang seragam
- Validasi data dilakukan pada level service untuk memastikan integritas data 