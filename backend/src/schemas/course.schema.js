const { z } = require("zod");
const { DIFFICULTY_LEVELS, availabilitySlotSchema } = require("./common.schema");

const createCourseSchema = z.object({
  subject: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  difficultyLevel: z.enum(DIFFICULTY_LEVELS),
  timeSlots: z.array(availabilitySlotSchema).min(1),
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
};
