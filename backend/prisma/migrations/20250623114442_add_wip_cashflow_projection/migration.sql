-- CreateTable
CREATE TABLE `wip_cashflow_projection` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `projectionDate` DATETIME(3) NOT NULL,
    `expectedBilling` DECIMAL(15, 2) NOT NULL,
    `expectedWipReduction` DECIMAL(15, 2) NOT NULL,
    `probability` INTEGER NOT NULL DEFAULT 100,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `wip_cashflow_projection_projectId_idx`(`projectId`),
    INDEX `wip_cashflow_projection_projectionDate_idx`(`projectionDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `wip_cashflow_projection` ADD CONSTRAINT `wip_cashflow_projection_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
