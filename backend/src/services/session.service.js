const prisma = require("../config/prisma");
const HttpError = require("../utils/HttpError");

const DETAIL_INCLUDE = {
  mentorProfile: { include: { user: { select: { id: true, name: true } } } },
  helpRequest: {
    include: {
      subject: true,
      studentProfile: { include: { user: { select: { id: true, name: true } } } },
    },
  },
};

async function loadSessionForParticipant(sessionId, userId) {
  const session = await prisma.session.findUnique({ where: { id: sessionId }, include: DETAIL_INCLUDE });
  if (!session) {
    throw new HttpError(404, "Session not found");
  }

  const isMentor = session.mentorProfile.userId === userId;
  const isStudent = session.helpRequest.studentProfile.userId === userId;
  if (!isMentor && !isStudent) {
    throw new HttpError(404, "Session not found");
  }

  return { session, isMentor, isStudent };
}

async function listMySessions(userId, role) {
  if (role === "STUDENT") {
    return prisma.session.findMany({
      where: { helpRequest: { studentProfile: { userId } } },
      include: DETAIL_INCLUDE,
      orderBy: { scheduledAt: "desc" },
    });
  }

  return prisma.session.findMany({
    where: { mentorProfile: { userId } },
    include: DETAIL_INCLUDE,
    orderBy: { scheduledAt: "desc" },
  });
}

async function getSessionDetail(sessionId, userId) {
  const { session } = await loadSessionForParticipant(sessionId, userId);
  return session;
}

async function listMessages(sessionId, userId) {
  await loadSessionForParticipant(sessionId, userId);
  return prisma.chatMessage.findMany({
    where: { sessionId },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { sentAt: "asc" },
  });
}

async function startSession(sessionId, userId) {
  const { session } = await loadSessionForParticipant(sessionId, userId);
  if (session.status !== "SCHEDULED") {
    throw new HttpError(409, "Session is not in a startable state");
  }

  return prisma.$transaction(async (tx) => {
    const updated = session.startedAt
      ? session
      : await tx.session.update({
          where: { id: sessionId },
          data: { startedAt: new Date() },
          include: DETAIL_INCLUDE,
        });

    await tx.helpRequest.updateMany({
      where: { id: session.helpRequestId, status: "MATCHED" },
      data: { status: "IN_PROGRESS" },
    });

    return updated;
  });
}

async function setMentorNotes(sessionId, userId, mentorNotes) {
  const { isMentor } = await loadSessionForParticipant(sessionId, userId);
  if (!isMentor) {
    throw new HttpError(403, "Only the mentor can log session notes");
  }
  return prisma.session.update({ where: { id: sessionId }, data: { mentorNotes }, include: DETAIL_INCLUDE });
}

async function setConfidence(sessionId, userId, { confidenceBefore, confidenceAfter }) {
  const { isStudent } = await loadSessionForParticipant(sessionId, userId);
  if (!isStudent) {
    throw new HttpError(403, "Only the student can log confidence levels");
  }
  const data = {};
  if (confidenceBefore !== undefined) data.confidenceBefore = confidenceBefore;
  if (confidenceAfter !== undefined) data.confidenceAfter = confidenceAfter;
  return prisma.session.update({ where: { id: sessionId }, data, include: DETAIL_INCLUDE });
}

async function completeSession(sessionId, userId, outcome) {
  const { isMentor, session } = await loadSessionForParticipant(sessionId, userId);
  if (!isMentor) {
    throw new HttpError(403, "Only the mentor can complete a session");
  }
  if (session.status !== "SCHEDULED") {
    throw new HttpError(409, "Session has already been closed out");
  }

  // A no-show closes out this attempt rather than reopening it for rematching;
  // the student can post a fresh help request if they still need help.
  const helpRequestStatus = outcome === "NO_SHOW" ? "CANCELLED" : "COMPLETED";

  return prisma.$transaction(async (tx) => {
    const updated = await tx.session.update({
      where: { id: sessionId },
      data: { status: outcome, endedAt: new Date() },
      include: DETAIL_INCLUDE,
    });
    await tx.helpRequest.update({ where: { id: session.helpRequestId }, data: { status: helpRequestStatus } });
    return updated;
  });
}

module.exports = {
  listMySessions,
  getSessionDetail,
  listMessages,
  startSession,
  setMentorNotes,
  setConfidence,
  completeSession,
};
