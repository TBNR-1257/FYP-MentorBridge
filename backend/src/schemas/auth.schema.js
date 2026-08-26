const { z } = require("zod");
const { availabilitySlotSchema } = require("./common.schema");

const baseFields = {
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1),
};

// Students don't specify subject, education level, or language preference at
// signup — those are captured per help request instead. Interests are optional
// and only drive dashboard recommendations, so they're capped but not required.
const studentRegisterSchema = z.object({
  ...baseFields,
  role: z.literal("STUDENT"),
  interests: z.array(z.string()).max(3, "You can pick at most 3 subjects of interest").optional(),
});

const mentorRegisterSchema = z.object({
  ...baseFields,
  role: z.literal("MENTOR"),
  qualifications: z.string().min(1),
  languages: z.array(z.string()).min(1),
  subjects: z.array(z.string()).min(1),
  availability: z.array(availabilitySlotSchema).min(1),
});

const registerSchema = z.discriminatedUnion("role", [studentRegisterSchema, mentorRegisterSchema]);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

module.exports = { registerSchema, loginSchema };
