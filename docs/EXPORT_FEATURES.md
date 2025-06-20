# Fitur Export pada Aplikasi Akuntansi Proyek

## Pengantar

Fitur export pada aplikasi akuntansi proyek memungkinkan pengguna untuk mengekspor data dari berbagai laporan dalam berbagai format yang umum digunakan. Fitur ini dirancang untuk memudahkan pengguna menganalisis data di luar aplikasi atau berbagi laporan dengan pihak lain.

## Format Export yang Didukung

Aplikasi ini mendukung export data dalam format berikut:

1. **Excel (.xlsx)** - Format spreadsheet Microsoft Excel yang umum digunakan untuk analisis data dan laporan keuangan.
2. **CSV (.csv)** - Format nilai yang dipisahkan koma, cocok untuk diimpor ke berbagai aplikasi.
3. **PDF (.pdf)** - Format dokumen portabel untuk melihat dan mencetak laporan dengan tampilan yang konsisten.
4. **JSON (.json)** - Format data terstruktur untuk kebutuhan integrasi dengan sistem lain.

## Cara Menggunakan Fitur Export

1. Buka halaman laporan yang ingin diekspor (misalnya Laporan Arus Kas, Neraca, atau Profitabilitas Proyek).
2. Klik tombol "Export" di bagian atas halaman.
3. Pilih format export yang diinginkan dari menu dropdown.
4. File akan otomatis diunduh ke komputer Anda.

## Halaman dengan Fitur Export

Berikut adalah daftar halaman yang mendukung fitur export:

| Halaman | Rute | Format yang Didukung |
|---------|------|----------------------|
| Laporan Arus Kas | `/reports/cash-flow` | Excel, CSV, PDF, JSON |
| Neraca | `/reports/balance-sheet` | Excel, CSV, PDF, JSON |
| Profitabilitas Proyek | `/reports/project-profitability` | Excel, CSV, PDF, JSON |
| Laporan WIP | `/reports/wip-report` | Excel, CSV, PDF, JSON |
| Transaksi Keuangan | `/financial/transactions` | Excel, CSV |

## Kustomisasi Export

### Untuk Pengembang

Komponen ExportButton dapat dikustomisasi melalui berbagai props:

```jsx
<ExportButton 
  data={dataArray}                  // Data yang akan diekspor (array of objects)
  filename="nama_file"              // Nama file tanpa ekstensi
  onExport={handleExportComplete}   // Callback setelah export selesai
  isDisabled={false}                // Apakah tombol dinonaktifkan
  buttonText="Export"               // Teks pada tombol
  tooltipText="Export data"         // Teks tooltip
  pdfConfig={{                      // Konfigurasi untuk PDF
    orientation: 'landscape',       // 'portrait' atau 'landscape'
    title: 'Judul Laporan'          // Judul laporan di PDF
  }}
/>
```

### Format Data untuk Export

Data yang akan diekspor harus dalam format array of objects, dengan setiap object memiliki properti yang konsisten. Contoh:

```javascript
const data = [
  {
    id: 1,
    name: 'Project A',
    amount: 1000000,
    status: 'Completed'
  },
  {
    id: 2,
    name: 'Project B',
    amount: 2000000,
    status: 'Ongoing'
  }
];
```

## Masalah Umum dan Solusi

| Masalah | Kemungkinan Penyebab | Solusi |
|---------|----------------------|--------|
| Tombol export tidak aktif | Tidak ada data untuk diekspor | Pastikan ada data yang ditampilkan di laporan |
| PDF tidak menampilkan semua data | Terlalu banyak kolom untuk layout halaman | Gunakan orientasi landscape untuk data dengan banyak kolom |
| Format CSV tidak terbaca dengan benar di Excel | Karakter non-ASCII atau masalah encoding | CSV sudah menggunakan BOM UTF-8 untuk kompatibilitas Excel |

## Dependensi yang Digunakan

Fitur export menggunakan beberapa library berikut:

- `xlsx` - Untuk export format Excel dan CSV
- `jspdf` dan `jspdf-autotable` - Untuk export format PDF
- `file-saver` - Untuk menyimpan file ke sistem lokal

## Catatan Pengembangan Selanjutnya

- Menambahkan opsi untuk menyesuaikan kolom yang akan diekspor
- Menambahkan dukungan untuk kustomisasi header dan footer pada PDF
- Implementasi fitur scheduling export reguler untuk laporan bulanan/tahunan
- Integrasi dengan penyimpanan cloud (Google Drive, Dropbox) 