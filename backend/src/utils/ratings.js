// Shared by anywhere a mentor's average rating is shown (browse cards, the
// public profile page, the leaderboard) so the null-when-no-ratings handling
// stays consistent.
function computeAvgRating(ratingsReceived) {
  const scores = ratingsReceived.map((r) => r.score).filter((s) => s != null);
  const avgRating = scores.length ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null;
  return { avgRating, ratingCount: scores.length };
}

module.exports = { computeAvgRating };
