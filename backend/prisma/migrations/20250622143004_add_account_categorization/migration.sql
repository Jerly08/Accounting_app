-- AlterTable
ALTER TABLE `chartofaccount` ADD COLUMN `isCurrentAsset` BOOLEAN NULL DEFAULT true,
    ADD COLUMN `isCurrentLiability` BOOLEAN NULL DEFAULT true,
    ADD COLUMN `subcategory` VARCHAR(191) NULL;
