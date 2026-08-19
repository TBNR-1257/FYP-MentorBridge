-- AlterEnum
ALTER TYPE "HelpRequestStatus" ADD VALUE 'REQUESTED';

-- AlterTable
ALTER TABLE "HelpRequest" ADD COLUMN     "requestedMentorProfileId" TEXT;

-- AddForeignKey
ALTER TABLE "HelpRequest" ADD CONSTRAINT "HelpRequest_requestedMentorProfileId_fkey" FOREIGN KEY ("requestedMentorProfileId") REFERENCES "MentorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
