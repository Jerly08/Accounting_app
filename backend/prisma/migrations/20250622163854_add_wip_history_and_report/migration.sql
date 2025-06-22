-- CreateTable
CREATE TABLE `wip_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `wipValue` DECIMAL(15, 2) NOT NULL,
    `earnedValue` DECIMAL(15, 2) NOT NULL,
    `billedValue` DECIMAL(15, 2) NOT NULL,
    `totalCost` DECIMAL(15, 2) NOT NULL,
    `progress` DECIMAL(5, 2) NOT NULL,
    `riskScore` INTEGER NULL DEFAULT 0,
    `ageInDays` INTEGER NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `wip_history_projectId_idx`(`projectId`),
    INDEX `wip_history_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wip_report` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `reportData` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` INTEGER NULL,
    `isComparative` BOOLEAN NOT NULL DEFAULT false,
    `previousStartDate` DATETIME(3) NULL,
    `previousEndDate` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `wip_history` ADD CONSTRAINT `wip_history_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
