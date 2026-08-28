const prisma = require("../config/prisma");
const { notify } = require("./notification.service");

const GOOD_RATING_THRESHOLD = 4; // out of 5

async function countGoodRatings(mentorUserId) {
  return prisma.rating.count({
    where: { rateeId: mentorUserId, score: { gte: GOOD_RATING_THRESHOLD } },
  });
}

async function sumServiceHours(mentorProfileId) {
  const logs = await prisma.serviceHourLog.findMany({
    where: { mentorProfileId },
    select: { hours: true },
  });
  return logs.reduce((sum, log) => sum + Number(log.hours), 0);
}

async function countCompletedSessions(mentorProfileId) {
  const [oneOnOne, course] = await Promise.all([
    prisma.session.count({ where: { mentorProfileId, status: "COMPLETED" } }),
    prisma.courseSession.count({ where: { course: { mentorProfileId }, status: "COMPLETED" } }),
  ]);
  return oneOnOne + course;
}

// A mentor's current value for each badge metric — shared by badge-awarding
// and by the badges endpoint (to show progress toward a locked badge).
async function getMentorStanding(mentorProfileId, mentorUserId) {
  const [goodRatings, serviceHours, completedSessions] = await Promise.all([
    countGoodRatings(mentorUserId),
    sumServiceHours(mentorProfileId),
    countCompletedSessions(mentorProfileId),
  ]);

  return {
    RATING_COUNT: goodRatings,
    SERVICE_HOURS: serviceHours,
    SESSION_COUNT: completedSessions,
  };
}

// Compares the mentor's current standing against every badge in the catalog
// and awards any newly-qualified ones. Safe to call after any event that could
// move the needle (a new rating, a completed session) — already-earned badges
// are skipped via the MentorBadge composite key.
async function checkAndAwardBadges(mentorProfileId, mentorUserId) {
  const [badges, standing, alreadyEarned] = await Promise.all([
    prisma.badge.findMany(),
    getMentorStanding(mentorProfileId, mentorUserId),
    prisma.mentorBadge.findMany({ where: { mentorProfileId }, select: { badgeId: true } }),
  ]);

  const earnedIds = new Set(alreadyEarned.map((m) => m.badgeId));

  const newlyEarned = badges.filter((badge) => !earnedIds.has(badge.id) && standing[badge.metric] >= badge.threshold);
  if (newlyEarned.length === 0) return [];

  await prisma.mentorBadge.createMany({
    data: newlyEarned.map((badge) => ({ mentorProfileId, badgeId: badge.id })),
    skipDuplicates: true,
  });

  await Promise.all(
    newlyEarned.map((badge) =>
      notify(mentorUserId, "BADGE_EARNED", `You earned the "${badge.name}" badge!`, "/mentor/dashboard")
    )
  );

  return newlyEarned;
}

module.exports = { checkAndAwardBadges, getMentorStanding };
