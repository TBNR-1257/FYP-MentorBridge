-- New enums
CREATE TYPE "DifficultyLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'EXPERT');
CREATE TYPE "CourseStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "SubjectRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- HelpRequest: replace educationLevel with difficultyLevel (backfilled, not dropped-and-lost),
-- drop sessionFormat, add description
ALTER TABLE "HelpRequest" ADD COLUMN "difficultyLevel" "DifficultyLevel";
UPDATE "HelpRequest" SET "difficultyLevel" = CASE
  WHEN "educationLevel" IN ('PRIMARY', 'SECONDARY') THEN 'BEGINNER'
  WHEN "educationLevel" = 'UNDERGRADUATE' THEN 'INTERMEDIATE'
  ELSE 'EXPERT'
END::"DifficultyLevel";
ALTER TABLE "HelpRequest" ALTER COLUMN "difficultyLevel" SET NOT NULL;
ALTER TABLE "HelpRequest" DROP COLUMN "educationLevel";
ALTER TABLE "HelpRequest" DROP COLUMN "sessionFormat";
ALTER TABLE "HelpRequest" ADD COLUMN "description" TEXT;

-- Session: drop format (all sessions now always offer chat + Meet)
ALTER TABLE "Session" DROP COLUMN "format";

-- Old enums no longer referenced by any column
DROP TYPE "EducationLevel";
DROP TYPE "SessionFormat";

-- Courses (mentor-run recurring group classes)
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "mentorProfileId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficultyLevel" "DifficultyLevel" NOT NULL,
    "status" "CourseStatus" NOT NULL DEFAULT 'ACTIVE',
    "meetingLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Course_subjectId_idx" ON "Course"("subjectId");
CREATE INDEX "Course_mentorProfileId_idx" ON "Course"("mentorProfileId");
ALTER TABLE "Course" ADD CONSTRAINT "Course_mentorProfileId_fkey" FOREIGN KEY ("mentorProfileId") REFERENCES "MentorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CourseTimeSlot" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    CONSTRAINT "CourseTimeSlot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CourseTimeSlot_courseId_idx" ON "CourseTimeSlot"("courseId");
ALTER TABLE "CourseTimeSlot" ADD CONSTRAINT "CourseTimeSlot_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CourseEnrollment" (
    "courseId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("courseId", "studentProfileId")
);
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CourseSession" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseTimeSlotId" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "mentorNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CourseSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CourseSession_status_idx" ON "CourseSession"("status");
CREATE INDEX "CourseSession_courseId_idx" ON "CourseSession"("courseId");
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_courseTimeSlotId_fkey" FOREIGN KEY ("courseTimeSlotId") REFERENCES "CourseTimeSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CourseChatMessage" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseChatMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CourseChatMessage_courseId_idx" ON "CourseChatMessage"("courseId");
ALTER TABLE "CourseChatMessage" ADD CONSTRAINT "CourseChatMessage_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseChatMessage" ADD CONSTRAINT "CourseChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ServiceHourLog: allow logging against a CourseSession instead of a 1:1 Session
ALTER TABLE "ServiceHourLog" ALTER COLUMN "sessionId" DROP NOT NULL;
ALTER TABLE "ServiceHourLog" ADD COLUMN "courseSessionId" TEXT;
ALTER TABLE "ServiceHourLog" ADD CONSTRAINT "ServiceHourLog_courseSessionId_key" UNIQUE ("courseSessionId");
ALTER TABLE "ServiceHourLog" ADD CONSTRAINT "ServiceHourLog_courseSessionId_fkey" FOREIGN KEY ("courseSessionId") REFERENCES "CourseSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Student interests
CREATE TABLE "StudentInterest" (
    "studentProfileId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    CONSTRAINT "StudentInterest_pkey" PRIMARY KEY ("studentProfileId", "subjectId")
);
ALTER TABLE "StudentInterest" ADD CONSTRAINT "StudentInterest_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentInterest" ADD CONSTRAINT "StudentInterest_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Subject moderation queue
CREATE TABLE "SubjectRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "SubjectRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubjectRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SubjectRequest_status_idx" ON "SubjectRequest"("status");
ALTER TABLE "SubjectRequest" ADD CONSTRAINT "SubjectRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubjectRequest" ADD CONSTRAINT "SubjectRequest_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
