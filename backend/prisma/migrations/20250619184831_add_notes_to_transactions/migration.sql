-- AlterTable
ALTER TABLE `fixedasset` ADD COLUMN `category` VARCHAR(191) NOT NULL DEFAULT 'equipment';

-- AlterTable
ALTER TABLE `transaction` ADD COLUMN `notes` VARCHAR(191) NULL;
