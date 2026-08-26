const prisma = require("../config/prisma");
const HttpError = require("../utils/HttpError");
const subjectService = require("../services/subject.service");
const analyticsService = require("../services/analytics.service");

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

  res.json({ mentor: updated });
}

async function listSubjectRequests(req, res) {
  const requests = await subjectService.listSubjectRequests(req.query.status);
  res.json({ requests });
}

async function approveSubjectRequest(req, res) {
  const { request, subject } = await subjectService.approveSubjectRequest(req.params.id, req.user.id);
  res.json({ request, subject });
}

async function rejectSubjectRequest(req, res) {
  const request = await subjectService.rejectSubjectRequest(req.params.id, req.user.id);
  res.json({ request });
}

async function listUsers(req, res) {
  const { role, search } = req.query;
  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}),
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, suspendedAt: true, suspendedReason: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ users });
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
};
