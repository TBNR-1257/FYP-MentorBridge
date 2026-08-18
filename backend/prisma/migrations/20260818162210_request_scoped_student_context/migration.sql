/*
  Warnings:

  - You are about to drop the column `educationLevel` on the `StudentProfile` table. All the data in the column will be lost.
  - You are about to drop the column `languagePreferences` on the `StudentProfile` table. All the data in the column will be lost.
  - You are about to drop the `StudentSubject` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `educationLevel` to the `HelpRequest` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "StudentSubject" DROP CONSTRAINT "StudentSubject_studentProfileId_fkey";

-- DropForeignKey
ALTER TABLE "StudentSubject" DROP CONSTRAINT "StudentSubject_subjectId_fkey";

-- AlterTable
ALTER TABLE "HelpRequest" ADD COLUMN     "educationLevel" "EducationLevel" NOT NULL,
ADD COLUMN     "languagePreferences" TEXT[];

-- AlterTable
ALTER TABLE "StudentProfile" DROP COLUMN "educationLevel",
DROP COLUMN "languagePreferences";

-- DropTable
DROP TABLE "StudentSubject";
