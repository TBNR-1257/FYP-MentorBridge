const prisma = require("../config/prisma");
const HttpError = require("../utils/HttpError");
const { scoreMentors, nextOccurrence } = require("../utils/matching");

async function findOrCreateSubject(name) {
  return prisma.subject.upsert({ where: { name }, update: {}, create: { name } });
}

// Scores every VERIFIED mentor who teaches the request's subject, persists the
// ranking as MatchSuggestion rows, and returns them with mentor details attached.
async function generateMatches(helpRequest, studentProfile) {
  const eligibleMentors = await prisma.mentorProfile.findMany({
    where: {
      verificationStatus: "VERIFIED",
      subjects: { some: { subjectId: helpRequest.subjectId } },
    },
    include: {
      user: { select: { id: true, name: true } },
      availability: true,
      sessions: { where: { status: "SCHEDULED" } },
    },
  });

  const scored = scoreMentors(
    eligibleMentors.map((mentor) => ({
      id: mentor.id,
      languages: mentor.languages,
      availability: mentor.availability,
      activeSessionCount: mentor.sessions.length,
    })),
    studentProfile,
    helpRequest
  );

  const mentorsById = new Map(eligibleMentors.map((m) => [m.id, m]));

  const suggestions = await prisma.$transaction(
    scored.map((entry) =>
      prisma.matchSuggestion.create({
        data: {
          helpRequestId: helpRequest.id,
          mentorProfileId: entry.mentorProfileId,
          score: entry.score,
          rank: entry.rank,
        },
      })
    )
  );

  return suggestions.map((s) => ({ ...s, mentor: mentorsById.get(s.mentorProfileId).user }));
}

// Atomically confirms a match: only succeeds if the request is still OPEN and the
// mentor was actually suggested for it. Creates the resulting Session.
async function confirmMatch(helpRequestId, mentorProfileId) {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.helpRequest.updateMany({
      where: { id: helpRequestId, status: "OPEN" },
      data: { status: "MATCHED" },
    });
    if (claimed.count === 0) {
      throw new HttpError(409, "This help request has already been matched or is no longer open");
    }

    const suggestion = await tx.matchSuggestion.findUnique({
      where: { helpRequestId_mentorProfileId: { helpRequestId, mentorProfileId } },
    });
    if (!suggestion) {
      throw new HttpError(400, "This mentor was not matched to this help request");
    }

    const helpRequest = await tx.helpRequest.findUniqueOrThrow({ where: { id: helpRequestId } });
    const scheduledAt = nextOccurrence(helpRequest.preferredDayOfWeek, helpRequest.preferredStartTime);

    return tx.session.create({
      data: {
        helpRequestId,
        mentorProfileId,
        format: helpRequest.sessionFormat,
        status: "SCHEDULED",
        scheduledAt,
      },
    });
  });
}

module.exports = { findOrCreateSubject, generateMatches, confirmMatch };
