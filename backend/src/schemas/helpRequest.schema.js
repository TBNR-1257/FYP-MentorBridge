const { z } = require("zod");
const { DIFFICULTY_LEVELS } = require("./common.schema");

const createHelpRequestSchema = z.object({
  subject: z.string().min(1),
  topic: z.string().min(1),
  description: z.string().optional(),
  urgencyLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  difficultyLevel: z.enum(DIFFICULTY_LEVELS),
  languagePreferences: z.array(z.string()).min(1),
  preferredDayOfWeek: z.number().int().min(0).max(6),
  preferredStartTime: z.string().regex(/^\d{2}:\d{2}$/, "preferredStartTime must be in HH:mm format"),
  preferredEndTime: z.string().regex(/^\d{2}:\d{2}$/, "preferredEndTime must be in HH:mm format"),
});

const selectMentorSchema = z.object({
  mentorProfileId: z.string().uuid(),
});

module.exports = { createHelpRequestSchema, selectMentorSchema };
