const prisma = require("../config/prisma");
const HttpError = require("../utils/HttpError");
const subjectService = require("../services/subject.service");
const analyticsService = require("../services/analytics.service");
const { notify } = require("../services/notification.service");

const MENTOR_LIST_INCLUDE = {
  user: { select: { id: true, name: true, email: true, createdAt: true } },
  subjects: { include: { subject: true } },
  availability: true,
};

async function listMentors(req, res) {
  const status = req.query.status;
  const where = status ? { verificationStatus: status } : {};

  const mentors = await prisma.mentorProfile.findMany({
    where,
    include: MENTOR_LIST_INCLUDE,
    orderBy: { createdAt: "asc" },
  });

  res.json({ mentors });
}

async function verifyMentor(req, res) {
  const mentor = await prisma.mentorProfile.findUnique({ where: { id: req.params.id } });
  if (!mentor) {
    return res.status(404).json({ error: "Mentor profile not found" });
  }

  const updated = await prisma.mentorProfile.update({
    where: { id: req.params.id },
    data: {
      verificationStatus: "VERIFIED",
      verifiedAt: new Date(),
      verifiedByAdminId: req.user.id,
    },
    include: MENTOR_LIST_INCLUDE,
  });

  await notify(updated.user.id, "MENTOR_VERIFIED", "Your mentor profile has been verified.", "/mentor/dashboard");

  res.json({ mentor: updated });
}

async function rejectMentor(req, res) {
  const mentor = await prisma.mentorProfile.findUnique({ where: { id: req.params.id } });
  if (!mentor) {
    return res.status(404).json({ error: "Mentor profile not found" });
  }

  const updated = await prisma.mentorProfile.update({
    where: { id: req.params.id },
    data: {
      verificationStatus: "REJECTED",
      verifiedAt: new Date(),
      verifiedByAdminId: req.user.id,
    },
    include: MENTOR_LIST_INCLUDE,
  });

  await notify(updated.user.id, "MENTOR_REJECTED", "Your mentor profile application was not approved.", "/mentor/profile");

  res.json({ mentor: updated });
}

async function listSubjectRequests(req, res) {
  const requests = await subjectService.listSubjectRequests(req.query.status);
  res.json({ requests });
}

async function approveSubjectRequest(req, res) {
  const { request, subject } = await subjectService.approveSubjectRequest(req.params.id, req.user.id);
  await notify(request.requestedById, "SUBJECT_REQUEST_APPROVED", `Your subject request "${subject.name}" was approved.`);
  res.json({ request, subject });
}

async function rejectSubjectRequest(req, res) {
  const request = await subjectService.rejectSubjectRequest(req.params.id, req.user.id);
  await notify(request.requestedById, "SUBJECT_REQUEST_REJECTED", `Your subject request "${request.name}" was not approved.`);
  res.json({ request });
}

async function listUsers(req, res) {
  const { role, search } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));

  const where = {
    ...(role ? { role } : {}),
    ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, isActive: true, suspendedAt: true, suspendedReason: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ users, total, page, pageSize });
}

async function suspendUser(req, res) {
  const reason = (req.body?.reason || "").trim();
  if (!reason) {
    return res.status(400).json({ error: "A reason is required" });
  }

  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) {
    throw new HttpError(404, "User not found");
  }
  if (target.role === "ADMIN") {
    throw new HttpError(403, "Admin accounts can't be suspended");
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: false, suspendedAt: new Date(), suspendedReason: reason },
  });
  res.json({ user });
}

async function reactivateUser(req, res) {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: true, suspendedAt: null, suspendedReason: null },
  });
  res.json({ user });
}

async function getAnalytics(req, res) {
  const analytics = await analyticsService.getPlatformAnalytics();
  res.json({ analytics });
}

async function listSessions(req, res) {
  const sessions = await analyticsService.listAllSessions();
  res.json({ sessions });
}

async function listCourses(req, res) {
  const courses = await analyticsService.listAllCourses();
  res.json({ courses });
}

async function listFlaggedRatings(req, res) {
  const ratings = await analyticsService.listFlaggedRatings();
  res.json({ ratings });
}

module.exports = {
  listMentors,
  verifyMentor,
  rejectMentor,
  listSubjectRequests,
  approveSubjectRequest,
  rejectSubjectRequest,
  listUsers,
  suspendUser,
  reactivateUser,
  getAnalytics,
  listSessions,
  listCourses,
  listFlaggedRatings,
};
