-- CreateTable
CREATE TABLE `cashflow_category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `accountCode` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `subcategory` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cashflow_category_accountCode_key`(`accountCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cashflow_report` (
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
ALTER TABLE `chartofaccount` ADD CONSTRAINT `chartofaccount_code_fkey` FOREIGN KEY (`code`) REFERENCES `cashflow_category`(`accountCode`) ON DELETE RESTRICT ON UPDATE CASCADE;
