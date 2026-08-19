const { z } = require("zod");

const createRatingSchema = z
  .object({
    score: z.number().int().min(1).max(5).optional(),
    comment: z.string().optional(),
    isNoShow: z.boolean().optional(),
    isMisconduct: z.boolean().optional(),
  })
  .refine((d) => d.score !== undefined || d.isNoShow || d.isMisconduct, {
    message: "Provide a score or a no-show/misconduct flag",
  });

module.exports = { createRatingSchema };
