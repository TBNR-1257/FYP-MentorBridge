const prisma = require("../config/prisma");
const HttpError = require("../utils/HttpError");
const { scoreMentors, nextOccurrence } = require("../utils/matching");
const { resolveSubject } = require("./subject.service");

// Scores every VERIFIED mentor who teaches the request's subject, persists the
// ranking as MatchSuggestion rows, and returns them with mentor details attached.
async function generateMatches(helpRequest) {
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

// Backs a direct request to a mentor the student found via Browse rather than
// from their original ranked suggestions — e.g. the mentor got verified after
// this help request was posted, so generateMatches never scored them. Creates
// the missing MatchSuggestion (using the same scoring as the original batch)
// so the mentor's queue picks up the request; returns null if the mentor isn't
// actually eligible for this subject.
async function createSuggestionIfEligible(tx, helpRequestId, mentorProfileId) {
  const helpRequest = await tx.helpRequest.findUnique({ where: { id: helpRequestId } });
  const mentor = await tx.mentorProfile.findUnique({
    where: { id: mentorProfileId },
    include: { availability: true, sessions: { where: { status: "SCHEDULED" } }, subjects: true },
  });

  if (!helpRequest || !mentor || mentor.verificationStatus !== "VERIFIED") return null;
  if (!mentor.subjects.some((s) => s.subjectId === helpRequest.subjectId)) return null;

  const [scored] = scoreMentors(
    [
      {
        id: mentor.id,
        languages: mentor.languages,
        availability: mentor.availability,
        activeSessionCount: mentor.sessions.length,
      },
    ],
    helpRequest
  );

  const existingCount = await tx.matchSuggestion.count({ where: { helpRequestId } });

  return tx.matchSuggestion.create({
    data: { helpRequestId, mentorProfileId, score: scored.score, rank: existingCount + 1 },
  });
}

// A student requesting a specific mentor from their ranked suggestions doesn't
// finalize a match by itself — it just flags that mentor as the one who needs
// to respond, locking out everyone else until they accept or decline.
async function requestMentor(helpRequestId, mentorProfileId) {
  return prisma.$transaction(async (tx) => {
    let suggestion = await tx.matchSuggestion.findUnique({
      where: { helpRequestId_mentorProfileId: { helpRequestId, mentorProfileId } },
    });
    if (!suggestion) {
      suggestion = await createSuggestionIfEligible(tx, helpRequestId, mentorProfileId);
    }
    if (!suggestion) {
      throw new HttpError(400, "This mentor does not teach this help request's subject");
    }

    const claimed = await tx.helpRequest.updateMany({
      where: { id: helpRequestId, status: "OPEN" },
      data: { status: "REQUESTED", requestedMentorProfileId: mentorProfileId },
    });
    if (claimed.count === 0) {
      throw new HttpError(409, "This help request is no longer open");
    }

    return tx.helpRequest.findUniqueOrThrow({ where: { id: helpRequestId } });
  });
}

// Student backs out of a pending request, freeing it up to request someone else.
async function cancelRequest(helpRequestId) {
  const result = await prisma.helpRequest.updateMany({
    where: { id: helpRequestId, status: "REQUESTED" },
    data: { status: "OPEN", requestedMentorProfileId: null },
  });
  if (result.count === 0) {
    throw new HttpError(409, "This help request is not currently awaiting a mentor's response");
  }
}

// Mentor declines a request that was directed at them specifically, reopening
// it so the student can request someone else (or the same mentor can browse
// and accept it later via the open queue, if still eligible).
async function declineRequest(helpRequestId, mentorProfileId) {
  const result = await prisma.helpRequest.updateMany({
    where: { id: helpRequestId, status: "REQUESTED", requestedMentorProfileId: mentorProfileId },
    data: { status: "OPEN", requestedMentorProfileId: null },
  });
  if (result.count === 0) {
    throw new HttpError(409, "This request is not awaiting your response");
  }
}

// Atomically confirms a match: succeeds if the request is still OPEN (anyone it
// was suggested to may claim it) or REQUESTED specifically to this mentor.
// Creates the resulting Session.
async function confirmMatch(helpRequestId, mentorProfileId) {
  return prisma.$transaction(async (tx) => {
    const suggestion = await tx.matchSuggestion.findUnique({
      where: { helpRequestId_mentorProfileId: { helpRequestId, mentorProfileId } },
    });
    if (!suggestion) {
      throw new HttpError(400, "This mentor was not matched to this help request");
    }

    const claimed = await tx.helpRequest.updateMany({
      where: {
        id: helpRequestId,
        OR: [{ status: "OPEN" }, { status: "REQUESTED", requestedMentorProfileId: mentorProfileId }],
      },
      data: { status: "MATCHED", requestedMentorProfileId: null },
    });
    if (claimed.count === 0) {
      throw new HttpError(409, "This help request is no longer available");
    }

    const helpRequest = await tx.helpRequest.findUniqueOrThrow({ where: { id: helpRequestId } });
    const scheduledAt = nextOccurrence(helpRequest.preferredDayOfWeek, helpRequest.preferredStartTime);

    return tx.session.create({
      data: {
        helpRequestId,
        mentorProfileId,
        status: "SCHEDULED",
        scheduledAt,
      },
    });
  });
}

module.exports = { generateMatches, requestMentor, cancelRequest, declineRequest, confirmMatch };
