const { z } = require("zod");
const { availabilitySlotSchema } = require("./common.schema");

const baseFields = {
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1),
};

// Students don't specify subject, education level, or language preference at
// signup — those are captured per help request instead.
const studentRegisterSchema = z.object({
  ...baseFields,
  role: z.literal("STUDENT"),
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
