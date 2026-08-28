const prisma = require("../config/prisma");
const HttpError = require("../utils/HttpError");
const { checkAndAwardBadges } = require("./gamification.service");
const { notify } = require("./notification.service");

// Badge awarding is a side-effect of the main action (completing a session,
// leaving a rating) — if it fails, the primary action should still succeed.
async function safelyCheckBadges(mentorProfileId, mentorUserId) {
  try {
    await checkAndAwardBadges(mentorProfileId, mentorUserId);
  } catch (err) {
    console.error("Badge check failed:", err);
  }
}

const DETAIL_INCLUDE = {
  mentorProfile: { include: { user: { select: { id: true, name: true, isActive: true } } } },
  helpRequest: {
    include: {
      subject: true,
      studentProfile: { include: { user: { select: { id: true, name: true, isActive: true } } } },
    },
  },
  ratings: { include: { rater: { select: { id: true, name: true } } } },
};

const MIN_LOGGED_HOURS = 0.25;
const DEFAULT_LOGGED_HOURS = 1;

function computeSessionHours(startedAt, endedAt) {
  if (!startedAt) return DEFAULT_LOGGED_HOURS;
  const hours = (endedAt.getTime() - startedAt.getTime()) / 3600000;
  return Math.max(MIN_LOGGED_HOURS, Math.round(hours * 100) / 100);
}

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

async function setMeetingLink(sessionId, userId, meetingLink) {
  const { isMentor } = await loadSessionForParticipant(sessionId, userId);
  if (!isMentor) {
    throw new HttpError(403, "Only the mentor can set up the meeting link");
  }
  return prisma.session.update({ where: { id: sessionId }, data: { meetingLink }, include: DETAIL_INCLUDE });
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
  const endedAt = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.session.update({
      where: { id: sessionId },
      data: { status: outcome, endedAt },
      include: DETAIL_INCLUDE,
    });
    await tx.helpRequest.update({ where: { id: session.helpRequestId }, data: { status: helpRequestStatus } });

    if (outcome === "COMPLETED") {
      await tx.serviceHourLog.create({
        data: {
          sessionId,
          mentorProfileId: session.mentorProfileId,
          hours: computeSessionHours(session.startedAt, endedAt),
        },
      });
    }

    return updated;
  });

  if (outcome === "COMPLETED") {
    await safelyCheckBadges(session.mentorProfileId, session.mentorProfile.userId);
  }

  return updated;
}

async function addRating(sessionId, userId, data) {
  const { session, isMentor } = await loadSessionForParticipant(sessionId, userId);
  if (session.status === "SCHEDULED") {
    throw new HttpError(409, "This session hasn't concluded yet");
  }

  const rateeId = isMentor ? session.helpRequest.studentProfile.userId : session.mentorProfile.userId;

  let rating;
  try {
    rating = await prisma.rating.create({
      data: {
        sessionId,
        raterId: userId,
        rateeId,
        score: data.score,
        comment: data.comment,
        isNoShow: isMentor ? Boolean(data.isNoShow) : false,
        isMisconduct: isMentor ? Boolean(data.isMisconduct) : false,
      },
    });
  } catch (err) {
    if (err.code === "P2002") {
      throw new HttpError(409, "You have already rated this session");
    }
    throw err;
  }

  // A student rated the mentor — that's the only direction that can move a
  // rating-count badge.
  if (!isMentor) {
    await safelyCheckBadges(session.mentorProfileId, session.mentorProfile.userId);
  }

  const raterName = isMentor ? session.mentorProfile.user.name : session.helpRequest.studentProfile.user.name;
  await notify(rateeId, "RATING_RECEIVED", `${raterName} left you a rating.`, `/sessions/${sessionId}`);

  return rating;
}

module.exports = {
  listMySessions,
  getSessionDetail,
  listMessages,
  startSession,
  setMentorNotes,
  setMeetingLink,
  setConfidence,
  completeSession,
  addRating,
  computeSessionHours,
  safelyCheckBadges,
};
