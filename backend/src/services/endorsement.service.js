const prisma = require("../config/prisma");
const HttpError = require("../utils/HttpError");
const { notify } = require("./notification.service");

// Subjects a student is allowed to endorse this mentor for — proof of an
// actual completed interaction, mirroring how ratings are already gated to
// concluded sessions, so an endorsement carries real weight.
async function getEligibleSubjects(mentorProfileId, studentUserId) {
  const [completedSessions, completedCourseSessions] = await Promise.all([
    prisma.session.findMany({
      where: {
        mentorProfileId,
        status: "COMPLETED",
        helpRequest: { studentProfile: { userId: studentUserId } },
      },
      include: { helpRequest: { include: { subject: true } } },
    }),
    prisma.courseSession.findMany({
      where: {
        status: "COMPLETED",
        course: { mentorProfileId, enrollments: { some: { studentProfile: { userId: studentUserId } } } },
      },
      include: { course: { include: { subject: true } } },
    }),
  ]);

  const subjects = new Map();
  for (const s of completedSessions) subjects.set(s.helpRequest.subject.id, s.helpRequest.subject);
  for (const cs of completedCourseSessions) subjects.set(cs.course.subject.id, cs.course.subject);
  return [...subjects.values()];
}

async function createEndorsement(mentorProfileId, endorserId, subjectId, message) {
  const eligible = await getEligibleSubjects(mentorProfileId, endorserId);
  if (!eligible.some((s) => s.id === subjectId)) {
    throw new HttpError(403, "You can only endorse a mentor for a subject you've completed a session in with them");
  }

  let endorsement;
  try {
    endorsement = await prisma.endorsement.create({
      data: { mentorProfileId, endorserId, subjectId, message: message || null },
      include: { subject: true, endorser: { select: { name: true } } },
    });
  } catch (err) {
    if (err.code === "P2002") {
      throw new HttpError(409, "You've already endorsed this mentor for this subject");
    }
    throw err;
  }

  const mentorProfile = await prisma.mentorProfile.findUnique({ where: { id: mentorProfileId } });
  await notify(
    mentorProfile.userId,
    "ENDORSEMENT_RECEIVED",
    `${endorsement.endorser.name} endorsed you for ${endorsement.subject.name}.`,
    `/mentors/${mentorProfileId}`
  );

  return endorsement;
}

async function listEndorsementsForMentor(mentorProfileId) {
  const endorsements = await prisma.endorsement.findMany({
    where: { mentorProfileId },
    include: { subject: true, endorser: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const bySubject = new Map();
  for (const e of endorsements) {
    if (!bySubject.has(e.subject.name)) bySubject.set(e.subject.name, []);
    bySubject.get(e.subject.name).push({ endorserName: e.endorser.name, message: e.message, createdAt: e.createdAt });
  }

  return [...bySubject.entries()].map(([subject, items]) => ({ subject, count: items.length, items }));
}

module.exports = { getEligibleSubjects, createEndorsement, listEndorsementsForMentor };
