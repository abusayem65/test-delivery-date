/*
  Warnings:

  - The primary key for the `City` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `City` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `CityTimeSlot` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `cityId` on the `CityTimeSlot` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `timeSlotId` on the `CityTimeSlot` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `DisableDateRules` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `DisableDateRules` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `cityId` on the `DisableDateRules` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `DisableTimeSlotRules` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `DisableTimeSlotRules` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `timeSlotId` on the `DisableTimeSlotRules` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `cityId` on the `DisableTimeSlotRules` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `TimeSlot` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `TimeSlot` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- DropForeignKey
ALTER TABLE `CityTimeSlot` DROP FOREIGN KEY `CityTimeSlot_cityId_fkey`;

-- DropForeignKey
ALTER TABLE `CityTimeSlot` DROP FOREIGN KEY `CityTimeSlot_timeSlotId_fkey`;

-- DropForeignKey
ALTER TABLE `DisableDateRules` DROP FOREIGN KEY `DisableDateRules_cityId_fkey`;

-- DropForeignKey
ALTER TABLE `DisableTimeSlotRules` DROP FOREIGN KEY `DisableTimeSlotRules_cityId_fkey`;

-- DropForeignKey
ALTER TABLE `DisableTimeSlotRules` DROP FOREIGN KEY `DisableTimeSlotRules_timeSlotId_fkey`;

-- AlterTable
ALTER TABLE `City` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `CityTimeSlot` DROP PRIMARY KEY,
    MODIFY `cityId` INTEGER NOT NULL,
    MODIFY `timeSlotId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`cityId`, `timeSlotId`);

-- AlterTable
ALTER TABLE `DisableDateRules` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `cityId` INTEGER NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `DisableTimeSlotRules` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `timeSlotId` INTEGER NOT NULL,
    MODIFY `cityId` INTEGER NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `TimeSlot` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- CreateTable
CREATE TABLE `Settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop` VARCHAR(191) NOT NULL,
    `cutoffTime` VARCHAR(191) NULL,
    `selectors` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Settings_shop_idx`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CityTimeSlot` ADD CONSTRAINT `CityTimeSlot_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CityTimeSlot` ADD CONSTRAINT `CityTimeSlot_timeSlotId_fkey` FOREIGN KEY (`timeSlotId`) REFERENCES `TimeSlot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisableDateRules` ADD CONSTRAINT `DisableDateRules_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisableTimeSlotRules` ADD CONSTRAINT `DisableTimeSlotRules_timeSlotId_fkey` FOREIGN KEY (`timeSlotId`) REFERENCES `TimeSlot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisableTimeSlotRules` ADD CONSTRAINT `DisableTimeSlotRules_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
