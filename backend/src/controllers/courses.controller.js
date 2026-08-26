const prisma = require("../config/prisma");
const HttpError = require("../utils/HttpError");
const service = require("../services/course.service");
const {
  createCourseSchema,
  setCourseMeetingLinkSchema,
  setCourseSessionNotesSchema,
  completeCourseSessionSchema,
} = require("../schemas/course.schema");

async function getOwnMentorProfile(userId) {
  const profile = await prisma.mentorProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new HttpError(404, "Mentor profile not found");
  }
  return profile;
}

async function create(req, res) {
  const parsed = createCourseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
  }
  const mentorProfile = await getOwnMentorProfile(req.user.id);
  const course = await service.createCourse(mentorProfile.id, parsed.data);
  res.status(201).json({ course });
}

async function listMine(req, res) {
  const mentorProfile = await getOwnMentorProfile(req.user.id);
  const courses = await service.listMyCourses(mentorProfile.id);
  res.json({ courses });
}

async function detail(req, res) {
  const course = await service.getCourseDetail(req.params.id, req.user.id);
  res.json({ course });
}

async function messages(req, res) {
  const messages = await service.listCourseMessages(req.params.id, req.user.id);
  res.json({ messages });
}

async function join(req, res) {
  const course = await service.joinCourse(req.params.id, req.user.id);
  res.status(201).json({ course });
}

async function leave(req, res) {
  await service.leaveCourse(req.params.id, req.user.id);
  res.json({ ok: true });
}

async function meetingLink(req, res) {
  const parsed = setCourseMeetingLinkSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
  }
  const course = await service.setCourseMeetingLink(req.params.id, req.user.id, parsed.data.meetingLink);
  res.json({ course });
}

async function listSessions(req, res) {
  const sessions = await service.listMyCourseSessions(req.user.id, req.user.role);
  res.json({ sessions });
}

async function sessionDetail(req, res) {
  const session = await service.getCourseSessionDetail(req.params.id, req.user.id);
  res.json({ session });
}

async function startSession(req, res) {
  const session = await service.startCourseSession(req.params.id, req.user.id);
  res.json({ session });
}

async function sessionNotes(req, res) {
  const parsed = setCourseSessionNotesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
  }
  const session = await service.setCourseSessionNotes(req.params.id, req.user.id, parsed.data.mentorNotes);
  res.json({ session });
}

async function completeSession(req, res) {
  const parsed = completeCourseSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
  }
  const session = await service.completeCourseSession(req.params.id, req.user.id, parsed.data.outcome);
  res.json({ session });
}

module.exports = {
  create,
  listMine,
  detail,
  messages,
  join,
  leave,
  meetingLink,
  listSessions,
  sessionDetail,
  startSession,
  sessionNotes,
  completeSession,
};
