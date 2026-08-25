const prisma = require("../config/prisma");

// Case-insensitive so "chemistry" and "Chemistry" resolve to the same row instead
// of silently fragmenting the taxonomy (which would break subject-based matching
// and admin subject-demand analytics).
async function resolveSubject(name) {
  const trimmed = name.trim();
  const existing = await prisma.subject.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return existing;
  return prisma.subject.create({ data: { name: trimmed } });
}

async function resolveSubjects(names) {
  return Promise.all(names.map(resolveSubject));
}

async function listSubjects() {
  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { mentors: { where: { mentorProfile: { verificationStatus: "VERIFIED" } } } },
      },
    },
  });

  return subjects.map(({ _count, ...subject }) => ({ ...subject, mentorCount: _count.mentors }));
}

// Ranked for the student-facing browse page: verified mentors teaching this
// subject, sorted by average rating (mentors with no ratings yet sort last),
// optionally narrowed by a name search.
async function listVerifiedMentorsForSubject(subjectId, search) {
  const mentors = await prisma.mentorProfile.findMany({
    where: {
      verificationStatus: "VERIFIED",
      subjects: { some: { subjectId } },
      ...(search ? { user: { name: { contains: search, mode: "insensitive" } } } : {}),
    },
    include: {
      user: { select: { id: true, name: true, ratingsReceived: { select: { score: true } } } },
      subjects: { include: { subject: true } },
      badges: { include: { badge: true } },
    },
  });

  return mentors
    .map((mentor) => {
      const scores = mentor.user.ratingsReceived.map((r) => r.score).filter((s) => s != null);
      const avgRating = scores.length ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null;
      return {
        id: mentor.id,
        name: mentor.user.name,
        bio: mentor.bio,
        qualifications: mentor.qualifications,
        languages: mentor.languages,
        subjects: mentor.subjects.map((s) => s.subject),
        badges: mentor.badges.map((b) => ({ ...b.badge, earnedAt: b.earnedAt })),
        avgRating,
        ratingCount: scores.length,
      };
    })
    .sort((a, b) => {
      if (a.avgRating === null && b.avgRating === null) return 0;
      if (a.avgRating === null) return 1;
      if (b.avgRating === null) return -1;
      return b.avgRating - a.avgRating;
    });
}

module.exports = { resolveSubject, resolveSubjects, listSubjects, listVerifiedMentorsForSubject };
