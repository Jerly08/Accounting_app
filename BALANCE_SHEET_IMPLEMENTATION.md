# Implementasi Integrasi Logika Akuntansi dan Bisnis pada Balance Sheet

## Ringkasan

Dokumen ini menjelaskan implementasi integrasi logika akuntansi dan bisnis pada laporan Balance Sheet (Neraca) dalam aplikasi akuntansi. Implementasi ini memastikan bahwa data liabilities (kewajiban) ditampilkan dengan benar dalam laporan neraca sesuai dengan standar akuntansi.

## Permasalahan

Sebelumnya, laporan Balance Sheet tidak menampilkan data liabilities (kewajiban) sehingga nilai total liabilities selalu 0. Hal ini menyebabkan laporan neraca tidak seimbang dan tidak mencerminkan kondisi keuangan perusahaan yang sebenarnya.

## Solusi

Implementasi solusi meliputi beberapa langkah berikut:

1. **Penambahan Akun Kewajiban**
   - Menambahkan akun-akun kewajiban (liabilities) ke dalam Chart of Accounts
   - Mengkategorikan akun kewajiban sesuai dengan standar akuntansi (Hutang Lancar dan Hutang Jangka Panjang)
   - Mengintegrasikan akun kewajiban dengan kategori cashflow untuk laporan arus kas

2. **Pembuatan Transaksi Kewajiban**
   - Membuat transaksi untuk hutang usaha (accounts payable)
   - Membuat transaksi untuk hutang pajak
   - Membuat transaksi untuk beban yang masih harus dibayar (accrued expenses)
   - Memastikan transaksi hutang bank jangka panjang sudah ada

3. **Perbaikan Service Balance Sheet**
   - Memperbarui service Balance Sheet untuk menangani data liabilities dengan benar
   - Menambahkan dukungan untuk tipe akun dalam bahasa Indonesia (Kewajiban, Aset, Ekuitas)
   - Memastikan perhitungan saldo akun kewajiban mengikuti prinsip akuntansi yang benar

4. **Integrasi dengan Frontend**
   - Memastikan data liabilities ditampilkan dengan benar di frontend
   - Menampilkan kategori kewajiban dan akun-akun di dalamnya
   - Menghitung total liabilities dan memastikan balance sheet seimbang

## Detail Implementasi

### 1. Struktur Akun Kewajiban

Akun kewajiban dibagi menjadi dua kategori utama:

#### Hutang Lancar (Current Liabilities)
- 2101: Hutang Bank Jangka Pendek
- 2102: Hutang Usaha
- 2103: Hutang Pajak
- 2104: Beban Yang Masih Harus Dibayar

#### Hutang Jangka Panjang (Long-term Liabilities)
- 2201: Hutang Bank Jangka Panjang
- 2202: Hutang Leasing

### 2. Logika Akuntansi untuk Kewajiban

- **Tipe Transaksi**:
  - `income`: Meningkatkan kewajiban
  - `expense`: Menurunkan kewajiban

- **Perhitungan Saldo**:
  - Untuk kewajiban, debit mengurangi saldo, kredit menambah saldo
  - `isDebitType` (`expense`, `debit`, `WIP_INCREASE`): Mengurangi saldo kewajiban
  - `isCreditType` (`income`, `credit`, `WIP_DECREASE`, `REVENUE`): Menambah saldo kewajiban

### 3. Integrasi dengan Cashflow

Akun kewajiban dikategorikan dalam laporan arus kas sebagai berikut:

- **Hutang Lancar**: Kategori `operating`, subkategori `current_liabilities`
- **Hutang Jangka Panjang**: Kategori `financing`, subkategori `long_term_debt`

### 4. Contoh Transaksi

1. **Hutang Usaha (Accounts Payable)**
   - Transaksi: Pembelian material proyek secara kredit
   - Akun: 2102 (Hutang Usaha)
   - Tipe: income (meningkatkan kewajiban)
   - Counter: 1301 (Pekerjaan Dalam Proses)

2. **Hutang Pajak**
   - Transaksi: PPN keluaran yang belum disetor
   - Akun: 2103 (Hutang Pajak)
   - Tipe: income (meningkatkan kewajiban)

3. **Beban Yang Masih Harus Dibayar**
   - Transaksi: Akrual gaji karyawan akhir bulan
   - Akun: 2104 (Beban Yang Masih Harus Dibayar)
   - Tipe: income (meningkatkan kewajiban)
   - Counter: 6102 (Beban Gaji & Tunjangan)

4. **Hutang Bank Jangka Panjang**
   - Transaksi: Penerimaan pinjaman bank
   - Akun: 2201 (Hutang Bank Jangka Panjang)
   - Tipe: income (meningkatkan kewajiban)
   - Counter: 1102 (Bank BCA)

## Kesimpulan

Implementasi ini memastikan bahwa laporan Balance Sheet menampilkan data liabilities dengan benar sesuai dengan standar akuntansi. Dengan adanya data liabilities, laporan neraca menjadi seimbang dan mencerminkan kondisi keuangan perusahaan yang sebenarnya.

Integrasi logika akuntansi dan bisnis pada Balance Sheet juga memastikan bahwa data keuangan konsisten di seluruh aplikasi, termasuk laporan arus kas dan laporan laba rugi. 