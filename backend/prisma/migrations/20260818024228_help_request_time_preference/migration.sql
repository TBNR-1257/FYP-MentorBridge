/*
  Warnings:

  - Added the required column `preferredDayOfWeek` to the `HelpRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `preferredEndTime` to the `HelpRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `preferredStartTime` to the `HelpRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HelpRequest" ADD COLUMN     "preferredDayOfWeek" INTEGER NOT NULL,
ADD COLUMN     "preferredEndTime" TEXT NOT NULL,
ADD COLUMN     "preferredStartTime" TEXT NOT NULL;
