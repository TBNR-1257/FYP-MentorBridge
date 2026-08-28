const { z } = require("zod");

const createEndorsementSchema = z.object({
  subjectId: z.string().uuid(),
  message: z.string().optional(),
});

module.exports = { createEndorsementSchema };
