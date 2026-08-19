const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday ... 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

// Consecutive weeks (each containing at least one completed session), counted
// back from the most recent active week. A week with no session anywhere in
// the run breaks the streak — it doesn't just skip forward from the last one.
function computeWeeklyStreak(sessionDates) {
  if (sessionDates.length === 0) return 0;

  const weekStarts = [...new Set(sessionDates.map((d) => startOfWeek(d).getTime()))].sort((a, b) => b - a);

  let streak = 1;
  let cursor = weekStarts[0];
  for (let i = 1; i < weekStarts.length; i++) {
    if (cursor - weekStarts[i] === WEEK_MS) {
      streak++;
      cursor = weekStarts[i];
    } else {
      break;
    }
  }
  return streak;
}

module.exports = { computeWeeklyStreak, startOfWeek };
