-- AlterTable
ALTER TABLE `billing` ADD COLUMN `createJournalEntry` BOOLEAN NOT NULL DEFAULT true,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE `projectcost` ADD COLUMN `billingId` INTEGER NULL,
    ADD COLUMN `createJournalEntry` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `billing_status_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `billingId` INTEGER NOT NULL,
    `oldStatus` VARCHAR(191) NOT NULL,
    `newStatus` VARCHAR(191) NOT NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `changedBy` INTEGER NULL,
    `notes` VARCHAR(191) NULL,

    INDEX `billing_status_history_billingId_idx`(`billingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projectcost_status_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectCostId` INTEGER NOT NULL,
    `oldStatus` VARCHAR(191) NOT NULL,
    `newStatus` VARCHAR(191) NOT NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `changedBy` INTEGER NULL,
    `notes` VARCHAR(191) NULL,

    INDEX `projectcost_status_history_projectCostId_idx`(`projectCostId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `billing_status_history` ADD CONSTRAINT `billing_status_history_billingId_fkey` FOREIGN KEY (`billingId`) REFERENCES `billing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projectcost_status_history` ADD CONSTRAINT `projectcost_status_history_projectCostId_fkey` FOREIGN KEY (`projectCostId`) REFERENCES `projectcost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
