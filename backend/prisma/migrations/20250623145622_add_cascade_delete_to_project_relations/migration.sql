-- DropForeignKey
ALTER TABLE `billing` DROP FOREIGN KEY `Billing_projectId_fkey`;

-- DropForeignKey
ALTER TABLE `projectcost` DROP FOREIGN KEY `ProjectCost_projectId_fkey`;

-- DropForeignKey
ALTER TABLE `wip_cashflow_projection` DROP FOREIGN KEY `wip_cashflow_projection_projectId_fkey`;

-- DropForeignKey
ALTER TABLE `wip_history` DROP FOREIGN KEY `wip_history_projectId_fkey`;

-- AddForeignKey
ALTER TABLE `billing` ADD CONSTRAINT `Billing_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projectcost` ADD CONSTRAINT `ProjectCost_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wip_history` ADD CONSTRAINT `wip_history_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wip_cashflow_projection` ADD CONSTRAINT `wip_cashflow_projection_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
