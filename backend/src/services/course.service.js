const prisma = require("../config/prisma");
const HttpError = require("../utils/HttpError");
const { nextOccurrence } = require("../utils/matching");
const { resolveSubject } = require("./subject.service");
const { computeSessionHours, safelyCheckBadges } = require("./session.service");

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const COURSE_DETAIL_INCLUDE = {
  mentorProfile: { include: { user: { select: { id: true, name: true, isActive: true } } } },
  subject: true,
  timeSlots: true,
  _count: { select: { enrollments: true } },
};

const COURSE_SESSION_INCLUDE = {
  course: { include: COURSE_DETAIL_INCLUDE },
};

async function createCourse(mentorProfileId, data) {
  const mentorProfile = await prisma.mentorProfile.findUnique({
    where: { id: mentorProfileId },
    include: { subjects: true },
  });
  if (!mentorProfile || mentorProfile.verificationStatus !== "VERIFIED") {
    throw new HttpError(403, "Your mentor profile must be verified before you can create a course");
  }

  const subject = await resolveSubject(data.subject);
  if (!mentorProfile.subjects.some((s) => s.subjectId === subject.id)) {
    throw new HttpError(400, "You can only create a course in a subject you teach");
  }

  const course = await prisma.$transaction(async (tx) => {
    const created = await tx.course.create({
      data: {
        mentorProfileId,
        subjectId: subject.id,
        title: data.title,
        description: data.description,
        difficultyLevel: data.difficultyLevel,
        timeSlots: { create: data.timeSlots },
      },
      include: { timeSlots: true },
    });

    // Seed the first upcoming occurrence for each weekly time slot.
    await tx.courseSession.createMany({
      data: created.timeSlots.map((slot) => ({
        courseId: created.id,
        courseTimeSlotId: slot.id,
        scheduledAt: nextOccurrence(slot.dayOfWeek, slot.startTime),
      })),
    });

    return created;
  });

  return prisma.course.findUnique({ where: { id: course.id }, include: COURSE_DETAIL_INCLUDE });
}

async function listMyCourses(mentorProfileId) {
  return prisma.course.findMany({
    where: { mentorProfileId },
    include: COURSE_DETAIL_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

// Shared authorization lookup: is this user the course's mentor, or a student
// currently enrolled in it? Used to gate the chat/room surface, not the public
// browse listing (which just shows course info to anyone logged in).
async function loadCourseAccess(courseId, userId) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { ...COURSE_DETAIL_INCLUDE, enrollments: { include: { studentProfile: { include: { user: true } } } } },
  });
  if (!course) {
    throw new HttpError(404, "Course not found");
  }

  const isMentor = course.mentorProfile.userId === userId;
  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } });
  const isEnrolled = Boolean(studentProfile) && course.enrollments.some((e) => e.studentProfileId === studentProfile.id);

  return { course, isMentor, isEnrolled, studentProfile };
}

async function getCourseDetail(courseId, userId) {
  const { course, isMentor, isEnrolled } = await loadCourseAccess(courseId, userId);
  const members = course.enrollments.map((e) => ({ name: e.studentProfile.user.name, isActive: e.studentProfile.user.isActive }));
  const { enrollments, ...courseWithoutEnrollments } = course;
  return { ...courseWithoutEnrollments, isMentor, isEnrolled, members };
}

async function joinCourse(courseId, userId) {
  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!studentProfile) {
    throw new HttpError(403, "Only students can join a course");
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.status !== "ACTIVE") {
    throw new HttpError(404, "Course not found");
  }

  await prisma.courseEnrollment.upsert({
    where: { courseId_studentProfileId: { courseId, studentProfileId: studentProfile.id } },
    update: {},
    create: { courseId, studentProfileId: studentProfile.id },
  });

  return getCourseDetail(courseId, userId);
}

async function leaveCourse(courseId, userId) {
  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!studentProfile) {
    throw new HttpError(403, "Only students can leave a course");
  }
  await prisma.courseEnrollment.deleteMany({ where: { courseId, studentProfileId: studentProfile.id } });
}

async function setCourseMeetingLink(courseId, userId, meetingLink) {
  const { isMentor } = await loadCourseAccess(courseId, userId);
  if (!isMentor) {
    throw new HttpError(403, "Only the mentor can set up the meeting link");
  }
  return prisma.course.update({ where: { id: courseId }, data: { meetingLink }, include: COURSE_DETAIL_INCLUDE });
}

async function listCourseMessages(courseId, userId) {
  const { isMentor, isEnrolled } = await loadCourseAccess(courseId, userId);
  if (!isMentor && !isEnrolled) {
    throw new HttpError(403, "You're not a member of this course");
  }
  return prisma.courseChatMessage.findMany({
    where: { courseId },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { sentAt: "asc" },
  });
}

async function listMyCourseSessions(userId, role) {
  if (role === "STUDENT") {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: { enrolledCourses: true },
    });
    if (!studentProfile) return [];
    const courseIds = studentProfile.enrolledCourses.map((e) => e.courseId);
    return prisma.courseSession.findMany({
      where: { courseId: { in: courseIds } },
      include: COURSE_SESSION_INCLUDE,
      orderBy: { scheduledAt: "desc" },
    });
  }

  return prisma.courseSession.findMany({
    where: { course: { mentorProfile: { userId } } },
    include: COURSE_SESSION_INCLUDE,
    orderBy: { scheduledAt: "desc" },
  });
}

async function loadCourseSessionForMentor(courseSessionId, userId) {
  const courseSession = await prisma.courseSession.findUnique({
    where: { id: courseSessionId },
    include: COURSE_SESSION_INCLUDE,
  });
  if (!courseSession || courseSession.course.mentorProfile.userId !== userId) {
    throw new HttpError(404, "Course session not found");
  }
  return courseSession;
}

async function getCourseSessionDetail(courseSessionId, userId) {
  const courseSession = await prisma.courseSession.findUnique({
    where: { id: courseSessionId },
    include: COURSE_SESSION_INCLUDE,
  });
  if (!courseSession) {
    throw new HttpError(404, "Course session not found");
  }

  const { isMentor, isEnrolled } = await loadCourseAccess(courseSession.courseId, userId);
  if (!isMentor && !isEnrolled) {
    throw new HttpError(404, "Course session not found");
  }

  return courseSession;
}

async function startCourseSession(courseSessionId, userId) {
  const courseSession = await loadCourseSessionForMentor(courseSessionId, userId);
  if (courseSession.status !== "SCHEDULED") {
    throw new HttpError(409, "Session is not in a startable state");
  }
  if (courseSession.startedAt) return courseSession;

  return prisma.courseSession.update({
    where: { id: courseSessionId },
    data: { startedAt: new Date() },
    include: COURSE_SESSION_INCLUDE,
  });
}

async function setCourseSessionNotes(courseSessionId, userId, mentorNotes) {
  await loadCourseSessionForMentor(courseSessionId, userId);
  return prisma.courseSession.update({
    where: { id: courseSessionId },
    data: { mentorNotes },
    include: COURSE_SESSION_INCLUDE,
  });
}

async function completeCourseSession(courseSessionId, userId, outcome) {
  const courseSession = await loadCourseSessionForMentor(courseSessionId, userId);
  if (courseSession.status !== "SCHEDULED") {
    throw new HttpError(409, "Session has already been closed out");
  }

  const endedAt = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const updatedSession = await tx.courseSession.update({
      where: { id: courseSessionId },
      data: { status: outcome, endedAt },
      include: COURSE_SESSION_INCLUDE,
    });

    if (outcome === "COMPLETED") {
      await tx.serviceHourLog.create({
        data: {
          courseSessionId,
          mentorProfileId: courseSession.course.mentorProfileId,
          hours: computeSessionHours(courseSession.startedAt, endedAt),
        },
      });
    }

    // Class continues next week regardless of outcome, as long as this
    // occurrence belongs to a recurring time slot (not a one-off make-up).
    if (courseSession.courseTimeSlotId) {
      await tx.courseSession.create({
        data: {
          courseId: courseSession.courseId,
          courseTimeSlotId: courseSession.courseTimeSlotId,
          scheduledAt: new Date(courseSession.scheduledAt.getTime() + WEEK_MS),
        },
      });
    }

    return updatedSession;
  });

  if (outcome === "COMPLETED") {
    await safelyCheckBadges(courseSession.course.mentorProfileId, userId);
  }

  return updated;
}

module.exports = {
  createCourse,
  listMyCourses,
  getCourseDetail,
  loadCourseAccess,
  joinCourse,
  leaveCourse,
  setCourseMeetingLink,
  listCourseMessages,
  listMyCourseSessions,
  getCourseSessionDetail,
  startCourseSession,
  setCourseSessionNotes,
  completeCourseSession,
};
