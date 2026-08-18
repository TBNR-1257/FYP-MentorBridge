const prisma = require("../config/prisma");
const HttpError = require("../utils/HttpError");
const helpRequestService = require("../services/helpRequest.service");

async function getOwnVerifiedMentorProfile(userId) {
  const profile = await prisma.mentorProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new HttpError(404, "Mentor profile not found");
  }
  if (profile.verificationStatus !== "VERIFIED") {
    throw new HttpError(403, "Your mentor profile must be verified before you can browse or accept help requests");
  }
  return profile;
}

async function listQueue(req, res) {
  const mentorProfile = await getOwnVerifiedMentorProfile(req.user.id);

  const suggestions = await prisma.matchSuggestion.findMany({
    where: {
      mentorProfileId: mentorProfile.id,
      helpRequest: { status: "OPEN" },
    },
    include: {
      helpRequest: {
        include: {
          subject: true,
          studentProfile: { include: { user: { select: { id: true, name: true } } } },
        },
      },
    },
    orderBy: { score: "desc" },
  });

  res.json({ queue: suggestions });
}

async function acceptHelpRequest(req, res) {
  const mentorProfile = await getOwnVerifiedMentorProfile(req.user.id);
  const session = await helpRequestService.confirmMatch(req.params.id, mentorProfile.id);
  res.status(201).json({ session });
}

module.exports = { listQueue, acceptHelpRequest };
