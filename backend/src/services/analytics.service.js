// Student Name: Bryan Wong Tze Hern
// Student ID: TP086538

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

  const [subjectGaps, growthTrend] = await Promise.all([getSubjectGaps(), getGrowthTrend()]);

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
    subjectGaps,
    growthTrend,
  };
}

// Subjects where student demand (help requests posted) outstrips the number
// of verified mentors teaching it — the actionable "who to recruit for next"
// signal, as opposed to topSubjects which just ranks raw demand.
async function getSubjectGaps() {
  const subjects = await prisma.subject.findMany({
    include: {
      helpRequests: { select: { id: true } },
      mentors: { select: { mentorProfile: { select: { verificationStatus: true } } } },
    },
  });

  return subjects
    .map((s) => {
      const demand = s.helpRequests.length;
      const mentorCount = s.mentors.filter((ms) => ms.mentorProfile.verificationStatus === "VERIFIED").length;
      return { subject: s.name, demand, mentorCount, gap: demand - mentorCount };
    })
    .filter((s) => s.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 8);
}

const GROWTH_WEEKS = 8;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// New student/mentor signups bucketed by week, oldest to newest, for a
// platform-growth trend line. Kept as separate counts (not a combined total)
// so the chart can plot student vs. mentor signups as distinct series.
async function getGrowthTrend() {
  const start = new Date(Date.now() - GROWTH_WEEKS * WEEK_MS);

  const users = await prisma.user.findMany({
    where: { createdAt: { gte: start }, role: { in: ["STUDENT", "MENTOR"] } },
    select: { createdAt: true, role: true },
  });

  const buckets = Array.from({ length: GROWTH_WEEKS }, (_, i) => {
    const weekStart = new Date(start.getTime() + i * WEEK_MS);
    return {
      label: weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      students: 0,
      mentors: 0,
    };
  });

  for (const user of users) {
    const idx = Math.min(GROWTH_WEEKS - 1, Math.floor((user.createdAt.getTime() - start.getTime()) / WEEK_MS));
    if (idx < 0) continue;
    if (user.role === "STUDENT") buckets[idx].students++;
    else buckets[idx].mentors++;
  }

  return buckets;
}

// Only 1:1 sessions carry these flags — a mentor rating a student is the only
// direction that can set isNoShow/isMisconduct (course ratings are student ->
// mentor only, score/comment).
async function listFlaggedRatings() {
  return prisma.rating.findMany({
    where: { OR: [{ isNoShow: true }, { isMisconduct: true }] },
    include: {
      rater: { select: { id: true, name: true } },
      ratee: { select: { id: true, name: true, isActive: true } },
      session: { include: { helpRequest: { include: { subject: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
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

module.exports = { getPlatformAnalytics, listFlaggedRatings, listAllSessions, listAllCourses, getMentorLeaderboard };
