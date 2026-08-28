const { z } = require("zod");

const createResourceSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  url: z.string().url(),
});

module.exports = { createResourceSchema };
