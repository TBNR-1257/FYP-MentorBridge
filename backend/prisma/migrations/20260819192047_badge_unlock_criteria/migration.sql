/*
  Warnings:

  - Added the required column `metric` to the `Badge` table without a default value. This is not possible if the table is not empty.
  - Added the required column `threshold` to the `Badge` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BadgeMetric" AS ENUM ('RATING_COUNT', 'SERVICE_HOURS', 'SESSION_COUNT');

-- AlterTable
ALTER TABLE "Badge" ADD COLUMN     "metric" "BadgeMetric" NOT NULL,
ADD COLUMN     "threshold" INTEGER NOT NULL;
