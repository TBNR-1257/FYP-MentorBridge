const prisma = require("../config/prisma");
const HttpError = require("../utils/HttpError");

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
      user: { isActive: true, ...(search ? { name: { contains: search, mode: "insensitive" } } : {}) },
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

// Lookup-only counterpart to resolveSubject, used anywhere a student is
// choosing a subject — students can't silently create new taxonomy entries
// the way a mentor can (a mentor's additions are still gated by admin
// verification of their profile; a student has no equivalent review step).
async function findSubjectByName(name) {
  const trimmed = name.trim();
  const subject = await prisma.subject.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
  if (!subject) {
    throw new HttpError(400, `Subject "${trimmed}" doesn't exist yet — request it to be added first`);
  }
  return subject;
}

async function createSubjectRequest(name, userId) {
  return prisma.subjectRequest.create({
    data: { name: name.trim(), requestedById: userId },
  });
}

async function listSubjectRequests(status) {
  return prisma.subjectRequest.findMany({
    where: status ? { status } : {},
    include: { requestedBy: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

async function approveSubjectRequest(id, adminId) {
  const request = await prisma.subjectRequest.findUnique({ where: { id } });
  if (!request) {
    throw new HttpError(404, "Subject request not found");
  }

  const subject = await resolveSubject(request.name);
  const updated = await prisma.subjectRequest.update({
    where: { id },
    data: { status: "APPROVED", reviewedAt: new Date(), reviewedByAdminId: adminId },
  });

  return { request: updated, subject };
}

async function rejectSubjectRequest(id, adminId) {
  const request = await prisma.subjectRequest.findUnique({ where: { id } });
  if (!request) {
    throw new HttpError(404, "Subject request not found");
  }

  return prisma.subjectRequest.update({
    where: { id },
    data: { status: "REJECTED", reviewedAt: new Date(), reviewedByAdminId: adminId },
  });
}

async function listActiveCoursesForSubject(subjectId, search) {
  return prisma.course.findMany({
    where: {
      subjectId,
      status: "ACTIVE",
      mentorProfile: { user: { isActive: true } },
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    },
    include: {
      mentorProfile: { include: { user: { select: { id: true, name: true } } } },
      timeSlots: true,
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

module.exports = {
  resolveSubject,
  resolveSubjects,
  findSubjectByName,
  listSubjects,
  listVerifiedMentorsForSubject,
  createSubjectRequest,
  listSubjectRequests,
  approveSubjectRequest,
  rejectSubjectRequest,
  listActiveCoursesForSubject,
};
