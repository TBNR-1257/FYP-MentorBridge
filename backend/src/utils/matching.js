// Rule-based mentor matching: subject is a hard filter (only verified mentors who
// teach the requested subject are considered at all); language and availability
// overlap add points on top of a base score for qualifying; a light workload
// penalty spreads load across mentors instead of always picking the same one.

const LANGUAGE_MATCH_POINTS = 40;
const AVAILABILITY_MATCH_POINTS = 40;
const BASE_QUALIFYING_POINTS = 20;
const WORKLOAD_PENALTY_PER_SESSION = 2;

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function timeRangesOverlap(aStart, aEnd, bStart, bEnd) {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd);
}

function hasLanguageOverlap(studentLanguages, mentorLanguages) {
  return studentLanguages.some((lang) => mentorLanguages.includes(lang));
}

function hasAvailabilityOverlap(mentorAvailability, request) {
  return mentorAvailability.some(
    (slot) =>
      slot.dayOfWeek === request.preferredDayOfWeek &&
      timeRangesOverlap(slot.startTime, slot.endTime, request.preferredStartTime, request.preferredEndTime)
  );
}

// mentors: MentorProfile[] already filtered to those teaching the request's subject,
// each with `languages`, `availability`, and `activeSessionCount` loaded.
function scoreMentors(mentors, student, request) {
  return mentors
    .map((mentor) => {
      let score = BASE_QUALIFYING_POINTS;
      if (hasLanguageOverlap(student.languagePreferences, mentor.languages)) {
        score += LANGUAGE_MATCH_POINTS;
      }
      if (hasAvailabilityOverlap(mentor.availability, request)) {
        score += AVAILABILITY_MATCH_POINTS;
      }
      score -= mentor.activeSessionCount * WORKLOAD_PENALTY_PER_SESSION;

      return { mentorProfileId: mentor.id, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

// Finds the next calendar date/time matching a given day-of-week + "HH:mm",
// starting from `from` (defaults to now). Used to turn a recurring weekly
// preference into a concrete scheduled datetime once a match is confirmed.
function nextOccurrence(dayOfWeek, hhmm, from = new Date()) {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const result = new Date(from);
  result.setHours(hours, minutes, 0, 0);

  let daysUntil = (dayOfWeek - result.getDay() + 7) % 7;
  if (daysUntil === 0 && result <= from) {
    daysUntil = 7;
  }
  result.setDate(result.getDate() + daysUntil);

  return result;
}

module.exports = { scoreMentors, nextOccurrence, timeRangesOverlap };
