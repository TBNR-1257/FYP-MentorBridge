const prisma = require("../config/prisma");
const HttpError = require("../utils/HttpError");
const helpRequestService = require("../services/helpRequest.service");
const { resolveSubjects } = require("../services/subject.service");
const { getMentorStanding } = require("../services/gamification.service");
const { getEligibleSubjects, createEndorsement, listEndorsementsForMentor } = require("../services/endorsement.service");
const { getMentorLeaderboard } = require("../services/analytics.service");
const { computeAvgRating } = require("../utils/ratings");
const { updateMentorProfileSchema } = require("../schemas/profile.schema");
const { createEndorsementSchema } = require("../schemas/endorsement.schema");

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
          studentProfile: { include: { user: { select: { id: true, name: true, isActive: true } } } },
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
      session: { include: { helpRequest: { include: { subject: true } } } },
      courseSession: { include: { course: { include: { subject: true } } } },
    },
    orderBy: { loggedAt: "desc" },
  });

  // Normalize the two log shapes (1:1 vs. course-derived) to a single subject
  // name so consumers (the dashboard, the certificate) don't need to know which
  // kind of session backed a given log.
  const normalizedLogs = logs.map((log) => ({
    ...log,
    subjectName: log.session ? log.session.helpRequest.subject.name : log.courseSession.course.subject.name,
  }));

  const totalHours = logs.reduce((sum, log) => sum + Number(log.hours), 0);

  res.json({ logs: normalizedLogs, totalHours: Math.round(totalHours * 100) / 100 });
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

// Public-ish: any authed role can view a mentor's profile (used by browse
// cards, endorsements, and anywhere a mentor's name links out). Existing
// relationships (an established session/course) stay viewable even if the
// mentor is unverified/suspended — same "sign, don't hide" treatment used
// elsewhere — but a viewer with no history gets a 404 for a never-verified one.
async function getPublicProfile(req, res) {
  const mentorProfile = await prisma.mentorProfile.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, name: true, isActive: true, ratingsReceived: { select: { score: true } } } },
      subjects: { include: { subject: true } },
      badges: { include: { badge: true }, orderBy: { earnedAt: "desc" } },
      courses: { where: { status: "ACTIVE" }, include: { subject: true, timeSlots: true, _count: { select: { enrollments: true } } } },
      serviceHourLogs: { select: { hours: true } },
    },
  });
  if (!mentorProfile) {
    throw new HttpError(404, "Mentor not found");
  }

  let eligibleSubjects = [];
  if (req.user.role === "STUDENT") {
    eligibleSubjects = await getEligibleSubjects(mentorProfile.id, req.user.id);
  }

  const { avgRating, ratingCount } = computeAvgRating(mentorProfile.user.ratingsReceived);
  const totalServiceHours = mentorProfile.serviceHourLogs.reduce((sum, log) => sum + Number(log.hours), 0);
  const endorsements = await listEndorsementsForMentor(mentorProfile.id);

  res.json({
    mentor: {
      id: mentorProfile.id,
      name: mentorProfile.user.name,
      isActive: mentorProfile.user.isActive,
      verificationStatus: mentorProfile.verificationStatus,
      bio: mentorProfile.bio,
      qualifications: mentorProfile.qualifications,
      languages: mentorProfile.languages,
      subjects: mentorProfile.subjects.map((s) => s.subject),
      badges: mentorProfile.badges.map((b) => ({ ...b.badge, earnedAt: b.earnedAt })),
      courses: mentorProfile.courses,
      avgRating,
      ratingCount,
      totalServiceHours: Math.round(totalServiceHours * 100) / 100,
      endorsements,
    },
    eligibleSubjects,
  });
}

async function addEndorsement(req, res) {
  const parsed = createEndorsementSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
  }
  const endorsement = await createEndorsement(req.params.id, req.user.id, parsed.data.subjectId, parsed.data.message);
  res.status(201).json({ endorsement });
}

async function leaderboard(req, res) {
  const mentors = await getMentorLeaderboard();
  res.json({ mentors });
}

module.exports = {
  listQueue,
  acceptHelpRequest,
  declineHelpRequest,
  updateProfile,
  listServiceHours,
  listBadges,
  getPublicProfile,
  addEndorsement,
  leaderboard,
};
