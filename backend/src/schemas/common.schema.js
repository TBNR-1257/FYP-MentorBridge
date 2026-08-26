const { z } = require("zod");

const DIFFICULTY_LEVELS = ["BEGINNER", "INTERMEDIATE", "EXPERT"];

const availabilitySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "startTime must be in HH:mm format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "endTime must be in HH:mm format"),
});

module.exports = { DIFFICULTY_LEVELS, availabilitySlotSchema };
