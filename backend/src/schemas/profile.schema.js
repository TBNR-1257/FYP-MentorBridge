const { z } = require("zod");
const { availabilitySlotSchema } = require("./common.schema");

const updateMentorProfileSchema = z
  .object({
    qualifications: z.string().min(1).optional(),
    bio: z.string().optional(),
    languages: z.array(z.string()).min(1).optional(),
    subjects: z.array(z.string()).min(1).optional(),
    availability: z.array(availabilitySlotSchema).min(1).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "At least one field must be provided" });

module.exports = { updateMentorProfileSchema };
