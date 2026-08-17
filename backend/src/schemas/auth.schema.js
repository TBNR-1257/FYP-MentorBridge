const { z } = require("zod");

const EDUCATION_LEVELS = ["PRIMARY", "SECONDARY", "UNDERGRADUATE", "POSTGRADUATE", "OTHER"];

const baseFields = {
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1),
};

const availabilitySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "startTime must be in HH:mm format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "endTime must be in HH:mm format"),
});

const studentRegisterSchema = z.object({
  ...baseFields,
  role: z.literal("STUDENT"),
  educationLevel: z.enum(EDUCATION_LEVELS),
  languagePreferences: z.array(z.string()).min(1),
  subjects: z.array(z.string()).min(1),
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
