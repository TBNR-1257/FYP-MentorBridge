-- CreateEnum
CREATE TYPE "CourseMode" AS ENUM ('STRUCTURED', 'OPEN');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "mode" "CourseMode" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "Rating" ALTER COLUMN "sessionId" DROP NOT NULL,
ADD COLUMN     "courseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Rating_courseId_raterId_key" ON "Rating"("courseId", "raterId");

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
