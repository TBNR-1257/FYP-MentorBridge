const prisma = require("../config/prisma");
const HttpError = require("../utils/HttpError");

async function loadSessionParticipant(sessionId, userId) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { mentorProfile: true, helpRequest: { include: { studentProfile: true } } },
  });
  if (!session) throw new HttpError(404, "Session not found");
  const isMentor = session.mentorProfile.userId === userId;
  const isStudent = session.helpRequest.studentProfile.userId === userId;
  if (!isMentor && !isStudent) throw new HttpError(404, "Session not found");
  return { session, isMentor };
}

async function loadCourseMember(courseId, userId) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { mentorProfile: true, enrollments: { include: { studentProfile: true } } },
  });
  if (!course) throw new HttpError(404, "Course not found");
  const isMentor = course.mentorProfile.userId === userId;
  const isEnrolled = course.enrollments.some((e) => e.studentProfile.userId === userId);
  if (!isMentor && !isEnrolled) throw new HttpError(404, "Course not found");
  return { course, isMentor };
}

async function addSessionResource(sessionId, userId, data) {
  const { isMentor } = await loadSessionParticipant(sessionId, userId);
  if (!isMentor) throw new HttpError(403, "Only the mentor can share a resource");
  return prisma.resource.create({ data: { ...data, sessionId, uploadedById: userId } });
}

async function listSessionResources(sessionId, userId) {
  await loadSessionParticipant(sessionId, userId);
  return prisma.resource.findMany({ where: { sessionId }, orderBy: { createdAt: "desc" } });
}

async function addCourseResource(courseId, userId, data) {
  const { isMentor } = await loadCourseMember(courseId, userId);
  if (!isMentor) throw new HttpError(403, "Only the mentor can share a resource");
  return prisma.resource.create({ data: { ...data, courseId, uploadedById: userId } });
}

async function listCourseResources(courseId, userId) {
  await loadCourseMember(courseId, userId);
  return prisma.resource.findMany({ where: { courseId }, orderBy: { createdAt: "desc" } });
}

module.exports = { addSessionResource, listSessionResources, addCourseResource, listCourseResources };
