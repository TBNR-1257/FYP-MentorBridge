const prisma = require("../config/prisma");

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
  return prisma.session.count({
    where: { mentorProfileId, status: "COMPLETED" },
  });
}

// Compares the mentor's current standing against every badge in the catalog
// and awards any newly-qualified ones. Safe to call after any event that could
// move the needle (a new rating, a completed session) — already-earned badges
// are skipped via the MentorBadge composite key.
async function checkAndAwardBadges(mentorProfileId, mentorUserId) {
  const [badges, goodRatings, serviceHours, completedSessions, alreadyEarned] = await Promise.all([
    prisma.badge.findMany(),
    countGoodRatings(mentorUserId),
    sumServiceHours(mentorProfileId),
    countCompletedSessions(mentorProfileId),
    prisma.mentorBadge.findMany({ where: { mentorProfileId }, select: { badgeId: true } }),
  ]);

  const earnedIds = new Set(alreadyEarned.map((m) => m.badgeId));
  const standing = {
    RATING_COUNT: goodRatings,
    SERVICE_HOURS: serviceHours,
    SESSION_COUNT: completedSessions,
  };

  const newlyEarned = badges.filter((badge) => !earnedIds.has(badge.id) && standing[badge.metric] >= badge.threshold);
  if (newlyEarned.length === 0) return [];

  await prisma.mentorBadge.createMany({
    data: newlyEarned.map((badge) => ({ mentorProfileId, badgeId: badge.id })),
    skipDuplicates: true,
  });

  return newlyEarned;
}

module.exports = { checkAndAwardBadges };
