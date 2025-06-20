-- CreateTable
CREATE TABLE `Setting` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `companyName` VARCHAR(191) NOT NULL,
  `companyAddress` VARCHAR(191) NULL,
  `companyPhone` VARCHAR(191) NULL,
  `companyEmail` VARCHAR(191) NULL,
  `taxNumber` VARCHAR(191) NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'IDR',
  `currencySymbol` VARCHAR(191) NOT NULL DEFAULT 'Rp',
  `invoicePrefix` VARCHAR(191) NOT NULL DEFAULT 'INV',
  `projectPrefix` VARCHAR(191) NOT NULL DEFAULT 'PRJ',
  `fiscalYearStart` VARCHAR(191) NOT NULL DEFAULT '01-01',
  `vatRate` DECIMAL(5, 2) NOT NULL DEFAULT 11,
  `defaultPaymentTerms` INTEGER NOT NULL DEFAULT 30,
  `reminderDays` INTEGER NOT NULL DEFAULT 7,
  `boringDefaultRate` DECIMAL(15, 2) NOT NULL DEFAULT 3500000,
  `sondirDefaultRate` DECIMAL(15, 2) NOT NULL DEFAULT 2000000,
  `enableUserRoles` BOOLEAN NOT NULL DEFAULT true,
  `allowClientPortal` BOOLEAN NOT NULL DEFAULT false,
  `enableTwoFactor` BOOLEAN NOT NULL DEFAULT false,
  `enableAutomaticBackup` BOOLEAN NOT NULL DEFAULT true,
  `backupFrequency` VARCHAR(191) NOT NULL DEFAULT 'daily',
  `lastUpdated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedBy` INTEGER NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add default settings
INSERT INTO `Setting` (
  `companyName`, 
  `companyAddress`, 
  `companyPhone`, 
  `companyEmail`, 
  `taxNumber`,
  `currency`,
  `currencySymbol`,
  `invoicePrefix`,
  `projectPrefix`,
  `fiscalYearStart`
) VALUES (
  'PT. Boring & Sondir Indonesia',
  'Jl. Teknik Sipil No. 123, Jakarta',
  '021-12345678',
  'info@boringsondir.id',
  '123.456.789.0-000.000',
  'IDR',
  'Rp',
  'INV',
  'PRJ',
  '01-01'
); 