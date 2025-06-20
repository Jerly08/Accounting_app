# Panduan Penggunaan Modul Transaksi Keuangan

Modul Transaksi Keuangan pada aplikasi akuntansi proyek ini memungkinkan Anda untuk mencatat, melacak, dan mengelola semua transaksi keuangan perusahaan. Dokumen ini menjelaskan cara menggunakan modul transaksi keuangan yang telah ditingkatkan.

## Daftar Isi
1. [Mengakses Halaman Transaksi](#1-mengakses-halaman-transaksi)
2. [Memahami Struktur Halaman](#2-memahami-struktur-halaman)
3. [Menggunakan Filter Transaksi](#3-menggunakan-filter-transaksi)
4. [Menambahkan Transaksi Baru](#4-menambahkan-transaksi-baru)
5. [Mengedit Transaksi](#5-mengedit-transaksi)
6. [Menghapus Transaksi](#6-menghapus-transaksi)
7. [Mengekspor Data Transaksi](#7-mengekspor-data-transaksi)
8. [Alur Kerja Transaksi Umum](#8-alur-kerja-transaksi-umum)

## 1. Mengakses Halaman Transaksi

1. Login ke aplikasi dengan kredensial Anda
2. Pada sidebar navigasi, klik menu "Financial"
3. Pilih submenu "Transactions"
4. Halaman Transaksi Keuangan akan terbuka dengan daftar transaksi terbaru

## 2. Memahami Struktur Halaman

Halaman Transaksi Keuangan terdiri dari beberapa bagian utama:

- **Header**: Menampilkan judul halaman dan tombol aksi (Tambah Transaksi, Ekspor Excel)
- **Bagian Filter**: Memungkinkan Anda menyaring transaksi berdasarkan berbagai kriteria
- **Kartu Ringkasan**: Menampilkan total pemasukan, pengeluaran, dan arus kas bersih
- **Tabel Transaksi**: Menampilkan daftar transaksi yang sesuai dengan filter yang diterapkan

## 3. Menggunakan Filter Transaksi

Anda dapat menyaring transaksi menggunakan opsi berikut:

- **Pencarian**: Masukkan kata kunci untuk mencari deskripsi atau nama akun
- **Filter Jenis**: Pilih jenis transaksi (Pemasukan, Pengeluaran, Transfer, atau Semua)
- **Filter Akun**: Pilih akun tertentu untuk melihat transaksinya
- **Filter Proyek**: Pilih proyek tertentu untuk melihat transaksinya
- **Rentang Tanggal**: Tentukan tanggal mulai dan tanggal akhir untuk melihat transaksi dalam periode tersebut

Setelah menerapkan filter, daftar transaksi akan diperbarui secara otomatis. Untuk menghapus semua filter, klik tombol "Reset Filter".

## 4. Menambahkan Transaksi Baru

Untuk menambahkan transaksi baru:

1. Klik tombol "Add Transaction" di bagian atas halaman
2. Pada form yang muncul:
   - Pilih jenis transaksi (Pemasukan, Pengeluaran, atau Transfer)
   - Masukkan tanggal transaksi
   - Pilih akun yang sesuai (untuk Transfer, pilih akun sumber dan tujuan)
   - Pilih proyek terkait (opsional)
   - Masukkan deskripsi transaksi (akan otomatis terisi berdasarkan akun yang dipilih)
   - Masukkan jumlah transaksi
   - Tambahkan catatan tambahan jika diperlukan
   - Untuk Pemasukan/Pengeluaran, pilih apakah akan membuat transaksi penyeimbang otomatis
3. Klik tombol "Simpan" untuk menyimpan transaksi

### Jenis Transaksi

- **Pemasukan**: Untuk mencatat pendapatan atau penerimaan uang
- **Pengeluaran**: Untuk mencatat biaya atau pengeluaran uang
- **Transfer**: Untuk mencatat pemindahan uang antar akun (misalnya dari Kas ke Bank)

### Transaksi Penyeimbang Otomatis

Saat membuat transaksi Pemasukan atau Pengeluaran, Anda dapat memilih untuk membuat transaksi penyeimbang secara otomatis:

- Untuk **Pemasukan**: Sistem akan membuat transaksi pendapatan yang sesuai
- Untuk **Pengeluaran**: Sistem akan membuat transaksi beban yang sesuai

Transaksi penyeimbang ini memastikan bahwa pembukuan tetap seimbang (debit = kredit).

## 5. Mengedit Transaksi

Untuk mengedit transaksi yang sudah ada:

1. Temukan transaksi yang ingin diedit dalam tabel
2. Klik ikon menu tiga titik (⋮) di kolom "Actions"
3. Pilih "Edit" dari menu dropdown
4. Perbarui informasi transaksi sesuai kebutuhan
5. Klik "Perbarui" untuk menyimpan perubahan

**Catatan**: Transaksi yang dibuat secara otomatis (ditandai dengan badge "Auto") tidak dapat diedit secara langsung.

## 6. Menghapus Transaksi

Untuk menghapus transaksi:

1. Temukan transaksi yang ingin dihapus dalam tabel
2. Klik ikon menu tiga titik (⋮) di kolom "Actions"
3. Pilih "Delete" dari menu dropdown
4. Konfirmasi penghapusan pada dialog konfirmasi

**Catatan**: Transaksi yang dibuat secara otomatis (ditandai dengan badge "Auto") tidak dapat dihapus secara langsung.

## 7. Mengekspor Data Transaksi

Untuk mengekspor data transaksi:

1. Terapkan filter yang diinginkan untuk mendapatkan data yang spesifik
2. Klik tombol "Export" di bagian atas halaman
3. Sistem akan mencoba mengekspor data dalam format Excel (.xlsx)
4. Jika server mengalami masalah, sistem akan otomatis beralih ke ekspor CSV lokal dengan notifikasi
5. File akan diunduh secara otomatis dengan nama `transaksi_keuangan_YYYY-MM-DD.xlsx` (atau `.csv` untuk mode offline)
6. Notifikasi sukses akan muncul menampilkan informasi tentang file yang diunduh

### Indikator Keberhasilan Ekspor

Setelah ekspor berhasil, Anda akan melihat:

1. **Notifikasi Toast** - Muncul di sudut kanan atas dengan detail tentang data yang diekspor
2. **Indikator Sukses** - Tanda centang hijau pada tombol Export
3. **Banner Informasi** - Muncul di bawah header dengan detail file yang diunduh
4. **Perubahan Status Tombol** - Tombol Export akan kembali ke keadaan normal setelah ekspor selesai

### Perbedaan Format Ekspor

- **Format Excel (.xlsx)**:
  - Diproses oleh server
  - Memiliki format yang lebih baik dengan warna dan pemformatan
  - Berisi informasi lengkap termasuk data relasi
  - Memiliki ringkasan total di bagian bawah

- **Format CSV (.csv)**:
  - Diproses secara lokal di browser (fallback mode)
  - Format lebih sederhana tetapi kompatibel dengan semua aplikasi spreadsheet
  - Berisi data yang saat ini ditampilkan di halaman
  - Berfungsi bahkan ketika server tidak tersedia

**Catatan**: Mode ekspor offline (CSV) akan tetap berfungsi bahkan ketika koneksi ke server bermasalah, sehingga Anda selalu dapat mengekspor data transaksi dalam situasi apapun.

## 8. Alur Kerja Transaksi Umum

### Mencatat Penerimaan Pembayaran

1. Klik "Add Transaction"
2. Pilih jenis transaksi "Pemasukan"
3. Pilih akun bank/kas yang menerima uang
4. Pilih proyek terkait
5. Masukkan jumlah dan deskripsi (misalnya, "Penerimaan Pembayaran 9001")
6. Aktifkan opsi "Buat Transaksi Penyeimbang" untuk membuat transaksi pendapatan secara otomatis
7. Klik "Simpan"

### Mencatat Pengeluaran

1. Klik "Add Transaction"
2. Pilih jenis transaksi "Pengeluaran"
3. Pilih akun kas/bank yang digunakan untuk membayar
4. Pilih proyek terkait (jika ada)
5. Masukkan jumlah dan deskripsi (misalnya, "Pembayaran Sewa Peralatan")
6. Aktifkan opsi "Buat Transaksi Penyeimbang" untuk membuat transaksi beban secara otomatis
7. Klik "Simpan"

### Mencatat Transfer Antar Akun

1. Klik "Add Transaction"
2. Pilih jenis transaksi "Transfer"
3. Pilih akun sumber (dari mana uang berasal)
4. Pilih akun tujuan (ke mana uang ditransfer)
5. Masukkan jumlah dan deskripsi
6. Klik "Simpan"

---

Dengan mengikuti panduan ini, Anda dapat mengelola transaksi keuangan perusahaan dengan efisien dan akurat. Jika Anda memiliki pertanyaan lebih lanjut, silakan hubungi administrator sistem. 