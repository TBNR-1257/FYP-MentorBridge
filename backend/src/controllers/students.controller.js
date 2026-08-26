const prisma = require("../config/prisma");
const HttpError = require("../utils/HttpError");
const { createHelpRequestSchema, selectMentorSchema } = require("../schemas/helpRequest.schema");
const { updateStudentProfileSchema } = require("../schemas/profile.schema");
const helpRequestService = require("../services/helpRequest.service");
const { resolveSubject, findSubjectByName } = require("../services/subject.service");
const { computeWeeklyStreak } = require("../utils/streak");

async function getOwnStudentProfile(userId) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new HttpError(404, "Student profile not found");
  }
  return profile;
}

async function createHelpRequest(req, res) {
  const parsed = createHelpRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
  }
  const data = parsed.data;

  const studentProfile = await getOwnStudentProfile(req.user.id);
  const subject = await resolveSubject(data.subject);

  const helpRequest = await prisma.helpRequest.create({
    data: {
      studentProfileId: studentProfile.id,
      subjectId: subject.id,
      topic: data.topic,
      description: data.description,
      urgencyLevel: data.urgencyLevel,
      difficultyLevel: data.difficultyLevel,
      languagePreferences: data.languagePreferences,
      preferredDayOfWeek: data.preferredDayOfWeek,
      preferredStartTime: data.preferredStartTime,
      preferredEndTime: data.preferredEndTime,
    },
    include: { subject: true },
  });

  const matches = await helpRequestService.generateMatches(helpRequest);

  res.status(201).json({ helpRequest, matches });
}

async function listMyHelpRequests(req, res) {
  const studentProfile = await getOwnStudentProfile(req.user.id);

  const helpRequests = await prisma.helpRequest.findMany({
    where: { studentProfileId: studentProfile.id },
    include: { subject: true, sessions: true },
    orderBy: { createdAt: "desc" },
  });

  res.json({ helpRequests });
}

async function getHelpRequest(req, res) {
  const studentProfile = await getOwnStudentProfile(req.user.id);

  const helpRequest = await prisma.helpRequest.findUnique({
    where: { id: req.params.id },
    include: {
      subject: true,
      sessions: true,
      requestedMentorProfile: { include: { user: { select: { id: true, name: true, isActive: true } } } },
      matchSuggestions: {
        orderBy: { rank: "asc" },
        include: {
          mentorProfile: {
            include: {
              user: { select: { id: true, name: true } },
              badges: { include: { badge: true }, orderBy: { earnedAt: "desc" } },
            },
          },
        },
      },
    },
  });

  if (!helpRequest || helpRequest.studentProfileId !== studentProfile.id) {
    return res.status(404).json({ error: "Help request not found" });
  }

  res.json({ helpRequest });
}

async function requestMentor(req, res) {
  const parsed = selectMentorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
  }

  const studentProfile = await getOwnStudentProfile(req.user.id);
  const helpRequest = await prisma.helpRequest.findUnique({ where: { id: req.params.id } });

  if (!helpRequest || helpRequest.studentProfileId !== studentProfile.id) {
    return res.status(404).json({ error: "Help request not found" });
  }

  const updated = await helpRequestService.requestMentor(helpRequest.id, parsed.data.mentorProfileId);
  res.status(200).json({ helpRequest: updated });
}

async function cancelRequest(req, res) {
  const studentProfile = await getOwnStudentProfile(req.user.id);
  const helpRequest = await prisma.helpRequest.findUnique({ where: { id: req.params.id } });

  if (!helpRequest || helpRequest.studentProfileId !== studentProfile.id) {
    return res.status(404).json({ error: "Help request not found" });
  }

  await helpRequestService.cancelRequest(helpRequest.id);
  res.status(200).json({ ok: true });
}

async function getProgress(req, res) {
  const studentProfile = await getOwnStudentProfile(req.user.id);

  const sessions = await prisma.session.findMany({
    where: {
      status: "COMPLETED",
      helpRequest: { studentProfileId: studentProfile.id },
    },
    include: { helpRequest: { include: { subject: true } } },
    orderBy: { endedAt: "desc" },
  });

  const streakWeeks = computeWeeklyStreak(sessions.map((s) => s.endedAt));

  res.json({ sessions, streakWeeks });
}

// Interests are subjects the student declares an interest in (capped at 3) to
// drive the "recommended courses" dashboard section. Unlike a help request's
// subject or a mentor's taught subjects, a student can't implicitly create a
// new Subject here — findSubjectByName throws if it doesn't already exist.
async function updateProfile(req, res) {
  const parsed = updateStudentProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
  }

  const studentProfile = await getOwnStudentProfile(req.user.id);
  const subjects = await Promise.all(parsed.data.interests.map((name) => findSubjectByName(name)));

  await prisma.studentInterest.deleteMany({ where: { studentProfileId: studentProfile.id } });
  await prisma.studentInterest.createMany({
    data: subjects.map((s) => ({ studentProfileId: studentProfile.id, subjectId: s.id })),
  });

  const interests = await prisma.studentInterest.findMany({
    where: { studentProfileId: studentProfile.id },
    include: { subject: true },
  });

  res.json({ interests: interests.map((i) => i.subject) });
}

module.exports = {
  createHelpRequest,
  listMyHelpRequests,
  getHelpRequest,
  requestMentor,
  cancelRequest,
  getProgress,
  updateProfile,
};
