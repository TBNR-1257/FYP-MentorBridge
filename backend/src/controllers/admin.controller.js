const prisma = require("../config/prisma");

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

module.exports = { listMentors, verifyMentor, rejectMentor };
