# Integrasi Logika Akuntansi dan Bisnis pada Balance Sheet

## Pengantar

Dokumen ini menjelaskan integrasi logika akuntansi dan bisnis pada Balance Sheet (Neraca) dalam aplikasi akuntansi. Integrasi ini bertujuan untuk memastikan bahwa neraca seimbang dan mencerminkan posisi keuangan perusahaan dengan akurat.

## Struktur Data Akuntansi

### Jenis Akun

Aplikasi menggunakan beberapa jenis akun yang dikelompokkan berdasarkan standar akuntansi:

1. **Aktiva/Aset**: Sumber daya yang dimiliki perusahaan
   - Kas dan Setara Kas (1101-1103)
   - Piutang Usaha (1201)
   - Pekerjaan Dalam Proses/WIP (1301)
   - Aset Tetap (1501-1505)

2. **Kontra Aset**: Akun yang mengurangi nilai aset
   - Akumulasi Penyusutan (1601-1605)

3. **Kewajiban/Hutang**: Kewajiban perusahaan kepada pihak lain
   - Hutang Jangka Pendek (2101-2104)
   - Hutang Jangka Panjang (2201-2202)

4. **Ekuitas**: Modal pemilik dalam perusahaan
   - Modal Saham (3101)
   - Laba Ditahan (3102)

5. **Pendapatan**: Penghasilan dari kegiatan operasional
   - Pendapatan Jasa (4001-4003)

6. **Beban**: Pengeluaran untuk kegiatan operasional
   - Beban Proyek (5101-5105)
   - Beban Operasional (6101-6105)

## Integrasi Logika Akuntansi

### 1. Penanganan Tipe Akun

Aplikasi memetakan tipe akun dalam bahasa Indonesia ke standar internasional:

```javascript
const accountTypeMap = {
  'Aktiva': 'asset',
  'Aset': 'asset',
  'Aset Tetap': 'asset',
  'Kontra Aset': 'asset',
  'Kewajiban': 'liability',
  'Hutang': 'liability',
  'Ekuitas': 'equity',
  'Modal': 'equity',
  'Pendapatan': 'revenue',
  'Beban': 'expense'
};
```

### 2. Perhitungan Saldo Akun

Perhitungan saldo akun mengikuti prinsip akuntansi:

- **Aset**: Debit menambah, Kredit mengurangi
- **Liabilitas & Ekuitas**: Debit mengurangi, Kredit menambah
- **Pendapatan**: Debit mengurangi, Kredit menambah
- **Beban**: Debit menambah, Kredit mengurangi

### 3. Penanganan Khusus untuk Akun Kontra Aset

Akun kontra aset (seperti Akumulasi Penyusutan) memiliki saldo negatif untuk mengurangi nilai aset:

```javascript
if (account.type === 'Kontra Aset') {
  if (accountBalances[account.code].balance > 0) {
    accountBalances[account.code].balance = -accountBalances[account.code].balance;
  }
}
```

## Integrasi Logika Bisnis

### 1. Penanganan Aset Tetap

Aset tetap dikelola dalam tabel terpisah (`fixedasset`) dengan informasi tambahan:
- Tanggal perolehan
- Nilai perolehan
- Umur manfaat
- Akumulasi penyusutan
- Nilai buku

Untuk menghindari duplikasi, aset tetap dari akun (15xx) tidak dihitung dalam total aset:

```javascript
const assetAccountsWithoutFixedAssets = Object.values(accountBalances)
  .filter(account => account.standardType === 'asset' && !account.code.startsWith('15'));
```

### 2. Penanganan Work In Progress (WIP)

WIP mewakili proyek yang sedang berlangsung dengan formula:
- WIP = Total Biaya Proyek - Total Penagihan

WIP positif (biaya > penagihan) adalah aset.
WIP negatif (penagihan > biaya) adalah kewajiban (uang muka dari pelanggan).

```javascript
if (wipValue > 0) {
  totalWIP += wipValue;
} else {
  totalNegativeWIP += Math.abs(wipValue);
}
```

### 3. Penanganan Laba Bersih

Laba bersih dihitung dari pendapatan dikurangi beban dan ditambahkan ke ekuitas:

```javascript
const totalRevenue = revenue.reduce((sum, rev) => sum + rev.balance, 0);
const totalExpense = expense.reduce((sum, exp) => sum + exp.balance, 0);
const netIncome = totalRevenue - totalExpense;
const totalEquityWithIncome = totalEquity + netIncome;
```

## Persamaan Dasar Akuntansi

Aplikasi memastikan persamaan dasar akuntansi terpenuhi:

**Aset = Liabilitas + Ekuitas**

```javascript
const totalAssets = totalAccountAssets + totalFixedAssets + totalWIP;
const totalLiabilitiesAndEquity = totalLiabilities + totalEquityWithIncome;
const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;
```

## Pengelompokan Akun dalam Laporan

Akun dikelompokkan berdasarkan kategori untuk mempermudah pembacaan:

1. **Aset**:
   - Dikelompokkan berdasarkan kategori (Current Assets, Fixed Assets, dll)
   - Aset tetap ditampilkan dari tabel `fixedasset`
   - WIP positif ditampilkan sebagai aset

2. **Liabilitas**:
   - Dikelompokkan berdasarkan kategori (Current Liabilities, Long-term Liabilities, dll)
   - WIP negatif ditambahkan sebagai "Advance from Customers"

3. **Ekuitas**:
   - Menampilkan modal dan laba ditahan
   - Laba bersih ditampilkan terpisah dan ditambahkan ke total ekuitas

## Kesimpulan

Integrasi logika akuntansi dan bisnis pada Balance Sheet memastikan bahwa:
1. Semua transaksi dicatat dengan benar sesuai prinsip akuntansi
2. Aset tetap dan WIP ditangani dengan tepat
3. Persamaan dasar akuntansi terpenuhi
4. Laporan keuangan disajikan dengan jelas dan informatif

Dengan integrasi ini, Balance Sheet memberikan gambaran yang akurat tentang posisi keuangan perusahaan pada tanggal tertentu. 