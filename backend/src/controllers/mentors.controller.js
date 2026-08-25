const prisma = require("../config/prisma");
const HttpError = require("../utils/HttpError");
const helpRequestService = require("../services/helpRequest.service");
const { resolveSubjects } = require("../services/subject.service");
const { getMentorStanding } = require("../services/gamification.service");
const { updateMentorProfileSchema } = require("../schemas/profile.schema");

async function getOwnMentorProfile(userId) {
  const profile = await prisma.mentorProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new HttpError(404, "Mentor profile not found");
  }
  return profile;
}

async function getOwnVerifiedMentorProfile(userId) {
  const profile = await getOwnMentorProfile(userId);
  if (profile.verificationStatus !== "VERIFIED") {
    throw new HttpError(403, "Your mentor profile must be verified before you can browse or accept help requests");
  }
  return profile;
}

async function listQueue(req, res) {
  const mentorProfile = await getOwnVerifiedMentorProfile(req.user.id);

  // Shows both: open requests this mentor was matched to (anyone matched can
  // browse and accept), and requests a student directed at this mentor
  // specifically (only they can act on those until they respond).
  const suggestions = await prisma.matchSuggestion.findMany({
    where: {
      mentorProfileId: mentorProfile.id,
      helpRequest: {
        OR: [{ status: "OPEN" }, { status: "REQUESTED", requestedMentorProfileId: mentorProfile.id }],
      },
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

async function declineHelpRequest(req, res) {
  const mentorProfile = await getOwnVerifiedMentorProfile(req.user.id);
  await helpRequestService.declineRequest(req.params.id, mentorProfile.id);
  res.status(200).json({ ok: true });
}

async function updateProfile(req, res) {
  const parsed = updateMentorProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
  }
  const data = parsed.data;

  const mentorProfile = await getOwnMentorProfile(req.user.id);

  const updateData = {};
  if (data.qualifications !== undefined) updateData.qualifications = data.qualifications;
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.languages !== undefined) updateData.languages = data.languages;

  // Compares actual values (not "was this key present in the request body") so
  // resubmitting an edit form with everything unchanged doesn't look like a change.
  let qualificationsChanged = false;
  let subjectsChanged = false;

  if (data.qualifications !== undefined) {
    qualificationsChanged = data.qualifications.trim() !== mentorProfile.qualifications;
  }

  if (data.subjects !== undefined) {
    const subjects = await resolveSubjects(data.subjects);
    updateData.subjects = { deleteMany: {}, create: subjects.map((s) => ({ subjectId: s.id })) };

    const currentLinks = await prisma.mentorSubject.findMany({ where: { mentorProfileId: mentorProfile.id } });
    const currentIds = new Set(currentLinks.map((l) => l.subjectId));
    const newIds = new Set(subjects.map((s) => s.id));
    subjectsChanged = currentIds.size !== newIds.size || [...newIds].some((id) => !currentIds.has(id));
  }

  if (data.availability !== undefined) {
    updateData.availability = { deleteMany: {}, create: data.availability };
  }

  // Changing the claims an admin actually verified (qualifications/subjects) puts
  // the profile back under review instead of silently keeping stale approval.
  if ((qualificationsChanged || subjectsChanged) && mentorProfile.verificationStatus === "VERIFIED") {
    updateData.verificationStatus = "PENDING";
    updateData.verifiedAt = null;
    updateData.verifiedByAdminId = null;
  }

  const updated = await prisma.mentorProfile.update({
    where: { id: mentorProfile.id },
    data: updateData,
    include: { subjects: { include: { subject: true } }, availability: true },
  });

  res.json({ mentorProfile: updated });
}

async function listServiceHours(req, res) {
  const mentorProfile = await getOwnMentorProfile(req.user.id);

  const logs = await prisma.serviceHourLog.findMany({
    where: { mentorProfileId: mentorProfile.id },
    include: {
      session: {
        include: { helpRequest: { include: { subject: true } } },
      },
    },
    orderBy: { loggedAt: "desc" },
  });

  const totalHours = logs.reduce((sum, log) => sum + Number(log.hours), 0);

  res.json({ logs, totalHours: Math.round(totalHours * 100) / 100 });
}

async function listBadges(req, res) {
  const mentorProfile = await getOwnMentorProfile(req.user.id);

  const [catalog, earned, standing] = await Promise.all([
    prisma.badge.findMany({ orderBy: [{ metric: "asc" }, { threshold: "asc" }] }),
    prisma.mentorBadge.findMany({ where: { mentorProfileId: mentorProfile.id } }),
    getMentorStanding(mentorProfile.id, req.user.id),
  ]);

  const earnedByBadgeId = new Map(earned.map((e) => [e.badgeId, e.earnedAt]));
  const badges = catalog.map((badge) => {
    const currentValue = standing[badge.metric];
    return {
      ...badge,
      earned: earnedByBadgeId.has(badge.id),
      earnedAt: earnedByBadgeId.get(badge.id) || null,
      currentValue,
      progress: Math.min(1, currentValue / badge.threshold),
    };
  });

  res.json({ badges });
}

module.exports = {
  listQueue,
  acceptHelpRequest,
  declineHelpRequest,
  updateProfile,
  listServiceHours,
  listBadges,
};
