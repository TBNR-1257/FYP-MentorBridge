const { z } = require("zod");
const { EDUCATION_LEVELS } = require("./common.schema");

const createHelpRequestSchema = z.object({
  subject: z.string().min(1),
  topic: z.string().min(1),
  urgencyLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  sessionFormat: z.enum(["TEXT_CHAT", "VIDEO_CALL", "IN_PERSON"]),
  educationLevel: z.enum(EDUCATION_LEVELS),
  languagePreferences: z.array(z.string()).min(1),
  preferredDayOfWeek: z.number().int().min(0).max(6),
  preferredStartTime: z.string().regex(/^\d{2}:\d{2}$/, "preferredStartTime must be in HH:mm format"),
  preferredEndTime: z.string().regex(/^\d{2}:\d{2}$/, "preferredEndTime must be in HH:mm format"),
});

const selectMentorSchema = z.object({
  mentorProfileId: z.string().uuid(),
});

module.exports = { createHelpRequestSchema, selectMentorSchema };
