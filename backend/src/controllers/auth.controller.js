const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { signToken } = require("../utils/jwt");
const { registerSchema, loginSchema } = require("../schemas/auth.schema");

const SALT_ROUNDS = 10;

const WITH_PROFILE = { include: { studentProfile: true, mentorProfile: true } };

function toPublicUser(user) {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

async function findOrCreateSubjects(names) {
  return Promise.all(
    names.map((name) =>
      prisma.subject.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );
}

async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const subjects = await findOrCreateSubjects(data.subjects);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role: data.role,
      },
    });

    if (data.role === "STUDENT") {
      await tx.studentProfile.create({
        data: {
          userId: createdUser.id,
          educationLevel: data.educationLevel,
          languagePreferences: data.languagePreferences,
          subjects: { create: subjects.map((s) => ({ subjectId: s.id })) },
        },
      });
    } else {
      await tx.mentorProfile.create({
        data: {
          userId: createdUser.id,
          qualifications: data.qualifications,
          languages: data.languages,
          subjects: { create: subjects.map((s) => ({ subjectId: s.id })) },
          availability: { create: data.availability },
        },
      });
    }

    return createdUser;
  });

  const userWithProfile = await prisma.user.findUnique({ where: { id: user.id }, ...WITH_PROFILE });
  const token = signToken(user);
  res.status(201).json({ user: toPublicUser(userWithProfile), token });
}

async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid email or password" });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email }, ...WITH_PROFILE });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  if (!user.isActive) {
    return res.status(403).json({ error: "This account has been suspended" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken(user);
  res.json({ user: toPublicUser(user), token });
}

async function me(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, ...WITH_PROFILE });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({ user: toPublicUser(user) });
}

module.exports = { register, login, me };
