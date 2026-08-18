const { z } = require("zod");

const setNotesSchema = z.object({
  mentorNotes: z.string().min(1),
});

const setConfidenceSchema = z
  .object({
    confidenceBefore: z.number().int().min(1).max(5).optional(),
    confidenceAfter: z.number().int().min(1).max(5).optional(),
  })
  .refine((d) => d.confidenceBefore !== undefined || d.confidenceAfter !== undefined, {
    message: "At least one of confidenceBefore or confidenceAfter is required",
  });

const completeSessionSchema = z.object({
  outcome: z.enum(["COMPLETED", "NO_SHOW"]),
});

module.exports = { setNotesSchema, setConfidenceSchema, completeSessionSchema };
