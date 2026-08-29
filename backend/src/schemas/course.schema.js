const { z } = require("zod");
const { DIFFICULTY_LEVELS, availabilitySlotSchema } = require("./common.schema");

const createCourseSchema = z.object({
  subject: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  difficultyLevel: z.enum(DIFFICULTY_LEVELS),
  mode: z.enum(["STRUCTURED", "OPEN"]).default("OPEN"),
  timeSlots: z.array(availabilitySlotSchema).min(1),
});

const courseRatingSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

const setCourseMeetingLinkSchema = z.object({
  meetingLink: z.string().url().nullable(),
});

const setCourseSessionNotesSchema = z.object({
  mentorNotes: z.string().min(1),
});

const completeCourseSessionSchema = z.object({
  outcome: z.enum(["COMPLETED", "NO_SHOW"]),
});

module.exports = {
  createCourseSchema,
  setCourseMeetingLinkSchema,
  setCourseSessionNotesSchema,
  completeCourseSessionSchema,
  courseRatingSchema,
};
