const prisma = require("../config/prisma");
const { computeAvgRating } = require("../utils/ratings");

function toCountMap(groupByResult, key = "status") {
  return Object.fromEntries(groupByResult.map((row) => [row[key], row._count._all]));
}

async function getPlatformAnalytics() {
  const [
    studentCount,
    mentorsByVerification,
    adminCount,
    activeCount,
    suspendedCount,
    helpRequestsByStatus,
    sessionsByStatus,
    courseSessionsByStatus,
    coursesByStatus,
    enrollmentCount,
    serviceHourLogs,
    topSubjectsRaw,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.mentorProfile.groupBy({ by: ["verificationStatus"], _count: { _all: true } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.helpRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.session.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.courseSession.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.course.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.courseEnrollment.count(),
    prisma.serviceHourLog.findMany({ select: { hours: true } }),
    prisma.helpRequest.groupBy({ by: ["subjectId"], _count: { subjectId: true }, orderBy: { _count: { subjectId: "desc" } }, take: 5 }),
  ]);

  const subjects = await prisma.subject.findMany({
    where: { id: { in: topSubjectsRaw.map((r) => r.subjectId) } },
    select: { id: true, name: true },
  });
  const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));
  const topSubjects = topSubjectsRaw.map((r) => ({
    subject: subjectNameById.get(r.subjectId) || "Unknown",
    count: r._count.subjectId,
  }));

  const sessionStatusCounts = toCountMap(sessionsByStatus);
  const courseSessionStatusCounts = toCountMap(courseSessionsByStatus);
  const combinedSessionsByStatus = {};
  for (const status of new Set([...Object.keys(sessionStatusCounts), ...Object.keys(courseSessionStatusCounts)])) {
    combinedSessionsByStatus[status] = (sessionStatusCounts[status] || 0) + (courseSessionStatusCounts[status] || 0);
  }

  const totalServiceHours = serviceHourLogs.reduce((sum, log) => sum + Number(log.hours), 0);

  return {
    users: {
      students: studentCount,
      mentorsByVerification: toCountMap(mentorsByVerification, "verificationStatus"),
      admins: adminCount,
      active: activeCount,
      suspended: suspendedCount,
    },
    helpRequestsByStatus: toCountMap(helpRequestsByStatus),
    sessionsByStatus: combinedSessionsByStatus,
    coursesByStatus: toCountMap(coursesByStatus, "status"),
    totalEnrollments: enrollmentCount,
    totalServiceHours: Math.round(totalServiceHours * 100) / 100,
    topSubjects,
  };
}

async function listAllSessions() {
  return prisma.session.findMany({
    include: {
      helpRequest: { include: { subject: true, studentProfile: { include: { user: { select: { name: true } } } } } },
      mentorProfile: { include: { user: { select: { name: true } } } },
    },
    orderBy: { scheduledAt: "desc" },
  });
}

async function listAllCourses() {
  return prisma.course.findMany({
    include: {
      subject: true,
      mentorProfile: { include: { user: { select: { name: true } } } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getMentorLeaderboard() {
  const mentors = await prisma.mentorProfile.findMany({
    where: { verificationStatus: "VERIFIED", user: { isActive: true } },
    include: {
      user: { select: { id: true, name: true, ratingsReceived: { select: { score: true } } } },
      serviceHourLogs: { select: { hours: true } },
      badges: true,
    },
  });

  return mentors
    .map((m) => {
      const { avgRating, ratingCount } = computeAvgRating(m.user.ratingsReceived);
      const totalHours = m.serviceHourLogs.reduce((sum, log) => sum + Number(log.hours), 0);
      return {
        mentorProfileId: m.id,
        name: m.user.name,
        totalHours: Math.round(totalHours * 100) / 100,
        avgRating,
        ratingCount,
        badgeCount: m.badges.length,
      };
    })
    .sort((a, b) => b.totalHours - a.totalHours || (b.avgRating || 0) - (a.avgRating || 0))
    .slice(0, 10);
}

module.exports = { getPlatformAnalytics, listAllSessions, listAllCourses, getMentorLeaderboard };
