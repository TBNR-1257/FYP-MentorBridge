// Student Name: Bryan Wong Tze Hern
// Student ID: TP086538

const prisma = require("../config/prisma");
const HttpError = require("../utils/HttpError");
const { nextOccurrence } = require("../utils/matching");
const { resolveSubject } = require("./subject.service");
const { computeSessionHours, safelyCheckBadges } = require("./session.service");
const { notify } = require("./notification.service");

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const COURSE_DETAIL_INCLUDE = {
  mentorProfile: { include: { user: { select: { id: true, name: true, isActive: true } } } },
  subject: true,
  timeSlots: true,
  ratings: { include: { rater: { select: { id: true, name: true } } } },
  _count: { select: { enrollments: true } },
};

const COURSE_SESSION_INCLUDE = {
  course: { include: COURSE_DETAIL_INCLUDE },
};

// Shared by createCourse and cloneCourse: creates the Course row plus its time
// slots, then seeds the first upcoming occurrence for each weekly slot.
async function createCourseAndSeedSessions(tx, mentorProfileId, data) {
  const created = await tx.course.create({
    data: {
      mentorProfileId,
      subjectId: data.subjectId,
      title: data.title,
      description: data.description,
      difficultyLevel: data.difficultyLevel,
      mode: data.mode,
      meetingLink: data.meetingLink,
      timeSlots: { create: data.timeSlots },
    },
    include: { timeSlots: true },
  });

  await tx.courseSession.createMany({
    data: created.timeSlots.map((slot) => ({
      courseId: created.id,
      courseTimeSlotId: slot.id,
      scheduledAt: nextOccurrence(slot.dayOfWeek, slot.startTime),
    })),
  });

  return created;
}

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

  const course = await prisma.$transaction((tx) =>
    createCourseAndSeedSessions(tx, mentorProfileId, {
      subjectId: subject.id,
      title: data.title,
      description: data.description,
      difficultyLevel: data.difficultyLevel,
      mode: data.mode,
      timeSlots: data.timeSlots,
    })
  );

  return prisma.course.findUnique({ where: { id: course.id }, include: COURSE_DETAIL_INCLUDE });
}

// A structured course locks the moment its first session (of any time slot)
// starts — the course is one body of content, so once any of it has been
// taught, nobody new should join. Derived on demand rather than a stored flag
// to avoid drift.
async function isCourseLocked(courseId) {
  const startedCount = await prisma.courseSession.count({ where: { courseId, startedAt: { not: null } } });
  return startedCount > 0;
}

async function cloneCourse(courseId, userId) {
  const source = await prisma.course.findUnique({
    where: { id: courseId },
    include: { timeSlots: true, mentorProfile: true },
  });
  if (!source || source.mentorProfile.userId !== userId) {
    throw new HttpError(404, "Course not found");
  }

  const cloned = await prisma.$transaction((tx) =>
    createCourseAndSeedSessions(tx, source.mentorProfileId, {
      subjectId: source.subjectId,
      title: source.title,
      description: source.description,
      difficultyLevel: source.difficultyLevel,
      mode: source.mode,
      meetingLink: source.meetingLink,
      timeSlots: source.timeSlots.map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
    })
  );

  return prisma.course.findUnique({ where: { id: cloned.id }, include: COURSE_DETAIL_INCLUDE });
}

async function endCourse(courseId, userId) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { mentorProfile: true, enrollments: { include: { studentProfile: true } } },
  });
  if (!course || course.mentorProfile.userId !== userId) {
    throw new HttpError(404, "Course not found");
  }
  if (course.status !== "ACTIVE") {
    throw new HttpError(409, "This course has already ended");
  }

  await prisma.$transaction([
    prisma.courseSession.updateMany({ where: { courseId, status: "SCHEDULED" }, data: { status: "CANCELLED" } }),
    prisma.course.update({ where: { id: courseId }, data: { status: "ARCHIVED" } }),
  ]);

  await Promise.all(
    course.enrollments.map((e) =>
      notify(
        e.studentProfile.userId,
        "COURSE_ENDED",
        `The course "${course.title}" has ended — rate your experience!`,
        `/courses/${courseId}`
      )
    )
  );

  return getCourseDetail(courseId, userId);
}

async function addCourseRating(courseId, userId, data) {
  const [studentProfile, course] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { userId }, include: { user: true } }),
    prisma.course.findUnique({ where: { id: courseId }, include: { mentorProfile: true } }),
  ]);
  if (!studentProfile) {
    throw new HttpError(403, "Only students can rate a course");
  }
  if (!course) {
    throw new HttpError(404, "Course not found");
  }
  if (course.status !== "ARCHIVED") {
    throw new HttpError(409, "You can only rate a course after it has ended");
  }

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { courseId_studentProfileId: { courseId, studentProfileId: studentProfile.id } },
  });
  if (!enrollment) {
    throw new HttpError(403, "You were never enrolled in this course");
  }

  let rating;
  try {
    rating = await prisma.rating.create({
      data: {
        courseId,
        raterId: userId,
        rateeId: course.mentorProfile.userId,
        score: data.score,
        comment: data.comment,
      },
    });
  } catch (err) {
    if (err.code === "P2002") {
      throw new HttpError(409, "You've already rated this course");
    }
    throw err;
  }

  await safelyCheckBadges(course.mentorProfileId, course.mentorProfile.userId);
  await notify(
    course.mentorProfile.userId,
    "RATING_RECEIVED",
    `${studentProfile.user.name} left you a rating for "${course.title}".`,
    `/courses/${courseId}`
  );

  return rating;
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
  const isLocked = course.mode === "STRUCTURED" && (await isCourseLocked(courseId));
  return { ...courseWithoutEnrollments, isMentor, isEnrolled, members, isLocked };
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
  if (course.mode === "STRUCTURED" && (await isCourseLocked(courseId))) {
    throw new HttpError(409, "Enrollment is closed — this course has already started");
  }

  await prisma.courseEnrollment.upsert({
    where: { courseId_studentProfileId: { courseId, studentProfileId: studentProfile.id } },
    update: {},
    create: { courseId, studentProfileId: studentProfile.id },
  });

  const [student, mentorProfile] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.mentorProfile.findUnique({ where: { id: course.mentorProfileId } }),
  ]);
  await notify(
    mentorProfile.userId,
    "COURSE_JOINED",
    `${student.name} joined your course "${course.title}".`,
    `/courses/${courseId}`
  );

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
  const { course, isMentor } = await loadCourseAccess(courseId, userId);
  if (!isMentor) {
    throw new HttpError(403, "Only the mentor can set up the meeting link");
  }
  if (course.status !== "ACTIVE") {
    throw new HttpError(409, "This course has ended");
  }
  await prisma.course.update({ where: { id: courseId }, data: { meetingLink } });
  // Return through getCourseDetail rather than the raw update result so the
  // response still carries isMentor/isEnrolled/isLocked/members — the frontend
  // room page gates its whole view on those, and a partial course object made
  // it look like the mentor had never joined their own course.
  return getCourseDetail(courseId, userId);
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
  if (courseSession.course.status !== "ACTIVE") {
    throw new HttpError(409, "This course has ended");
  }
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
  if (courseSession.course.status !== "ACTIVE") {
    throw new HttpError(409, "This course has ended");
  }
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
  cloneCourse,
  endCourse,
  addCourseRating,
};
